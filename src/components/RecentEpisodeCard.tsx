/**
 * La cefalea recién registrada, destacada arriba de Inicio.
 *
 * Existe solo para engancharle una toma sin tener que buscarla (RF-17). No es
 * un estado que haya que cerrar: pasada la hora desde que empezó, la tarjeta
 * desaparece sola y el episodio queda en el historial como cualquier otro.
 */

import type { Episode } from '../types';
import { formatElapsedSince, formatTime } from '../lib/dates';
import { IntensityBadge } from './IntensityBadge';

interface Props {
  episode: Episode;
  onRegisterIntake: () => void;
  onOpenDetail: () => void;
}

export function RecentEpisodeCard({ episode, onRegisterIntake, onOpenDetail }: Props) {
  return (
    <section className="flex flex-col gap-4 rounded-card-lg border border-border-strong bg-surface-2 p-[18px]">
      <button type="button" onClick={onOpenDetail} className="flex items-center gap-3 text-left">
        <IntensityBadge intensity={episode.intensity} />
        <div className="flex flex-1 flex-col gap-px">
          <h2 className="text-heading text-text">Recién registrada</h2>
          <span className="text-body text-text-2">
            Empezó a las {formatTime(episode.startedAt)} · {formatElapsedSince(episode.startedAt)}
          </span>
        </div>
        <svg width="9" height="16" viewBox="0 0 9 16" fill="none" aria-hidden="true">
          <path d="M1.5 1.5L7 8l-5.5 6.5" stroke="var(--text-2)" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      <button
        type="button"
        onClick={onRegisterIntake}
        className="flex h-[58px] items-center justify-center rounded-[17px] bg-accent"
      >
        <span className="text-heading text-on-accent">Registrar una toma</span>
      </button>
    </section>
  );
}
