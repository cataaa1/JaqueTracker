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
 *
 * Lo que viene: `medications` e `intakes` en la fase 2, `preventiveLogs` en la
 * fase 3 y `settings`. Cada una entra como versión nueva, no tocando la v1.
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
import type { Episode } from '../types';

export const db = new Dexie('jaque-tracker') as Dexie & {
  episodes: EntityTable<Episode, 'id'>;
};

db.version(1).stores({
  episodes: 'id, startedAt',
});
