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

import { db } from './schema';
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

/**
 * Los episodios sin cerrar (RF-08).
 *
 * Se recorre en memoria a propósito: IndexedDB no puede indexar `null`, que es
 * justo el valor que marca "en curso". Ver el comentario en schema.ts.
 */
export async function listOngoingEpisodes(): Promise<Episode[]> {
  return db.episodes.filter((episode) => episode.endedAt === null).toArray();
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

/** Cierra un episodio en curso poniéndole hora de fin (RF-08). */
export async function closeEpisode(id: string, endedAt: string): Promise<void> {
  const updated = await db.episodes.update(id, { endedAt });
  if (updated === 0) {
    throw new Error(`No se encontró el episodio ${id} para cerrarlo.`);
  }
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
