/**
 * Respaldo en JSON — RF-24, RF-25 y RNF-06.
 *
 * POR QUÉ ESTO ES REQUISITO BLOQUEANTE DE LA V1
 * Los datos viven solo en este dispositivo. Safari en iOS puede borrar el
 * almacenamiento de un sitio tras 7 días sin uso; los PWA instalados están
 * exentos, pero la garantía no es absoluta (PRD §4). Sin respaldo, un descuido
 * borra meses de registro y no hay de dónde recuperarlo.
 *
 * POR QUÉ LA VALIDACIÓN ES TAN PESADA
 * Importar es la única operación de la app que puede destruir datos. El archivo
 * puede venir editado a mano, truncado por una descarga cortada, o ser un JSON
 * de cualquier otra cosa. Nada de lo que entra se toca antes de haber
 * verificado, campo por campo, que es lo que dice ser. Se usa `unknown` y se
 * valida; nunca `any` (CLAUDE.md §5).
 *
 * El formato es legible por un humano a propósito (RNF-06): sangrado de dos
 * espacios, nombres de campo iguales a los del modelo, fechas ISO. Alguien
 * tiene que poder abrirlo con un editor de texto y entender qué dice.
 */

import type {
  AuraType,
  Disability,
  Episode,
  EpisodeLocation,
  EpisodeType,
  Intake,
  Intensity,
  Medication,
  MedicationKind,
  MedicationUnit,
  PreventiveLog,
  ReliefLevel,
  Symptom,
} from '../types';

/** Sube solo si cambia la FORMA del archivo, no cuando cambia el esquema de la
 *  base. Un archivo de una versión futura no se importa: no sabemos qué trae. */
export const BACKUP_FORMAT_VERSION = 1;

export interface BackupData {
  episodes: Episode[];
  medications: Medication[];
  intakes: Intake[];
  preventiveLogs: PreventiveLog[];
}

export interface BackupFile {
  app: 'jaque-tracker';
  formatVersion: number;
  exportedAt: string;
  data: BackupData;
}

// ─── Exportar ────────────────────────────────────────────────────────────────

export function buildBackupFile(data: BackupData): BackupFile {
  return {
    app: 'jaque-tracker',
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

/** El JSON va con sangría para que se pueda leer y revisar a mano (RNF-06). */
export function serializeBackup(file: BackupFile): string {
  return `${JSON.stringify(file, null, 2)}\n`;
}

export function backupFileName(date: Date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `jaque-tracker-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

// ─── Validación ──────────────────────────────────────────────────────────────

/** Error con un mensaje que se le puede mostrar al usuario tal cual. */
export class BackupError extends Error {}

function fail(message: string): never {
  throw new BackupError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(source: Record<string, unknown>, field: string, where: string): string {
  const value = source[field];
  if (typeof value !== 'string') fail(`${where}: el campo "${field}" tendría que ser texto.`);
  return value;
}

function readIsoDate(source: Record<string, unknown>, field: string, where: string): string {
  const value = readString(source, field, where);
  if (Number.isNaN(new Date(value).getTime())) {
    fail(`${where}: el campo "${field}" no es una fecha válida ("${value}").`);
  }
  return value;
}

function readNullableIsoDate(
  source: Record<string, unknown>,
  field: string,
  where: string,
): string | null {
  if (source[field] === null) return null;
  return readIsoDate(source, field, where);
}

function readBoolean(source: Record<string, unknown>, field: string, where: string): boolean {
  const value = source[field];
  if (typeof value !== 'boolean') fail(`${where}: el campo "${field}" tendría que ser sí o no.`);
  return value;
}

function readNumber(source: Record<string, unknown>, field: string, where: string): number {
  const value = source[field];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`${where}: el campo "${field}" tendría que ser un número.`);
  }
  return value;
}

function readEnum<T extends string>(
  source: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
  where: string,
): T {
  const value = source[field];
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    fail(`${where}: el campo "${field}" tiene un valor que no existe ("${String(value)}").`);
  }
  return value as T;
}

function readEnumList<T extends string>(
  source: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
  where: string,
): T[] {
  const value = source[field];
  if (!Array.isArray(value)) fail(`${where}: el campo "${field}" tendría que ser una lista.`);
  return value.map((item) => {
    if (typeof item !== 'string' || !allowed.includes(item as T)) {
      fail(`${where}: la lista "${field}" tiene un valor que no existe ("${String(item)}").`);
    }
    return item as T;
  });
}

function readArray(source: Record<string, unknown>, field: string): unknown[] {
  const value = source[field];
  if (!Array.isArray(value)) fail(`El respaldo no tiene la lista "${field}".`);
  return value;
}

const EPISODE_TYPES: readonly EpisodeType[] = ['migraine', 'tension', 'unknown'];
const LOCATIONS: readonly EpisodeLocation[] = [
  'unilateral',
  'bilateral',
  'nuchal',
  'periocular',
  'other',
];
const AURA_TYPES: readonly AuraType[] = ['visual', 'sensory', 'speech', 'motor'];
const SYMPTOMS: readonly Symptom[] = [
  'nausea',
  'vomiting',
  'dizziness',
  'photophobia',
  'phonophobia',
  'neckStiffness',
];
const UNITS: readonly MedicationUnit[] = ['mg', 'g', 'ml', 'ui'];
const KINDS: readonly MedicationKind[] = ['rescue', 'preventive'];
const RELIEFS: readonly ReliefLevel[] = ['none', 'partial', 'complete'];

function parseEpisode(raw: unknown, index: number): Episode {
  const where = `Episodio ${index + 1}`;
  if (!isRecord(raw)) fail(`${where}: no es un registro.`);

  const intensity = readNumber(raw, 'intensity', where);
  if (!Number.isInteger(intensity) || intensity < 1 || intensity > 10) {
    fail(`${where}: la intensidad tendría que ser un entero del 1 al 10 (vino ${intensity}).`);
  }

  const disability = readNumber(raw, 'disability', where);
  if (!Number.isInteger(disability) || disability < 0 || disability > 3) {
    fail(`${where}: la limitación tendría que ser un entero del 0 al 3 (vino ${disability}).`);
  }

  return {
    id: readString(raw, 'id', where),
    startedAt: readIsoDate(raw, 'startedAt', where),
    endedAt: readNullableIsoDate(raw, 'endedAt', where),
    type: readEnum(raw, 'type', EPISODE_TYPES, where),
    intensity: intensity as Intensity,
    location: raw['location'] === null ? null : readEnum(raw, 'location', LOCATIONS, where),
    hasAura: readBoolean(raw, 'hasAura', where),
    auraTypes: readEnumList(raw, 'auraTypes', AURA_TYPES, where),
    symptoms: readEnumList(raw, 'symptoms', SYMPTOMS, where),
    disability: disability as Disability,
    notes: readString(raw, 'notes', where),
  };
}

function parseMedication(raw: unknown, index: number): Medication {
  const where = `Medicamento ${index + 1}`;
  if (!isRecord(raw)) fail(`${where}: no es un registro.`);

  const scheduleRaw = raw['schedule'];
  let schedule: Medication['schedule'] = null;

  if (scheduleRaw !== null && scheduleRaw !== undefined) {
    if (!isRecord(scheduleRaw)) fail(`${where}: el horario no es un registro.`);
    const timesPerDay = readNumber(scheduleRaw, 'timesPerDay', where);
    if (!Number.isInteger(timesPerDay) || timesPerDay < 1) {
      fail(`${where}: "timesPerDay" tendría que ser un entero mayor que cero.`);
    }
    const times = scheduleRaw['times'];
    if (!Array.isArray(times) || times.some((time) => typeof time !== 'string')) {
      fail(`${where}: "times" tendría que ser una lista de textos.`);
    }
    schedule = { timesPerDay, times: times as string[] };
  }

  const dose = readNumber(raw, 'dose', where);
  if (dose <= 0) fail(`${where}: la dosis tendría que ser mayor que cero (vino ${dose}).`);

  return {
    id: readString(raw, 'id', where),
    name: readString(raw, 'name', where),
    dose,
    unit: readEnum(raw, 'unit', UNITS, where),
    kind: readEnum(raw, 'kind', KINDS, where),
    isActive: readBoolean(raw, 'isActive', where),
    schedule,
  };
}

function parseIntake(raw: unknown, index: number): Intake {
  const where = `Toma ${index + 1}`;
  if (!isRecord(raw)) fail(`${where}: no es un registro.`);

  return {
    id: readString(raw, 'id', where),
    medicationId: readString(raw, 'medicationId', where),
    takenAt: readIsoDate(raw, 'takenAt', where),
    episodeId: raw['episodeId'] === null ? null : readString(raw, 'episodeId', where),
    relief2h: raw['relief2h'] === null ? null : readEnum(raw, 'relief2h', RELIEFS, where),
  };
}

function parsePreventiveLog(raw: unknown, index: number): PreventiveLog {
  const where = `Marca de preventivo ${index + 1}`;
  if (!isRecord(raw)) fail(`${where}: no es un registro.`);

  const date = readString(raw, 'date', where);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    fail(`${where}: la fecha tendría que ser un día en formato 2026-08-05 (vino "${date}").`);
  }

  return {
    id: readString(raw, 'id', where),
    medicationId: readString(raw, 'medicationId', where),
    date,
    taken: readBoolean(raw, 'taken', where),
  };
}

/**
 * Convierte el texto de un archivo en datos verificados.
 *
 * Tira `BackupError` con un mensaje en castellano apto para mostrar en pantalla
 * apenas encuentra el primer problema. Mejor rechazar entero un archivo dudoso
 * que importar la mitad.
 */
export function parseBackup(text: string): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    fail('El archivo no es un JSON válido. ¿Es el archivo que exportó esta app?');
  }

  if (!isRecord(parsed)) fail('El archivo no tiene la forma de un respaldo.');

  if (parsed['app'] !== 'jaque-tracker') {
    fail('Este archivo no es un respaldo de Jaque Tracker.');
  }

  const formatVersion = readNumber(parsed, 'formatVersion', 'El respaldo');
  if (formatVersion > BACKUP_FORMAT_VERSION) {
    fail(
      `El respaldo es de una versión más nueva de la app (formato ${formatVersion}). Actualizá la app antes de importarlo.`,
    );
  }

  const data = parsed['data'];
  if (!isRecord(data)) fail('El respaldo no tiene la sección "data".');

  return {
    app: 'jaque-tracker',
    formatVersion,
    exportedAt: readIsoDate(parsed, 'exportedAt', 'El respaldo'),
    data: {
      episodes: readArray(data, 'episodes').map(parseEpisode),
      medications: readArray(data, 'medications').map(parseMedication),
      intakes: readArray(data, 'intakes').map(parseIntake),
      preventiveLogs: readArray(data, 'preventiveLogs').map(parsePreventiveLog),
    },
  };
}

export function countRecords(data: BackupData): number {
  return (
    data.episodes.length +
    data.medications.length +
    data.intakes.length +
    data.preventiveLogs.length
  );
}

// ─── Recordatorio de respaldo (RF-26) ────────────────────────────────────────

const LAST_BACKUP_KEY = 'jaque-tracker:last-backup';

/** A partir de acá la app recuerda que conviene guardar una copia (RF-26). */
export const BACKUP_REMINDER_DAYS = 30;

/**
 * La fecha del último respaldo vive en `localStorage`.
 *
 * No es un dato clínico —es una marca de tiempo de la interfaz— así que no
 * viola la regla §4.9 de CLAUDE.md, que prohíbe guardar ahí datos de salud.
 * Tampoco va en IndexedDB: si se pierde junto con los datos, el recordatorio
 * vuelve a aparecer, que es exactamente lo que corresponde en ese caso.
 */
export function readLastBackupAt(): Date | null {
  const stored = window.localStorage.getItem(LAST_BACKUP_KEY);
  if (stored === null) return null;
  const date = new Date(stored);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function markBackupDone(at: Date = new Date()): void {
  window.localStorage.setItem(LAST_BACKUP_KEY, at.toISOString());
}

/** Días desde el último respaldo, o `null` si nunca se hizo uno. */
export function daysSinceLastBackup(now: Date = new Date()): number | null {
  const last = readLastBackupAt();
  if (last === null) return null;
  return Math.floor((now.getTime() - last.getTime()) / 86_400_000);
}

/** ¿Hay que recordarle al usuario que haga una copia? (RF-26) */
export function shouldRemindBackup(hasData: boolean, now: Date = new Date()): boolean {
  if (!hasData) return false;
  const days = daysSinceLastBackup(now);
  return days === null || days > BACKUP_REMINDER_DAYS;
}
