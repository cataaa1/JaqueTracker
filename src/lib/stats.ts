/**
 * Métricas del reporte clínico — PRD sección 8.
 *
 * Funciones puras: reciben los datos ya leídos y devuelven números. No tocan la
 * base, no tocan React, no arman ningún PDF. De dibujar se encarga `pdf.ts`.
 *
 * DOS MÉTRICAS QUE PUEDEN VENIR VACÍAS
 * La duración de los episodios y el grado de limitación dejaron de pedirse en
 * el formulario por decisión del propietario del producto. Los episodios
 * anteriores al cambio sí los tienen. Por eso las dos devuelven `null` cuando
 * no hay ni un solo dato, en vez de devolver 0: en un informe clínico un 0 se
 * lee como "nunca pasó", que es una afirmación distinta de "no se registró".
 */

import {
  differenceInCalendarDays,
  differenceInMinutes,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import type {
  Episode,
  EpisodeType,
  Intake,
  Medication,
  PreventiveLog,
  ReliefLevel,
  Symptom,
} from '../types';
import { localDayKey, localDayKeysTouched } from './dates';

/** Más allá de esto la tabla semanal no entra en dos páginas y se agrupa por mes. */
const MAX_DAYS_FOR_WEEKLY_TABLE = 100;

export interface ReportInput {
  episodes: Episode[];
  intakes: Intake[];
  medications: Medication[];
  preventiveLogs: PreventiveLog[];
  from: Date;
  to: Date;
}

export interface PeriodRow {
  label: string;
  days: number;
}

export interface RescueMedicationStats {
  name: string;
  daysWithIntake: number;
  totalDoses: number;
}

export interface PreventiveStats {
  name: string;
  dose: string;
  adherencePercent: number;
  takenDays: number;
  missedDays: number;
}

export interface SymptomStats {
  symptom: Symptom;
  count: number;
  percent: number;
}

export interface Report {
  from: Date;
  to: Date;
  totalDays: number;

  // Bloque 1
  episodeCount: number;
  headacheDays: number;
  headacheDaysPerMonth: number;
  periodRows: PeriodRow[];
  periodRowsAreWeekly: boolean;
  byType: Record<EpisodeType, number>;
  averageIntensity: number | null;
  maxIntensity: number | null;
  averageDurationMinutes: number | null;
  disabilityDays: number | null;

  // Bloque 2
  rescue: RescueMedicationStats[];
  rescueDaysTotal: number;
  reliefCounts: Record<ReliefLevel | 'unanswered', number>;

  // Bloque 3
  preventives: PreventiveStats[];

  // Bloque 4
  symptoms: SymptomStats[];
  auraEpisodes: number;
  auraTypeCounts: Record<string, number>;

  // Bloques 5 y 6
  episodes: Episode[];
  intakesByEpisode: Map<string, Intake[]>;
  notes: { startedAt: string; text: string }[];
  /** Si ningún episodio del período tiene duración o limitación, esas columnas
   *  se omiten de la tabla detallada en vez de llenarse de guiones. */
  showDurationColumn: boolean;
  showDisabilityColumn: boolean;
}

function withinRange(iso: string, from: Date, to: Date): boolean {
  const time = new Date(iso).getTime();
  return time >= from.getTime() && time <= to.getTime();
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function buildReport(input: ReportInput): Report {
  const { from, to } = input;

  const episodes = input.episodes
    .filter((episode) => withinRange(episode.startedAt, from, to))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  const intakes = input.intakes.filter((intake) => withinRange(intake.takenAt, from, to));

  const totalDays = differenceInCalendarDays(to, from) + 1;

  // ─── Bloque 1 ──────────────────────────────────────────────────────────────

  const fromKey = localDayKey(from);
  const toKey = localDayKey(to);

  const headacheDayKeys = new Set<string>();
  for (const episode of episodes) {
    for (const day of localDayKeysTouched(episode.startedAt, episode.endedAt)) {
      if (day >= fromKey && day <= toKey) headacheDayKeys.add(day);
    }
  }

  const byType: Record<EpisodeType, number> = { migraine: 0, tension: 0, unknown: 0 };
  for (const episode of episodes) byType[episode.type] += 1;

  const intensities = episodes.map((episode) => episode.intensity);
  const durations = episodes
    .filter((episode) => episode.endedAt !== null)
    .map((episode) =>
      Math.max(0, differenceInMinutes(new Date(episode.endedAt as string), new Date(episode.startedAt))),
    );

  // Días con limitación grado 2 o 3. `null` si ningún episodio del período
  // registró el campo: no es lo mismo que cero días.
  const anyDisabilityRecorded = episodes.some((episode) => episode.disability > 0);
  const disabilityDayKeys = new Set<string>();
  for (const episode of episodes) {
    if (episode.disability >= 2) disabilityDayKeys.add(localDayKey(new Date(episode.startedAt)));
  }

  const periodRowsAreWeekly = totalDays <= MAX_DAYS_FOR_WEEKLY_TABLE;
  const periodRows = periodRowsAreWeekly
    ? buildWeeklyRows(headacheDayKeys, from, to)
    : buildMonthlyRows(headacheDayKeys, from, to);

  // ─── Bloque 2 ──────────────────────────────────────────────────────────────

  const rescueMeds = input.medications.filter((medication) => medication.kind === 'rescue');
  const rescueIds = new Set(rescueMeds.map((medication) => medication.id));
  const rescueIntakes = intakes.filter((intake) => rescueIds.has(intake.medicationId));

  const rescue: RescueMedicationStats[] = rescueMeds
    .map((medication) => {
      const own = rescueIntakes.filter((intake) => intake.medicationId === medication.id);
      const days = new Set(own.map((intake) => localDayKey(new Date(intake.takenAt))));
      return {
        name: `${medication.name} ${medication.dose} ${medication.unit === 'ui' ? 'UI' : medication.unit}`,
        daysWithIntake: days.size,
        totalDoses: own.length,
      };
    })
    .filter((row) => row.totalDoses > 0)
    .sort((a, b) => b.daysWithIntake - a.daysWithIntake);

  const rescueDaysTotal = new Set(
    rescueIntakes.map((intake) => localDayKey(new Date(intake.takenAt))),
  ).size;

  const reliefCounts: Record<ReliefLevel | 'unanswered', number> = {
    none: 0,
    partial: 0,
    complete: 0,
    unanswered: 0,
  };
  for (const intake of rescueIntakes) {
    if (intake.relief2h === null) reliefCounts.unanswered += 1;
    else reliefCounts[intake.relief2h] += 1;
  }

  // ─── Bloque 3 ──────────────────────────────────────────────────────────────

  const preventives: PreventiveStats[] = input.medications
    .filter((medication) => medication.kind === 'preventive' && medication.isActive)
    .map((medication) => {
      const takenDays = new Set(
        input.preventiveLogs
          .filter(
            (log) =>
              log.medicationId === medication.id &&
              log.taken &&
              log.date >= fromKey &&
              log.date <= toKey,
          )
          .map((log) => log.date),
      ).size;

      return {
        name: medication.name,
        dose: `${medication.dose} ${medication.unit === 'ui' ? 'UI' : medication.unit}`,
        adherencePercent: totalDays === 0 ? 0 : round((takenDays / totalDays) * 100, 0),
        takenDays,
        missedDays: Math.max(0, totalDays - takenDays),
      };
    });

  // ─── Bloque 4 ──────────────────────────────────────────────────────────────

  const symptomCounts = new Map<Symptom, number>();
  for (const episode of episodes) {
    for (const symptom of episode.symptoms) {
      symptomCounts.set(symptom, (symptomCounts.get(symptom) ?? 0) + 1);
    }
  }

  const symptoms: SymptomStats[] = [...symptomCounts.entries()]
    .map(([symptom, count]) => ({
      symptom,
      count,
      percent: episodes.length === 0 ? 0 : round((count / episodes.length) * 100, 0),
    }))
    .sort((a, b) => b.count - a.count);

  const auraTypeCounts: Record<string, number> = {};
  let auraEpisodes = 0;
  for (const episode of episodes) {
    if (!episode.hasAura) continue;
    auraEpisodes += 1;
    for (const auraType of episode.auraTypes) {
      auraTypeCounts[auraType] = (auraTypeCounts[auraType] ?? 0) + 1;
    }
  }

  // ─── Bloques 5 y 6 ─────────────────────────────────────────────────────────

  const intakesByEpisode = new Map<string, Intake[]>();
  for (const intake of intakes) {
    if (intake.episodeId === null) continue;
    const list = intakesByEpisode.get(intake.episodeId) ?? [];
    list.push(intake);
    intakesByEpisode.set(intake.episodeId, list);
  }

  const notes = episodes
    .filter((episode) => episode.notes.trim() !== '')
    .map((episode) => ({ startedAt: episode.startedAt, text: episode.notes.trim() }));

  return {
    from,
    to,
    totalDays,
    episodeCount: episodes.length,
    headacheDays: headacheDayKeys.size,
    headacheDaysPerMonth: totalDays === 0 ? 0 : round((headacheDayKeys.size / totalDays) * 30),
    periodRows,
    periodRowsAreWeekly,
    byType,
    averageIntensity:
      intensities.length === 0
        ? null
        : round(intensities.reduce((sum, value) => sum + value, 0) / intensities.length),
    maxIntensity: intensities.length === 0 ? null : Math.max(...intensities),
    averageDurationMinutes:
      durations.length === 0
        ? null
        : Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length),
    disabilityDays: anyDisabilityRecorded ? disabilityDayKeys.size : null,
    rescue,
    rescueDaysTotal,
    reliefCounts,
    preventives,
    symptoms,
    auraEpisodes,
    auraTypeCounts,
    episodes,
    intakesByEpisode,
    notes,
    showDurationColumn: durations.length > 0,
    showDisabilityColumn: anyDisabilityRecorded,
  };
}

function buildWeeklyRows(headacheDayKeys: Set<string>, from: Date, to: Date): PeriodRow[] {
  return eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 }).map((weekStart) => {
    const start = startOfWeek(weekStart, { weekStartsOn: 1 });
    const end = endOfWeek(weekStart, { weekStartsOn: 1 });
    return {
      // Sin guion largo: jsPDF no lo dibuja. Ver el encabezado de pdf.ts.
      label: `${format(start, 'd MMM', { locale: es })} al ${format(end, 'd MMM', { locale: es })}`,
      days: countKeysBetween(headacheDayKeys, start, end),
    };
  });
}

function buildMonthlyRows(headacheDayKeys: Set<string>, from: Date, to: Date): PeriodRow[] {
  return eachMonthOfInterval({ start: from, end: to }).map((month) => ({
    label: format(month, 'MMMM yyyy', { locale: es }),
    days: countKeysBetween(headacheDayKeys, startOfMonth(month), endOfMonth(month)),
  }));
}

function countKeysBetween(keys: Set<string>, start: Date, end: Date): number {
  const startKey = localDayKey(start);
  const endKey = localDayKey(end);
  let count = 0;
  for (const key of keys) {
    if (key >= startKey && key <= endKey) count += 1;
  }
  return count;
}
