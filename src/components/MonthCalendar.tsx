/**
 * Calendario mensual — RF-12.
 *
 * Cada día con episodios se pinta con el color de la intensidad más alta de ese
 * día, y muestra debajo todas las intensidades separadas por punto. Si hubo más
 * de uno, lleva además una banda inferior con el color del segundo. Así un día
 * con dos episodios no se confunde con uno que tuvo uno solo.
 *
 * Igual que en el resto de la app, el número siempre está escrito: el color
 * acompaña, no informa solo.
 *
 * La semana arranca en lunes, como se usa acá.
 */

import { addMonths, eachDayOfInterval, endOfMonth, getDay, startOfMonth } from 'date-fns';
import type { Episode } from '../types';
import { episodesStartedOnDay } from '../lib/episodes';
import { formatMonthName } from '../lib/dates';

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

interface Props {
  /** Cuántos meses de diferencia con el actual: 0 es este mes, -1 el anterior. */
  monthOffset: number;
  episodes: Episode[];
  onChangeMonth: (offset: number) => void;
  onSelectEpisode: (episodeId: string) => void;
}

export function MonthCalendar({
  monthOffset,
  episodes,
  onChangeMonth,
  onSelectEpisode,
}: Props) {
  const month = addMonths(new Date(), monthOffset);
  const firstDay = startOfMonth(month);
  const days = eachDayOfInterval({ start: firstDay, end: endOfMonth(month) });

  // getDay() devuelve 0 para domingo; esto lo corre para que 0 sea lunes.
  const leadingBlanks = (getDay(firstDay) + 6) % 7;

  const monthHasEpisodes = days.some(
    (day) => episodesStartedOnDay(episodes, day).length > 0,
  );

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChangeMonth(monthOffset - 1)}
          aria-label="Mes anterior"
          className="flex h-12 w-12 items-center justify-center rounded-btn border border-border"
        >
          <svg width="10" height="18" viewBox="0 0 10 18" fill="none" aria-hidden="true">
            <path d="M7.5 1.5L2 9l5.5 7.5" stroke="var(--text)" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
        </button>
        <span className="text-heading text-text">
          {formatMonthName(month)} {month.getFullYear()}
        </span>
        <button
          type="button"
          onClick={() => onChangeMonth(monthOffset + 1)}
          aria-label="Mes siguiente"
          className="flex h-12 w-12 items-center justify-center rounded-btn border border-border"
        >
          <svg width="10" height="18" viewBox="0 0 10 18" fill="none" aria-hidden="true">
            <path d="M2.5 1.5L8 9l-5.5 7.5" stroke="var(--text)" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((label, index) => (
          <span key={index} className="text-center text-label text-text-2">
            {label}
          </span>
        ))}

        {Array.from({ length: leadingBlanks }, (_, index) => (
          <span key={`blank-${index}`} aria-hidden="true" />
        ))}

        {days.map((day) => {
          const dayEpisodes = episodesStartedOnDay(episodes, day);
          const strongest = dayEpisodes[0];
          const second = dayEpisodes[1];

          if (strongest === undefined) {
            return (
              <div
                key={day.toISOString()}
                className="flex h-[46px] items-center justify-center rounded-btn border border-border bg-surface"
              >
                <span className="text-[17px] tabular-nums text-text-2">{day.getDate()}</span>
              </div>
            );
          }

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectEpisode(strongest.id)}
              aria-label={`${day.getDate()}: ${dayEpisodes.length} episodio${dayEpisodes.length === 1 ? '' : 's'}, intensidad ${dayEpisodes.map((e) => e.intensity).join(', ')}`}
              className="flex h-[46px] flex-col items-center justify-center gap-px rounded-btn"
              style={{
                background: `var(--intensity-${strongest.intensity})`,
                color: `var(--intensity-${strongest.intensity}-on)`,
                ...(second === undefined
                  ? {}
                  : { boxShadow: `inset 0 -6px 0 var(--intensity-${second.intensity})` }),
              }}
            >
              <span className="text-[17px] font-semibold tabular-nums">{day.getDate()}</span>
              <span className="text-[11px] font-semibold tabular-nums">
                {dayEpisodes.map((episode) => episode.intensity).join('·')}
              </span>
            </button>
          );
        })}
      </div>

      <p className="border-t border-border pt-3 text-body text-text-2" style={{ textWrap: 'pretty' }}>
        {monthHasEpisodes
          ? 'El número chico es la intensidad. Si hubo más de un episodio, el día se pinta con la más alta, las muestra a las dos y lleva una banda con el color de la segunda.'
          : 'Un mes limpio no dice nada malo: puede que no hayas registrado.'}
      </p>
    </div>
  );
}
