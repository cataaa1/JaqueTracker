/**
 * Esquema de la base de datos (Dexie sobre IndexedDB).
 *
 * IndexedDB es la base que el navegador guarda en el propio dispositivo; Dexie
 * es una capa fina encima para no escribir IndexedDB a mano. Nada de esto sale
 * del teléfono.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * REGLA QUE NO SE ROMPE (CLAUDE.md §4.5)
 *
 * Cada `.version(n).stores(...)` de acá abajo es una foto congelada del esquema.
 * Una vez que una versión estuvo en el teléfono con datos reales, NO SE EDITA
 * NUNCA MÁS: si hace falta cambiar algo, se agrega una versión nueva debajo, con
 * su `.upgrade()` si hay que transformar los datos existentes. Editar una versión
 * publicada deja bases a medio migrar que ya no abren.
 *
 * Historial de versiones:
 *   v1 (fase 1) — tabla `episodes`.
 *   v2 (fase 2) — se suman `medications` e `intakes`.
 *
 * Lo que viene: `preventiveLogs` en la fase 3 y `settings`. Cada una entra como
 * versión nueva, sin tocar las anteriores.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Sobre la cadena de índices ('id, startedAt'): el primer campo es la clave
 * primaria y los demás son índices, o sea las columnas por las que se puede
 * ordenar y filtrar rápido. Los campos que no están en la lista igual se
 * guardan; solo que no se pueden usar para buscar sin recorrer todo.
 *
 * `endedAt` a propósito NO está indexado: IndexedDB no indexa valores `null`,
 * y `null` es justamente lo que marca un episodio en curso. Se filtra en
 * memoria, que con este volumen de datos es instantáneo.
 */

import Dexie from 'dexie';
import type { EntityTable } from 'dexie';
import type { Episode, Intake, Medication } from '../types';

export const db = new Dexie('jaque-tracker') as Dexie & {
  episodes: EntityTable<Episode, 'id'>;
  medications: EntityTable<Medication, 'id'>;
  intakes: EntityTable<Intake, 'id'>;
};

db.version(1).stores({
  episodes: 'id, startedAt',
});

// v2 — fase 2. Solo se nombran las tablas nuevas: Dexie arrastra solas las que
// no cambian, así que `episodes` sigue igual que en la v1 sin repetirla.
//
// No hace falta `.upgrade()` porque no hay que transformar ningún dato viejo:
// las tablas nacen vacías y los episodios existentes no se tocan. Una base que
// venía en v1 se actualiza sola al abrirse, sin perder nada.
//
// `episodeId` y `relief2h` quedan sin indexar por el mismo motivo que `endedAt`:
// su valor habitual es `null` e IndexedDB no indexa `null`. `isActive` tampoco
// se indexa, pero por otra razón: IndexedDB no acepta booleanos como clave.
// Los tres se filtran en memoria, que con este volumen es instantáneo.
db.version(2).stores({
  medications: 'id, kind, name',
  intakes: 'id, takenAt, medicationId, episodeId',
});
