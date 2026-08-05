/**
 * Historial — RF-11 (lista) y RF-12 (calendario).
 *
 * El selector de arriba cambia entre las dos vistas sobre los mismos datos.
 *
 * La lista trae los episodios de a tandas y los separa por mes. El calendario
 * necesita el mes entero de una: son pocos registros, así que se traen todos
 * los del mes que se está mirando.
 */

import { Fragment, useCallback, useState } from 'react';
import { addMonths, endOfMonth, startOfMonth } from 'date-fns';
import type { Episode, Intake } from '../types';
import { listIntakesTakenBetween, listRecentEpisodes, listEpisodesStartedBetween } from '../db/queries';
import { formatMonthAndYear } from '../lib/dates';
import { useDbData } from '../hooks/useDbData';
import { EpisodeRow } from '../components/EpisodeRow';
import { MonthCalendar } from '../components/MonthCalendar';

const PAGE_SIZE = 30;

interface ListData {
  episodes: Episode[];
  intakes: Intake[];
}

interface Props {
  onSelectEpisode: (episodeId: string) => void;
}

export function History({ onSelectEpisode }: Props) {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [monthOffset, setMonthOffset] = useState(0);

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex flex-none flex-col gap-3.5 px-5 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
      >
        <h1 className="text-title text-text">Historial</h1>
        <div
          className="grid grid-cols-2 gap-1 rounded-[16px] border border-border bg-surface-2 p-1"
          role="tablist"
        >
          <SegmentButton label="Lista" active={view === 'list'} onClick={() => setView('list')} />
          <SegmentButton
            label="Calendario"
            active={view === 'calendar'}
            onClick={() => setView('calendar')}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-5 pb-4 pt-1">
        {view === 'list' ? (
          <ListView limit={limit} onShowMore={() => setLimit(limit + PAGE_SIZE)} onSelectEpisode={onSelectEpisode} />
        ) : (
          <CalendarView
            monthOffset={monthOffset}
            onChangeMonth={setMonthOffset}
            onSelectEpisode={onSelectEpisode}
          />
        )}
      </div>
    </div>
  );
}

function SegmentButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'h-11 rounded-chip border text-[17px]',
        active
          ? 'border-border-strong bg-surface font-semibold text-text'
          : 'border-transparent bg-transparent font-medium text-text-2',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function ListView({
  limit,
  onShowMore,
  onSelectEpisode,
}: {
  limit: number;
  onShowMore: () => void;
  onSelectEpisode: (episodeId: string) => void;
}) {
  const load = useCallback(async (): Promise<ListData> => {
    const episodes = await listRecentEpisodes(limit);
    const oldest = episodes[episodes.length - 1];

    // Las tomas solo hacen falta para contar cuántas tiene cada episodio, así
    // que alcanza con las que cubren el rango que se está mostrando.
    const intakes =
      oldest === undefined
        ? []
        : await listIntakesTakenBetween(oldest.startedAt, new Date().toISOString());

    return { episodes, intakes };
  }, [limit]);

  const { state } = useDbData(load);
  const reachedEnd = state.status === 'ready' && state.data.episodes.length < limit;

  if (state.status === 'loading') return <p className="text-body text-text-2">Cargando…</p>;

  if (state.status === 'error') {
    return (
      <p className="rounded-card border border-danger bg-surface p-[18px] text-body text-danger">
        No se pudo leer el historial: {state.message}
      </p>
    );
  }

  if (state.data.episodes.length === 0) {
    return (
      <div className="mt-2 flex flex-col gap-2 rounded-card border border-border bg-surface p-5">
        <h2 className="text-heading text-text">No hay episodios todavía</h2>
        <p className="text-body text-text-2" style={{ textWrap: 'pretty' }}>
          Los que registres van a aparecer acá, del más reciente al más viejo.
        </p>
      </div>
    );
  }

  let lastMonth: string | null = null;

  return (
    <>
      <ul className="flex flex-col gap-2">
        {state.data.episodes.map((episode) => {
          const month = formatMonthAndYear(episode.startedAt);
          const header = month === lastMonth ? null : month;
          lastMonth = month;

          const intakeCount = state.data.intakes.filter(
            (intake) => intake.episodeId === episode.id,
          ).length;

          return (
            <Fragment key={episode.id}>
              {header !== null && (
                <li className="px-0.5 pb-0.5 pt-2.5 text-label uppercase text-text-2">{header}</li>
              )}
              <EpisodeRow
                episode={episode}
                intakeCount={intakeCount}
                onSelect={() => onSelectEpisode(episode.id)}
              />
            </Fragment>
          );
        })}
      </ul>

      {!reachedEnd && (
        <button
          type="button"
          onClick={onShowMore}
          className="mt-2 min-h-target rounded-btn border border-border-strong px-4 text-body font-semibold text-accent"
        >
          Mostrar más
        </button>
      )}
    </>
  );
}

function CalendarView({
  monthOffset,
  onChangeMonth,
  onSelectEpisode,
}: {
  monthOffset: number;
  onChangeMonth: (offset: number) => void;
  onSelectEpisode: (episodeId: string) => void;
}) {
  const load = useCallback((): Promise<Episode[]> => {
    const month = addMonths(new Date(), monthOffset);
    return listEpisodesStartedBetween(
      startOfMonth(month).toISOString(),
      endOfMonth(month).toISOString(),
    );
  }, [monthOffset]);

  const { state } = useDbData(load);

  if (state.status === 'error') {
    return (
      <p className="rounded-card border border-danger bg-surface p-[18px] text-body text-danger">
        No se pudo leer el mes: {state.message}
      </p>
    );
  }

  return (
    <MonthCalendar
      monthOffset={monthOffset}
      episodes={state.status === 'ready' ? state.data : []}
      onChangeMonth={onChangeMonth}
      onSelectEpisode={onSelectEpisode}
    />
  );
}
