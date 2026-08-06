/**
 * La única puerta a los datos (CLAUDE.md §4.3).
 *
 * Ningún componente ni pantalla importa Dexie ni `db` directamente: todo pasa
 * por acá. Así hay un solo lugar donde mirar cuando algo con los datos sale mal,
 * y un solo lugar que cambiar si alguna vez cambia el motor de la base.
 *
 * Ninguna función de este archivo atrapa errores en silencio. Si algo falla, la
 * promesa se rechaza y la pantalla se entera (CLAUDE.md §5).
 */

import type { EntityTable } from 'dexie';
import { db } from './schema';
import type { BackupData } from '../lib/backup';
import type {
  Episode,
  Intake,
  Medication,
  NewEpisode,
  NewIntake,
  NewMedication,
  PreventiveLog,
  ReliefLevel,
} from '../types';

/** Identificador único. `crypto.randomUUID` viene en el navegador: no hace falta
 *  ninguna librería y no sale nada a la red. */
function newId(): string {
  return crypto.randomUUID();
}

/**
 * Los N episodios más recientes, del más nuevo al más viejo (RF-11).
 * Traer de a tandas evita cargar años de historia para mostrar dos filas.
 */
export async function listRecentEpisodes(limit: number): Promise<Episode[]> {
  return db.episodes.orderBy('startedAt').reverse().limit(limit).toArray();
}

/** Todos los episodios que empezaron dentro del rango (extremos incluidos).
 *  Se usa para contar los días con cefalea del mes en curso. */
export async function listEpisodesStartedBetween(
  fromIso: string,
  toIso: string,
): Promise<Episode[]> {
  return db.episodes.where('startedAt').between(fromIso, toIso, true, true).toArray();
}

// ─── Lecturas completas, para el reporte y el respaldo ───────────────────────
// Traen todo sin filtrar. Solo las usan el reporte (RF-23) y, más adelante, la
// exportación: en el uso diario nunca se pide la base entera.

export async function listAllEpisodes(): Promise<Episode[]> {
  return db.episodes.orderBy('startedAt').toArray();
}

export async function listAllIntakes(): Promise<Intake[]> {
  return db.intakes.orderBy('takenAt').toArray();
}

export async function listAllPreventiveLogs(): Promise<PreventiveLog[]> {
  return db.preventiveLogs.orderBy('date').toArray();
}

/** Cantidad total de episodios guardados. Sirve para distinguir "todavía no hay
 *  nada" de "no hay nada este mes". */
export async function countEpisodes(): Promise<number> {
  return db.episodes.count();
}

/** Guarda un episodio nuevo y devuelve su id (RF-01). */
export async function createEpisode(episode: NewEpisode): Promise<string> {
  const id = newId();
  await db.episodes.add({ ...episode, id });
  return id;
}

/** Un episodio por su id, para el detalle y la edición (RF-15). */
export async function getEpisode(id: string): Promise<Episode | undefined> {
  return db.episodes.get(id);
}

/** Modifica cualquier campo de un episodio ya guardado (RF-13). */
export async function updateEpisode(
  id: string,
  changes: Partial<NewEpisode>,
): Promise<void> {
  const updated = await db.episodes.update(id, changes);
  if (updated === 0) {
    throw new Error(`No se encontró el episodio ${id} para modificarlo.`);
  }
}

/**
 * Borra un episodio y las tomas vinculadas a él (RF-14).
 *
 * El borrado es en cascada por decisión explícita del propietario del producto:
 * la maqueta lo dice y la pantalla de confirmación lo avisa con todas las
 * letras. Tiene una consecuencia que conviene tener presente: borrar un
 * episodio también baja el conteo de días con analgésicos del mes, que es el
 * número destacado del reporte.
 *
 * Va dentro de una transacción: o se borran las dos cosas o no se borra
 * ninguna. Sin eso, un corte en el medio dejaría tomas apuntando a un episodio
 * que ya no existe.
 */
export async function deleteEpisodeWithIntakes(id: string): Promise<void> {
  await db.transaction('rw', db.episodes, db.intakes, async () => {
    await db.intakes.where('episodeId').equals(id).delete();
    await db.episodes.delete(id);
  });
}

// ─── Medicamentos (RF-16) ────────────────────────────────────────────────────

/** Todo el catálogo, activos e inactivos, ordenado por nombre. */
export async function listMedications(): Promise<Medication[]> {
  return db.medications.orderBy('name').toArray();
}

/** Solo los que siguen en uso. Se filtra en memoria porque IndexedDB no acepta
 *  booleanos como índice. */
export async function listActiveMedications(): Promise<Medication[]> {
  const all = await db.medications.orderBy('name').toArray();
  return all.filter((medication) => medication.isActive);
}

export async function getMedication(id: string): Promise<Medication | undefined> {
  return db.medications.get(id);
}

export async function createMedication(medication: NewMedication): Promise<string> {
  const id = newId();
  await db.medications.add({ ...medication, id });
  return id;
}

export async function updateMedication(
  id: string,
  changes: Partial<NewMedication>,
): Promise<void> {
  const updated = await db.medications.update(id, changes);
  if (updated === 0) {
    throw new Error(`No se encontró el medicamento ${id} para modificarlo.`);
  }
}

/**
 * Da de baja (o vuelve a dar de alta) un medicamento.
 *
 * Nunca se borra: las tomas viejas apuntan a él y sin el medicamento el
 * historial quedaría con filas huérfanas que ya nadie puede interpretar.
 */
export async function setMedicationActive(id: string, isActive: boolean): Promise<void> {
  const updated = await db.medications.update(id, { isActive });
  if (updated === 0) {
    throw new Error(`No se encontró el medicamento ${id}.`);
  }
}

// ─── Tomas de rescate (RF-17, RF-18) ─────────────────────────────────────────

/** Registra una toma (RF-17). */
export async function createIntake(intake: NewIntake): Promise<string> {
  const id = newId();
  await db.intakes.add({ ...intake, id });
  return id;
}

/** Tomas dentro de un rango, de la más nueva a la más vieja. */
export async function listIntakesTakenBetween(
  fromIso: string,
  toIso: string,
): Promise<Intake[]> {
  const rows = await db.intakes.where('takenAt').between(fromIso, toIso, true, true).toArray();
  return rows.sort((a, b) => b.takenAt.localeCompare(a.takenAt));
}

/** Las tomas vinculadas a un episodio. */
export async function listIntakesForEpisode(episodeId: string): Promise<Intake[]> {
  return db.intakes.where('episodeId').equals(episodeId).toArray();
}

/** Responde cuánto alivió una toma, dos horas después (RF-18). */
export async function setIntakeRelief(id: string, relief2h: ReliefLevel): Promise<void> {
  const updated = await db.intakes.update(id, { relief2h });
  if (updated === 0) {
    throw new Error(`No se encontró la toma ${id}.`);
  }
}

// ─── Respaldo (RF-24, RF-25) ─────────────────────────────────────────────────

/** Todo lo que hay en la base, para exportar (RF-24). */
export async function exportEverything(): Promise<BackupData> {
  const [episodes, medications, intakes, preventiveLogs] = await Promise.all([
    listAllEpisodes(),
    listMedications(),
    listAllIntakes(),
    listAllPreventiveLogs(),
  ]);
  return { episodes, medications, intakes, preventiveLogs };
}

export interface ImportResult {
  episodes: number;
  medications: number;
  intakes: number;
  preventiveLogs: number;
  skipped: number;
}

/**
 * REEMPLAZAR: borra todo lo que hay y deja el contenido del respaldo (RF-25).
 *
 * Es la operación más destructiva de la app. La pantalla la confirma dos veces
 * antes de llamarla (regla 4 de CLAUDE.md y RNF-05).
 *
 * Todo pasa dentro de una transacción: si algo falla en el medio, la base queda
 * como estaba. Sin eso, un error después del borrado dejaría al usuario sin
 * datos viejos y sin datos nuevos.
 */
export async function replaceEverything(data: BackupData): Promise<ImportResult> {
  return db.transaction(
    'rw',
    [db.episodes, db.medications, db.intakes, db.preventiveLogs],
    async () => {
      await Promise.all([
        db.episodes.clear(),
        db.medications.clear(),
        db.intakes.clear(),
        db.preventiveLogs.clear(),
      ]);

      await db.episodes.bulkAdd(data.episodes);
      await db.medications.bulkAdd(data.medications);
      await db.intakes.bulkAdd(data.intakes);
      await db.preventiveLogs.bulkAdd(data.preventiveLogs);

      return {
        episodes: data.episodes.length,
        medications: data.medications.length,
        intakes: data.intakes.length,
        preventiveLogs: data.preventiveLogs.length,
        skipped: 0,
      };
    },
  );
}

/**
 * FUSIONAR: suma lo que falta y no pisa nada de lo que ya está (RF-25).
 *
 * Un registro se considera repetido si ya existe su `id`. Las marcas de
 * preventivo llevan además un control extra: la base tiene un índice único por
 * medicamento y día, así que dos marcas con distinto `id` pero mismo día
 * romperían la importación. Esas se saltean.
 */
export async function mergeEverything(data: BackupData): Promise<ImportResult> {
  return db.transaction(
    'rw',
    [db.episodes, db.medications, db.intakes, db.preventiveLogs],
    async () => {
      let skipped = 0;

      async function addMissing<T extends { id: string }>(
        table: EntityTable<T, 'id'>,
        rows: T[],
      ): Promise<number> {
        // Las claves primarias vienen tipadas por Dexie de forma genérica; acá
        // sabemos que son los `id` de texto que declara el esquema.
        const keys = (await table.toCollection().primaryKeys()) as string[];
        const existing = new Set(keys);
        const missing = rows.filter((row) => !existing.has(row.id));
        skipped += rows.length - missing.length;
        if (missing.length > 0) await table.bulkAdd(missing);
        return missing.length;
      }

      const episodes = await addMissing(db.episodes, data.episodes);
      const medications = await addMissing(db.medications, data.medications);
      const intakes = await addMissing(db.intakes, data.intakes);

      // Las marcas de preventivo se filtran también por (medicamento + día),
      // que es único en la base.
      const takenSlots = new Set(
        (await db.preventiveLogs.toArray()).map((log) => `${log.medicationId}|${log.date}`),
      );
      const existingLogIds = new Set(await db.preventiveLogs.toCollection().primaryKeys());

      const logsToAdd = data.preventiveLogs.filter((log) => {
        const slot = `${log.medicationId}|${log.date}`;
        if (existingLogIds.has(log.id) || takenSlots.has(slot)) return false;
        takenSlots.add(slot);
        return true;
      });

      skipped += data.preventiveLogs.length - logsToAdd.length;
      if (logsToAdd.length > 0) await db.preventiveLogs.bulkAdd(logsToAdd);

      return {
        episodes,
        medications,
        intakes,
        preventiveLogs: logsToAdd.length,
        skipped,
      };
    },
  );
}

// ─── Adherencia al preventivo (RF-19, RF-20) ─────────────────────────────────

/** Marcas de preventivo entre dos días, ambos incluidos. Las fechas son claves
 *  de día local (`2026-08-05`), no instantes. */
export async function listPreventiveLogsBetween(
  fromDate: string,
  toDate: string,
): Promise<PreventiveLog[]> {
  return db.preventiveLogs.where('date').between(fromDate, toDate, true, true).toArray();
}

/**
 * Marca o desmarca la toma de un preventivo en un día (RF-19 y RF-20: sirve
 * igual para hoy que para un día anterior).
 *
 * Si ya había un registro de ese medicamento ese día, lo actualiza; si no, lo
 * crea. El índice único de la base garantiza que no puedan quedar dos.
 */
export async function setPreventiveTaken(
  medicationId: string,
  date: string,
  taken: boolean,
): Promise<void> {
  await db.transaction('rw', db.preventiveLogs, async () => {
    const existing = await db.preventiveLogs
      .where('[medicationId+date]')
      .equals([medicationId, date])
      .first();

    if (existing === undefined) {
      await db.preventiveLogs.add({ id: newId(), medicationId, date, taken });
    } else {
      await db.preventiveLogs.update(existing.id, { taken });
    }
  });
}
