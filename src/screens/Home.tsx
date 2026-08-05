/**
 * Inicio — la pantalla de la maqueta.
 *
 * Cubre los tres estados que dibuja el diseño: con datos, con un episodio en
 * curso, y el primer uso sin nada cargado.
 *
 * Lo que la maqueta muestra y todavía NO está, porque es de otra fase:
 *   · "Preventivo de hoy" y el contador de días con analgésicos → fase 3
 *     (RF-19 y RF-21), junto con el aviso de RF-22.
 *   · El saludo "Hola, Ana" necesita el nombre del paciente, que se carga en
 *     Ajustes. Hasta que exista, el encabezado dice "Jaque Tracker", igual que
 *     el estado de primer uso de la maqueta.
 *
 * Lo que sí manda el PRD y está: RF-01 (registrar con un toque, botón siempre
 * visible sin scroll), RF-08 (cerrar un episodio en curso), RF-17 (registrar
 * una toma) y RF-18 (responder el alivio a las 2 horas).
 */

import { useCallback, useState } from 'react';
import { endOfMonth, startOfMonth, subDays, subMonths } from 'date-fns';
import type { Episode, Intake, Medication, ReliefLevel } from '../types';
import {
  closeEpisode,
  countEpisodes,
  listActiveMedications,
  listEpisodesStartedBetween,
  listIntakesTakenBetween,
  listOngoingEpisodes,
  listRecentEpisodes,
  setIntakeRelief,
} from '../db/queries';
import { countHeadacheDaysInMonth, findOngoingEpisode } from '../lib/episodes';
import { findIntakesAwaitingRelief, intakesOnDay } from '../lib/medications';
import { formatMonthName, formatTodayHeader, nowIso } from '../lib/dates';
import { useDbData } from '../hooks/useDbData';
import { EpisodeRow } from '../components/EpisodeRow';
import { MedicationCard } from '../components/MedicationCard';
import { OngoingEpisodeCard } from '../components/OngoingEpisodeCard';

interface HomeData {
  recent: Episode[];
  headacheDays: number;
  totalEpisodes: number;
  ongoing: Episode | null;
  medications: Medication[];
  todayIntakes: Intake[];
  awaitingRelief: Intake[];
}

async function loadHomeData(): Promise<HomeData> {
  const now = new Date();

  // Se pide desde el mes anterior para no perder un episodio que arrancó a fin
  // del mes pasado y sigue abierto: cuenta días de este mes igual.
  const from = startOfMonth(subMonths(now, 1)).toISOString();
  const to = endOfMonth(now).toISOString();

  // Tres días alcanzan para las tomas de hoy y para las que todavía esperan
  // respuesta de alivio, que se dejan de preguntar a las 48 horas.
  const intakesFrom = subDays(now, 3).toISOString();

  const [recent, monthWindow, totalEpisodes, ongoingList, medications, intakes] =
    await Promise.all([
      listRecentEpisodes(3),
      listEpisodesStartedBetween(from, to),
      countEpisodes(),
      listOngoingEpisodes(),
      listActiveMedications(),
      listIntakesTakenBetween(intakesFrom, now.toISOString()),
    ]);

  return {
    recent,
    headacheDays: countHeadacheDaysInMonth(monthWindow, now, now),
    totalEpisodes,
    ongoing: findOngoingEpisode(ongoingList),
    medications,
    todayIntakes: intakesOnDay(intakes, now),
    awaitingRelief: findIntakesAwaitingRelief(intakes, now),
  };
}

interface Props {
  onRegisterEpisode: () => void;
  onRegisterIntake: (episodeId: string | null) => void;
  onAddMedication: () => void;
}

export function Home({ onRegisterEpisode, onRegisterIntake, onAddMedication }: Props) {
  const load = useCallback(loadHomeData, []);
  const { state, reload } = useDbData(load);
  const [actionError, setActionError] = useState<string | null>(null);

  async function runAction(action: () => Promise<void>, fallback: string) {
    setActionError(null);
    try {
      await action();
      reload();
    } catch (caught: unknown) {
      setActionError(caught instanceof Error ? caught.message : fallback);
    }
  }

  const now = new Date();
  const hasData = state.status === 'ready' && state.data.totalEpisodes > 0;
  const hasMedications = state.status === 'ready' && state.data.medications.length > 0;
  const hasRescue =
    state.status === 'ready' &&
    state.data.medications.some((medication) => medication.kind === 'rescue');

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex min-h-0 flex-1 flex-col gap-[22px] overflow-y-auto px-5 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
      >
        <header className="flex flex-col gap-0.5">
          <span className="text-body text-text-2">{formatTodayHeader(now)}</span>
          <h1 className="text-title text-text">Jaque Tracker</h1>
        </header>

        {state.status === 'loading' && <p className="text-body text-text-2">Cargando…</p>}

        {state.status === 'error' && (
          <p className="rounded-card border border-danger bg-surface p-[18px] text-body text-danger">
            No se pudieron leer los datos: {state.message}
          </p>
        )}

        {actionError !== null && (
          <p className="rounded-card border border-danger bg-surface p-[18px] text-body text-danger">
            {actionError}
          </p>
        )}

        {state.status === 'ready' && state.data.ongoing !== null && (
          <OngoingEpisodeCard
            episode={state.data.ongoing}
            onClose={() => {
              const id = state.data.ongoing?.id;
              if (id !== undefined) {
                void runAction(
                  () => closeEpisode(id, nowIso()),
                  'No se pudo cerrar el episodio.',
                );
              }
            }}
            onRegisterIntake={() => onRegisterIntake(state.data.ongoing?.id ?? null)}
          />
        )}

        {state.status === 'ready' && hasData && (
          <section className="flex flex-col gap-[14px] rounded-card border border-border bg-surface p-[18px] shadow-1">
            <h2 className="text-label uppercase text-text-2">{formatMonthName(now)}</h2>
            <div className="flex flex-col gap-0.5">
              <span className="text-display tabular-nums text-text">{state.data.headacheDays}</span>
              <span className="text-body text-text-2">
                {state.data.headacheDays === 1 ? 'día con cefalea' : 'días con cefalea'}
              </span>
            </div>
          </section>
        )}

        {state.status === 'ready' && !hasData && (
          <section className="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-5">
            <h2 className="text-heading text-text">Todavía no hay episodios</h2>
            <p className="text-body text-text-2" style={{ textWrap: 'pretty' }}>
              Cuando te agarre un dolor de cabeza, tocá el botón de abajo. Alcanza con la
              hora y la intensidad; el resto es opcional.
            </p>
          </section>
        )}

        {/* La tarjeta de medicación aparece recién cuando hay algo que mostrar:
            en el primer uso sería una caja vacía sin sentido. */}
        {state.status === 'ready' && (hasMedications || state.data.todayIntakes.length > 0) && (
          <MedicationCard
            medications={state.data.medications}
            todayIntakes={state.data.todayIntakes}
            awaitingRelief={state.data.awaitingRelief}
            hasRescueMedications={hasRescue}
            onRegisterIntake={() => onRegisterIntake(state.data.ongoing?.id ?? null)}
            onAddMedication={onAddMedication}
            onAnswerRelief={(intakeId, relief: ReliefLevel) => {
              void runAction(
                () => setIntakeRelief(intakeId, relief),
                'No se pudo guardar la respuesta.',
              );
            }}
          />
        )}

        {state.status === 'ready' && state.data.recent.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <h2 className="text-body font-semibold text-text">Últimos episodios</h2>
            <ul className="flex flex-col gap-2">
              {state.data.recent.map((episode) => (
                <EpisodeRow key={episode.id} episode={episode} />
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* RF-01: la acción principal está siempre visible, fuera del scroll. */}
      <div className="flex-none border-t border-hairline bg-bg px-5 pb-3.5 pt-3">
        <button
          type="button"
          onClick={onRegisterEpisode}
          className="flex h-[66px] w-full items-center justify-center gap-3 rounded-card bg-accent shadow-2"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path d="M11 4v14M4 11h14" stroke="var(--on-accent)" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          <span className="text-[21px] font-semibold text-on-accent">Registrar episodio</span>
        </button>
      </div>
    </div>
  );
}
