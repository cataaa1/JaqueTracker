/**
 * Historial — RF-11: los episodios en orden cronológico inverso.
 *
 * Se traen de a tandas y no todos juntos: el PRD acepta paginación o scroll, y
 * con años de registro cargar todo de una haría esperar de más al abrir.
 *
 * Editar, borrar y ver el detalle de un episodio son RF-13, RF-14 y RF-15:
 * fase 4. Por eso las filas todavía no se pueden tocar.
 */

import { useCallback, useState } from 'react';
import type { Episode } from '../types';
import { listRecentEpisodes } from '../db/queries';
import { useDbData } from '../hooks/useDbData';
import { EpisodeRow } from '../components/EpisodeRow';

const PAGE_SIZE = 30;

export function History() {
  const [limit, setLimit] = useState(PAGE_SIZE);

  // `useCallback` con `limit` como dependencia: cada vez que se pide más, la
  // función cambia y el hook vuelve a leer sola.
  const load = useCallback((): Promise<Episode[]> => listRecentEpisodes(limit), [limit]);
  const { state } = useDbData(load);

  const reachedEnd = state.status === 'ready' && state.data.length < limit;

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-6"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
      >
        <h1 className="text-title text-text">Historial</h1>

        {state.status === 'loading' && <p className="text-body text-text-2">Cargando…</p>}

        {state.status === 'error' && (
          <p className="rounded-card border border-danger bg-surface p-[18px] text-body text-danger">
            No se pudo leer el historial: {state.message}
          </p>
        )}

        {state.status === 'ready' && state.data.length === 0 && (
          <p className="rounded-card border border-border bg-surface p-5 text-body text-text-2">
            Todavía no registraste ningún episodio.
          </p>
        )}

        {state.status === 'ready' && state.data.length > 0 && (
          <>
            <ul className="flex flex-col gap-2">
              {state.data.map((episode) => (
                <EpisodeRow key={episode.id} episode={episode} />
              ))}
            </ul>

            {!reachedEnd && (
              <button
                type="button"
                onClick={() => setLimit(limit + PAGE_SIZE)}
                className="min-h-target rounded-btn border border-border-strong px-4 text-body font-semibold text-accent"
              >
                Mostrar más
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
