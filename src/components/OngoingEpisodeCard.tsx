/**
 * La tarjeta del episodio abierto, tal como la dibuja la maqueta en el estado
 * oscuro: intensidad, cuándo empezó, y los dos botones.
 *
 * "Ya me pasó" cierra el episodio (RF-08). "Registrar una toma" es RF-17: la
 * vía para anotar un analgésico desde el episodio en curso.
 */

import type { Episode } from '../types';
import { formatElapsedSince, formatTime } from '../lib/dates';
import { IntensityBadge } from './IntensityBadge';

interface Props {
  episode: Episode;
  onClose: () => void;
  onRegisterIntake: () => void;
}

export function OngoingEpisodeCard({ episode, onClose, onRegisterIntake }: Props) {
  return (
    <section className="flex flex-col gap-4 rounded-card-lg border border-border-strong bg-surface-2 p-[18px]">
      <div className="flex items-center gap-3">
        <IntensityBadge intensity={episode.intensity} />
        <div className="flex flex-1 flex-col gap-px">
          <h2 className="text-heading text-text">Episodio en curso</h2>
          <span className="text-body text-text-2">
            Empezó a las {formatTime(episode.startedAt)} · {formatElapsedSince(episode.startedAt)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex h-[58px] items-center justify-center rounded-[17px] bg-accent"
        >
          <span className="text-heading text-on-accent">Ya me pasó</span>
        </button>
        <button
          type="button"
          onClick={onRegisterIntake}
          className="flex h-[52px] items-center justify-center rounded-btn border border-border-strong"
        >
          <span className="text-[17px] font-semibold text-accent">Registrar una toma</span>
        </button>
      </div>
    </section>
  );
}
