/**
 * Cálculos sobre episodios. Funciones puras: reciben datos, devuelven datos, no
 * tocan la base ni React.
 *
 * Ojo: esto NO es src/lib/stats.ts. Ese archivo es del reporte PDF (fase 5) y
 * calcula las métricas de la sección 8 del PRD. Acá vive solo lo mínimo que la
 * pantalla de Inicio necesita para mostrar el mes en curso.
 */

import { endOfMonth, startOfMonth } from 'date-fns';
import type { Episode } from '../types';
import { localDayKey, localDayKeysTouched } from './dates';

/** El episodio que todavía no terminó, si hay alguno (RF-08). Si por algún
 *  motivo hubiera más de uno, gana el más reciente. */
export function findOngoingEpisode(episodes: Episode[]): Episode | null {
  const ongoing = episodes
    .filter((episode) => episode.endedAt === null)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  return ongoing[0] ?? null;
}

/**
 * Días con cefalea del mes que contiene `reference`.
 *
 * Cuenta días del calendario, no episodios: dos episodios el mismo día son un
 * día, y un episodio que cruza la medianoche son dos. Es la métrica clínica
 * principal del PRD (sección 8, bloque 1).
 */
export function countHeadacheDaysInMonth(
  episodes: Episode[],
  reference: Date = new Date(),
  now: Date = new Date(),
): number {
  const firstDay = localDayKey(startOfMonth(reference));
  const lastDay = localDayKey(endOfMonth(reference));

  const days = new Set<string>();
  for (const episode of episodes) {
    for (const day of localDayKeysTouched(episode.startedAt, episode.endedAt, now)) {
      if (day >= firstDay && day <= lastDay) days.add(day);
    }
  }

  return days.size;
}

/**
 * Cuántos episodios empezaron dentro del mes.
 *
 * No es lo mismo que los días con cefalea y por eso se muestran los dos: tres
 * episodios el mismo día son tres episodios pero un solo día. La métrica
 * clínica es la de días; el conteo de episodios está para que el número de
 * días no parezca un error.
 */
export function countEpisodesInMonth(
  episodes: Episode[],
  reference: Date = new Date(),
): number {
  const firstDay = localDayKey(startOfMonth(reference));
  const lastDay = localDayKey(endOfMonth(reference));

  return episodes.filter((episode) => {
    const day = localDayKey(new Date(episode.startedAt));
    return day >= firstDay && day <= lastDay;
  }).length;
}

/** Los episodios de un día del calendario local, del más intenso al menos. */
export function episodesStartedOnDay(episodes: Episode[], day: Date): Episode[] {
  const key = localDayKey(day);
  return episodes
    .filter((episode) => localDayKey(new Date(episode.startedAt)) === key)
    .sort((a, b) => b.intensity - a.intensity);
}
