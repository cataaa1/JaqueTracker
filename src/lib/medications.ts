/**
 * Cálculos y formato sobre medicamentos y tomas. Funciones puras: no tocan la
 * base ni React.
 */

import { differenceInHours, endOfMonth, startOfMonth } from 'date-fns';
import type { Intake, Medication, PreventiveLog } from '../types';
import { UNIT_LABELS } from './labels';
import { localDayKey } from './dates';

/**
 * Umbral del RF-22. El PRD habla de "superar 10 días", así que el aviso empieza
 * en 11, que es el número del ejemplo del propio requisito.
 */
export const RESCUE_DAYS_WARNING_THRESHOLD = 10;

/** Horas que tienen que pasar antes de preguntar si alivió (RF-18). */
const RELIEF_QUESTION_AFTER_HOURS = 2;

/** Después de dos días ya no se pregunta: nadie se acuerda con precisión y un
 *  dato inventado es peor que un dato faltante. */
const RELIEF_QUESTION_UNTIL_HOURS = 48;

/** `Ibuprofeno 400 mg` */
export function formatMedication(medication: Medication): string {
  return `${medication.name} ${medication.dose} ${UNIT_LABELS[medication.unit]}`;
}

/** `50 mg · 1 vez por día` — el subtítulo de la maqueta. */
export function formatMedicationDetail(medication: Medication): string {
  const dose = `${medication.dose} ${UNIT_LABELS[medication.unit]}`;
  const schedule = medication.schedule;

  if (schedule === null) return dose;

  const frequency =
    schedule.timesPerDay === 1 ? '1 vez por día' : `${schedule.timesPerDay} veces por día`;

  return `${dose} · ${frequency}`;
}

/** Busca un medicamento por id dentro de una lista ya cargada. */
export function findMedication(
  medications: Medication[],
  id: string,
): Medication | undefined {
  return medications.find((medication) => medication.id === id);
}

/** Las tomas de un día del calendario local. */
export function intakesOnDay(intakes: Intake[], day: Date): Intake[] {
  const key = localDayKey(day);
  return intakes.filter((intake) => localDayKey(new Date(intake.takenAt)) === key);
}

/**
 * Días del mes en los que se tomó al menos un analgésico (RF-21).
 *
 * Días, no dosis: tres comprimidos el mismo día son un día. Es el número que
 * determina el riesgo de cefalea por abuso de medicación, y por eso el reporte
 * lo destaca.
 *
 * Los preventivos no cuentan acá: se toman todos los días por definición y
 * mezclarlos haría que el contador diera siempre 30.
 */
export function countRescueDaysInMonth(
  intakes: Intake[],
  medications: Medication[],
  reference: Date = new Date(),
): number {
  const firstDay = localDayKey(startOfMonth(reference));
  const lastDay = localDayKey(endOfMonth(reference));

  const rescueIds = new Set(
    medications.filter((m) => m.kind === 'rescue').map((m) => m.id),
  );

  const days = new Set<string>();
  for (const intake of intakes) {
    if (!rescueIds.has(intake.medicationId)) continue;
    const day = localDayKey(new Date(intake.takenAt));
    if (day >= firstDay && day <= lastDay) days.add(day);
  }

  return days.size;
}

/**
 * El texto exacto del aviso de RF-22. El PRD lo fija palabra por palabra y
 * CLAUDE.md §4.8 prohíbe cualquier otra redacción: la app no interpreta ni
 * sugiere, solo señala un dato para llevar a la consulta.
 *
 * Devuelve `null` cuando no hay que avisar nada.
 */
export function rescueDaysWarning(rescueDays: number): string | null {
  if (rescueDays <= RESCUE_DAYS_WARNING_THRESHOLD) return null;
  return `Vas ${rescueDays} días con analgésicos este mes. Puede ser útil comentarlo en la próxima consulta.`;
}

/** ¿Está marcado como tomado este preventivo en este día? */
export function isPreventiveTaken(
  logs: PreventiveLog[],
  medicationId: string,
  dayKey: string,
): boolean {
  const log = logs.find(
    (entry) => entry.medicationId === medicationId && entry.date === dayKey,
  );
  return log?.taken ?? false;
}

/**
 * Tomas que todavía esperan respuesta de alivio (RF-18).
 *
 * Se muestran recién a las 2 horas —antes la pregunta no tiene sentido— y se
 * dejan de mostrar a los 2 días. De la más vieja a la más nueva, para contestar
 * primero la que está por vencerse.
 */
export function findIntakesAwaitingRelief(intakes: Intake[], now: Date = new Date()): Intake[] {
  return intakes
    .filter((intake) => {
      if (intake.relief2h !== null) return false;
      const elapsed = differenceInHours(now, new Date(intake.takenAt));
      return elapsed >= RELIEF_QUESTION_AFTER_HOURS && elapsed <= RELIEF_QUESTION_UNTIL_HOURS;
    })
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt));
}
