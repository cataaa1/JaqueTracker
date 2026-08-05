/**
 * Cálculos y formato sobre medicamentos y tomas. Funciones puras: no tocan la
 * base ni React.
 */

import { differenceInHours } from 'date-fns';
import type { Intake, Medication } from '../types';
import { UNIT_LABELS } from './labels';
import { localDayKey } from './dates';

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
