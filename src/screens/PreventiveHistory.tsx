/**
 * Marcar preventivos de días anteriores — RF-20.
 *
 * La maqueta no cubre esta pantalla, pero el requisito existe y sin ella la
 * adherencia que va al reporte queda con agujeros cada vez que te olvidás de
 * abrir la app. Sigue el mismo lenguaje visual que "Preventivo de hoy".
 *
 * Se muestran las dos últimas semanas y nada más: más atrás la memoria ya no
 * distingue un martes de otro, y un dato inventado es peor que un dato faltante.
 */

import { useCallback, useState } from 'react';
import { eachDayOfInterval, subDays } from 'date-fns';
import type { Medication, PreventiveLog } from '../types';
import { listActiveMedications, listPreventiveLogsBetween, setPreventiveTaken } from '../db/queries';
import { formatDayHeader, localDayKey } from '../lib/dates';
import { isPreventiveTaken } from '../lib/medications';
import { useDbData } from '../hooks/useDbData';

const DAYS_BACK = 13;

interface Data {
  preventives: Medication[];
  logs: PreventiveLog[];
}

interface Props {
  onBack: () => void;
}

export function PreventiveHistory({ onBack }: Props) {
  const load = useCallback(async (): Promise<Data> => {
    const now = new Date();
    const [active, logs] = await Promise.all([
      listActiveMedications(),
      listPreventiveLogsBetween(localDayKey(subDays(now, DAYS_BACK)), localDayKey(now)),
    ]);
    return {
      preventives: active.filter((medication) => medication.kind === 'preventive'),
      logs,
    };
  }, []);

  const { state, reload } = useDbData(load);
  const [error, setError] = useState<string | null>(null);

  async function toggle(medicationId: string, dayKey: string, taken: boolean) {
    setError(null);
    try {
      await setPreventiveTaken(medicationId, dayKey, taken);
      reload();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar la marca.');
    }
  }

  const now = new Date();
  // Del día de hoy hacia atrás: lo más probable es que estés completando ayer.
  const days = eachDayOfInterval({ start: subDays(now, DAYS_BACK), end: now }).reverse();

  return (
    <div className="flex h-full flex-col bg-bg">
      <header
        className="flex flex-none items-center gap-1 px-3 pb-2"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Volver"
          className="flex h-12 w-12 items-center justify-center rounded-btn"
        >
          <svg width="11" height="20" viewBox="0 0 11 20" fill="none" aria-hidden="true">
            <path d="M8.5 1.5L2 10l6.5 8.5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <h1 className="text-[21px] font-semibold text-text">Días anteriores</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-6 pt-2">
        {state.status === 'loading' && <p className="text-body text-text-2">Cargando…</p>}

        {state.status === 'error' && (
          <p className="rounded-card border border-danger bg-surface p-[18px] text-body text-danger">
            No se pudo leer la adherencia: {state.message}
          </p>
        )}

        {error !== null && (
          <p className="rounded-card border border-danger bg-surface p-[18px] text-body text-danger">
            {error}
          </p>
        )}

        {state.status === 'ready' && state.data.preventives.length === 0 && (
          <p className="rounded-card border border-border bg-surface p-5 text-body text-text-2">
            No tenés preventivos activos. Cargalos en Ajustes → Medicamentos.
          </p>
        )}

        {state.status === 'ready' &&
          state.data.preventives.length > 0 &&
          days.map((day) => {
            const dayKey = localDayKey(day);
            return (
              <section key={dayKey} className="flex flex-col gap-2">
                <h2 className="text-label uppercase text-text-2">{formatDayHeader(day, now)}</h2>
                <div className="flex flex-col gap-2">
                  {state.data.preventives.map((medication) => {
                    const taken = isPreventiveTaken(state.data.logs, medication.id, dayKey);
                    return (
                      <button
                        key={medication.id}
                        type="button"
                        aria-pressed={taken}
                        onClick={() => void toggle(medication.id, dayKey, !taken)}
                        className={[
                          'flex min-h-target items-center gap-3 rounded-row border border-border px-4 py-2.5',
                          taken ? 'bg-surface-2' : 'bg-surface',
                        ].join(' ')}
                      >
                        <span
                          className={`flex-1 text-left text-body ${taken ? 'text-text-2' : 'text-text'}`}
                        >
                          {medication.name}
                        </span>
                        <span
                          className="text-body font-semibold"
                          style={{ color: taken ? 'var(--accent)' : 'var(--text-2)' }}
                        >
                          {taken ? 'Tomado' : 'Sin marcar'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
}
