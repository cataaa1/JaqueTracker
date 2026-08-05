/**
 * Etiquetas en español para los valores que en el código van en inglés.
 *
 * Un solo lugar para todo lo que el usuario lee de los campos de un episodio,
 * así la app y (más adelante) el PDF nunca dicen cosas distintas.
 */

import type {
  AuraType,
  Disability,
  EpisodeLocation,
  EpisodeType,
  MedicationKind,
  MedicationUnit,
  ReliefLevel,
  Symptom,
} from '../types';

export const EPISODE_TYPE_LABELS: Record<EpisodeType, string> = {
  migraine: 'Migraña',
  tension: 'Tensional',
  unknown: 'No sé',
};

/** El orden en el que se muestran los botones de tipo (RF-04). */
export const EPISODE_TYPE_ORDER: EpisodeType[] = ['migraine', 'tension', 'unknown'];

export const LOCATION_LABELS: Record<EpisodeLocation, string> = {
  unilateral: 'De un lado',
  bilateral: 'De los dos lados',
  nuchal: 'En la nuca',
  periocular: 'Alrededor del ojo',
  other: 'Otra',
};

export const LOCATION_ORDER: EpisodeLocation[] = [
  'unilateral',
  'bilateral',
  'nuchal',
  'periocular',
  'other',
];

export const AURA_TYPE_LABELS: Record<AuraType, string> = {
  visual: 'Visual',
  sensory: 'Sensitiva',
  speech: 'Del habla',
  motor: 'Motora',
};

export const AURA_TYPE_ORDER: AuraType[] = ['visual', 'sensory', 'speech', 'motor'];

export const SYMPTOM_LABELS: Record<Symptom, string> = {
  nausea: 'Náuseas',
  vomiting: 'Vómitos',
  dizziness: 'Mareos',
  photophobia: 'Molestia con la luz',
  phonophobia: 'Molestia con el ruido',
  neckStiffness: 'Rigidez en el cuello',
};

export const SYMPTOM_ORDER: Symptom[] = [
  'nausea',
  'vomiting',
  'dizziness',
  'photophobia',
  'phonophobia',
  'neckStiffness',
];

/** Grado de discapacidad funcional (RF-07). Los textos describen el impacto en
 *  el día, sin interpretar nada: la app no diagnostica (CLAUDE.md §4.8). */
export const DISABILITY_LABELS: Record<Disability, string> = {
  0: 'No me afectó',
  1: 'Me molestó',
  2: 'Me limitó',
  3: 'No pude hacer nada',
};

export const DISABILITY_ORDER: Disability[] = [0, 1, 2, 3];

// ─── Medicación ──────────────────────────────────────────────────────────────

/** "UI" son unidades internacionales; las demás se escriben como se leen. */
export const UNIT_LABELS: Record<MedicationUnit, string> = {
  mg: 'mg',
  g: 'g',
  ml: 'ml',
  ui: 'UI',
};

export const UNIT_ORDER: MedicationUnit[] = ['mg', 'g', 'ml', 'ui'];

/** En la interfaz se dice "analgésico" y no "rescate": es la palabra que usa
 *  cualquiera. En el código el valor sigue siendo `rescue`, como el PRD. */
export const MEDICATION_KIND_LABELS: Record<MedicationKind, string> = {
  rescue: 'Analgésico',
  preventive: 'Preventivo',
};

export const MEDICATION_KIND_ORDER: MedicationKind[] = ['rescue', 'preventive'];

/** RF-18 los define como ninguno / parcial / completo. Acá se escriben como se
 *  contesta la pregunta "¿te alivió?". */
export const RELIEF_LABELS: Record<ReliefLevel, string> = {
  none: 'Nada',
  partial: 'Un poco',
  complete: 'Del todo',
};

export const RELIEF_ORDER: ReliefLevel[] = ['none', 'partial', 'complete'];
