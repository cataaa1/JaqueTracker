/**
 * Una fila de la lista de episodios: intensidad, cuándo empezó y un resumen.
 *
 * En la maqueta la fila termina en una flechita y el subtítulo dice
 * "Migraña · con medicación". Las dos cosas quedan para más adelante y a
 * propósito:
 *   · la flecha promete abrir el detalle del episodio, que es RF-15 (fase 4);
 *     una flecha que no lleva a ningún lado miente, así que todavía no está.
 *   · "con medicación" necesita la tabla de tomas, que es de la fase 2. Hasta
 *     entonces el subtítulo muestra cuánto duró, que ya es información útil.
 */

import type { Episode } from '../types';
import { formatDuration, formatEpisodeStart } from '../lib/dates';
import { EPISODE_TYPE_LABELS } from '../lib/labels';
import { IntensityBadge } from './IntensityBadge';

interface Props {
  episode: Episode;
}

export function EpisodeRow({ episode }: Props) {
  const duration =
    episode.endedAt === null
      ? 'en curso'
      : formatDuration(episode.startedAt, episode.endedAt);

  return (
    <li className="flex min-h-[68px] items-center gap-[14px] rounded-row border border-border bg-surface px-[14px] py-3 shadow-1">
      <IntensityBadge intensity={episode.intensity} />
      <div className="flex flex-1 flex-col gap-px">
        <span className="text-[17px] font-medium text-text">
          {formatEpisodeStart(episode.startedAt)}
        </span>
        <span className="text-body text-text-2">
          {EPISODE_TYPE_LABELS[episode.type]} · {duration}
        </span>
      </div>
    </li>
  );
}
