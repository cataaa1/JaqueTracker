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
import type { Episode, NewEpisode } from '../types';

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
