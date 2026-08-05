/**
 * Una fila de la lista de episodios, en Inicio y en el Historial.
 *
 * Se toca y abre el detalle (RF-15). La flecha de la derecha es lo que promete
 * eso; ahora que el detalle existe, la promesa se cumple.
 *
 * El subtítulo dice el tipo y cuánta medicación se tomó, como en la maqueta:
 * "sin medicación", "con medicación" o "3 tomas".
 */

import type { Episode } from '../types';
import { formatEpisodeShort } from '../lib/dates';
import { EPISODE_TYPE_LABELS } from '../lib/labels';
import { IntensityBadge } from './IntensityBadge';

interface Props {
  episode: Episode;
  intakeCount: number;
  onSelect: () => void;
}

export function EpisodeRow({ episode, intakeCount, onSelect }: Props) {
  const medicationLabel =
    intakeCount === 0
      ? 'sin medicación'
      : intakeCount === 1
        ? 'con medicación'
        : `${intakeCount} tomas`;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-h-[68px] w-full items-center gap-[14px] rounded-row border border-border bg-surface px-[14px] py-3 text-left shadow-1"
      >
        <IntensityBadge intensity={episode.intensity} />
        <div className="flex flex-1 flex-col gap-px">
          <span className="text-[17px] font-medium text-text">
            {formatEpisodeShort(episode.startedAt)}
          </span>
          <span className="text-body text-text-2">
            {EPISODE_TYPE_LABELS[episode.type]} · {medicationLabel}
          </span>
        </div>
        <svg width="9" height="16" viewBox="0 0 9 16" fill="none" aria-hidden="true">
          <path d="M1.5 1.5L7 8l-5.5 6.5" stroke="var(--text-2)" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  );
}
