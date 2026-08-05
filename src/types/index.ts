/**
 * Tipos compartidos de Jaque Tracker.
 *
 * Espejo exacto del modelo de datos del PRD, sección 5. Los nombres van en
 * inglés; las etiquetas en español viven en src/lib/labels.ts.
 */

/** Tipo de cefalea. `unknown` es el valor por defecto y una respuesta legítima:
 *  la app no fuerza un autodiagnóstico (RF-04). */
export type EpisodeType = 'migraine' | 'tension' | 'unknown';

export type EpisodeLocation =
  | 'unilateral'
  | 'bilateral'
  | 'nuchal'
  | 'periocular'
  | 'other';

export type AuraType = 'visual' | 'sensory' | 'speech' | 'motor';

export type Symptom =
  | 'nausea'
  | 'vomiting'
  | 'dizziness'
  | 'photophobia'
  | 'phonophobia'
  | 'neckStiffness';

/** Escala visual analógica 1–10 (RF-03). */
export type Intensity = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** Discapacidad funcional (RF-07):
 *  0 sin impacto · 1 molestia · 2 limitó actividades · 3 incapacitó. */
export type Disability = 0 | 1 | 2 | 3;

export interface Episode {
  id: string;
  /** ISO 8601 con offset local. Ver src/lib/dates.ts. */
  startedAt: string;
  /** `null` significa episodio en curso (RF-08). */
  endedAt: string | null;
  type: EpisodeType;
  intensity: Intensity;
  /** `null` cuando no se cargó: es un campo opcional (RF-10). */
  location: EpisodeLocation | null;
  hasAura: boolean;
  /** Solo tiene sentido si `hasAura` es true. */
  auraTypes: AuraType[];
  symptoms: Symptom[];
  disability: Disability;
  /** Cadena vacía cuando no hay notas. */
  notes: string;
}

/** Lo que hace falta para crear un episodio. El `id` lo pone la capa de datos. */
export type NewEpisode = Omit<Episode, 'id'>;

// ─── Medicación (fase 2) ─────────────────────────────────────────────────────

export type MedicationUnit = 'mg' | 'g' | 'ml' | 'ui';

/** `rescue` es lo que se toma cuando ya duele; `preventive`, lo de todos los
 *  días. La distinción no es cosmética: define cómo se cuenta cada uno en el
 *  reporte, y los días con rescate son el dato que más le importa al neurólogo. */
export type MedicationKind = 'rescue' | 'preventive';

/** Alivio a las 2 horas de una toma (RF-18). */
export type ReliefLevel = 'none' | 'partial' | 'complete';

export interface MedicationSchedule {
  timesPerDay: number;
  /** Horarios concretos. En la v1 queda siempre vacío: los recordatorios de
   *  toma están fuera de alcance (PRD §9), así que una hora cargada no haría
   *  nada. El campo existe porque lo define el modelo del PRD. */
  times: string[];
}

export interface Medication {
  id: string;
  name: string;
  dose: number;
  unit: MedicationUnit;
  kind: MedicationKind;
  /** Desactivar en vez de borrar: un medicamento que se discontinuó tiene que
   *  seguir explicando las tomas viejas del historial. */
  isActive: boolean;
  /** Solo para los preventivos; `null` en los analgésicos. */
  schedule: MedicationSchedule | null;
}

export type NewMedication = Omit<Medication, 'id'>;

export interface Intake {
  id: string;
  medicationId: string;
  takenAt: string;
  /** Vinculación opcional a un episodio: se puede tomar algo sin haber
   *  registrado un episodio (RF-17). */
  episodeId: string | null;
  /** `null` = todavía no se respondió si alivió. */
  relief2h: ReliefLevel | null;
}

export type NewIntake = Omit<Intake, 'id'>;

// ─── Adherencia al preventivo (fase 3) ───────────────────────────────────────

export interface PreventiveLog {
  id: string;
  medicationId: string;
  /** Día del calendario local en formato `2026-08-05`, sin hora. Un preventivo
   *  se toma "el martes", no "el martes a las 14:03": guardar la hora invitaría
   *  a una precisión que el dato no tiene. Hay un registro por medicamento y
   *  por día. */
  date: string;
  taken: boolean;
}

export type NewPreventiveLog = Omit<PreventiveLog, 'id'>;
