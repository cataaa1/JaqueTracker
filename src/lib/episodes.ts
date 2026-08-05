/**
 * Cálculos sobre episodios. Funciones puras: reciben datos, devuelven datos, no
 * tocan la base ni React.
 *
 * Ojo: esto NO es src/lib/stats.ts. Ese archivo es del reporte PDF (fase 5) y
 * calcula las métricas de la sección 8 del PRD. Acá vive solo lo mínimo que la
 * pantalla de Inicio necesita para mostrar el mes en curso.
 */

import { endOfMonth, startOfMonth, subMinutes } from 'date-fns';
import type { Episode } from '../types';
import { localDayKey, localDayKeysTouched } from './dates';

/** Cuánto tiempo queda a mano en Inicio la última cefalea registrada. */
const QUICK_INTAKE_WINDOW_MINUTES = 60;

/**
 * El episodio que Inicio deja a mano para engancharle una toma: el más reciente,
 * siempre que haya empezado dentro de la última hora.
 *
 * Es un atajo, no un estado. La app no tiene "episodios abiertos" que haya que
 * cerrar: pasada la hora, el episodio simplemente deja de estar destacado y se
 * lo encuentra en el historial como cualquier otro.
 */
export function findEpisodeForQuickIntake(
  episodes: Episode[],
  now: Date = new Date(),
): Episode | null {
  const from = subMinutes(now, QUICK_INTAKE_WINDOW_MINUTES).toISOString();
  const to = now.toISOString();

  const candidates = episodes
    .filter((episode) => episode.startedAt >= from && episode.startedAt <= to)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  return candidates[0] ?? null;
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
): number {
  const firstDay = localDayKey(startOfMonth(reference));
  const lastDay = localDayKey(endOfMonth(reference));

  const days = new Set<string>();
  for (const episode of episodes) {
    for (const day of localDayKeysTouched(episode.startedAt, episode.endedAt)) {
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
