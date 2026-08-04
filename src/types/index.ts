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
