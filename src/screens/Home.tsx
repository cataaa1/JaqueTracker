/**
 * Inicio — la pantalla de la maqueta, ya completa.
 *
 * Cubre RF-01 (registrar con un toque, botón siempre visible sin scroll),
 * RF-08 (cerrar el episodio en curso), RF-17 y RF-18 (tomas y alivio),
 * RF-19 (marcar el preventivo del día), RF-21 (contador de días con
 * analgésicos) y RF-22 (aviso al superar los 10 días).
 *
 * Lo único que falta de la maqueta es el saludo "Hola, Ana": necesita el nombre
 * del paciente, que se carga en Ajustes y llega en la fase 7. Hasta entonces el
 * encabezado dice "Jaque Tracker", igual que el estado de primer uso.
 *
 * Este archivo es largo, pero hace una sola cosa: leer el estado de hoy y
 * componer las tarjetas. Todo lo que dibuja está en `components/` y todo lo que
 * calcula, en `lib/`.
 */

import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { endOfMonth, startOfMonth, subDays, subMonths } from 'date-fns';
import type { Episode, Intake, Medication, PreventiveLog, ReliefLevel } from '../types';
import {
  closeEpisode,
  countEpisodes,
  listActiveMedications,
  listEpisodesStartedBetween,
  listIntakesTakenBetween,
  listOngoingEpisodes,
  listPreventiveLogsBetween,
  listRecentEpisodes,
  setIntakeRelief,
  setPreventiveTaken,
} from '../db/queries';
import {
  countEpisodesInMonth,
  countHeadacheDaysInMonth,
  findOngoingEpisode,
} from '../lib/episodes';
import {
  countRescueDaysInMonth,
  findIntakesAwaitingRelief,
  intakesOnDay,
  isPreventiveTaken,
  rescueDaysWarning,
} from '../lib/medications';
import { formatMonthName, formatTodayHeader, localDayKey, nowIso } from '../lib/dates';
import { useDbData } from '../hooks/useDbData';
import { EpisodeRow } from '../components/EpisodeRow';
import { MedicationCard } from '../components/MedicationCard';
import { OngoingEpisodeCard } from '../components/OngoingEpisodeCard';
import { PreventiveRow } from '../components/PreventiveRow';

interface HomeData {
  recent: Episode[];
  recentIntakes: Intake[];
  headacheDays: number;
  episodesThisMonth: number;
  rescueDays: number;
  totalEpisodes: number;
  ongoing: Episode | null;
  medications: Medication[];
  monthIntakes: Intake[];
  todayIntakes: Intake[];
  awaitingRelief: Intake[];
  preventiveLogs: PreventiveLog[];
}

async function loadHomeData(): Promise<HomeData> {
  const now = new Date();

  // Se pide desde el mes anterior para no perder un episodio que arrancó a fin
  // del mes pasado y sigue abierto: cuenta días de este mes igual.
  const episodesFrom = startOfMonth(subMonths(now, 1)).toISOString();
  const monthFrom = startOfMonth(now).toISOString();
  const monthTo = endOfMonth(now).toISOString();

  const [
    recent,
    monthWindow,
    totalEpisodes,
    ongoingList,
    medications,
    monthIntakes,
    recentIntakes,
    preventiveLogs,
  ] = await Promise.all([
    listRecentEpisodes(3),
    listEpisodesStartedBetween(episodesFrom, monthTo),
    countEpisodes(),
    listOngoingEpisodes(),
    listActiveMedications(),
    listIntakesTakenBetween(monthFrom, monthTo),
    // Tres días alcanzan para las tomas de hoy y para las que esperan respuesta
    // de alivio, que se dejan de preguntar a las 48 horas.
    listIntakesTakenBetween(subDays(now, 3).toISOString(), now.toISOString()),
    listPreventiveLogsBetween(localDayKey(now), localDayKey(now)),
  ]);

  return {
    recent,
    recentIntakes,
    headacheDays: countHeadacheDaysInMonth(monthWindow, now, now),
    episodesThisMonth: countEpisodesInMonth(monthWindow, now),
    rescueDays: countRescueDaysInMonth(monthIntakes, medications, now),
    totalEpisodes,
    ongoing: findOngoingEpisode(ongoingList),
    medications,
    monthIntakes,
    todayIntakes: intakesOnDay(recentIntakes, now),
    awaitingRelief: findIntakesAwaitingRelief(recentIntakes, now),
    preventiveLogs,
  };
}

interface Props {
  onRegisterEpisode: () => void;
  onRegisterIntake: (episodeId: string | null) => void;
  onAddMedication: () => void;
  onSelectEpisode: (episodeId: string) => void;
  onOpenPreventiveHistory: () => void;
}

export function Home({
  onRegisterEpisode,
  onRegisterIntake,
  onAddMedication,
  onSelectEpisode,
  onOpenPreventiveHistory,
}: Props) {
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
  const today = localDayKey(now);

  if (state.status === 'loading') {
    return <CenteredMessage>Cargando…</CenteredMessage>;
  }

  if (state.status === 'error') {
    return (
      <CenteredMessage tone="danger">
        No se pudieron leer los datos: {state.message}
      </CenteredMessage>
    );
  }

  const data = state.data;
  const hasEpisodes = data.totalEpisodes > 0;
  const preventives = data.medications.filter((m) => m.kind === 'preventive');
  const hasRescue = data.medications.some((m) => m.kind === 'rescue');
  const warning = rescueDaysWarning(data.rescueDays);
  const ongoing = data.ongoing;

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
      >
        <header className="flex flex-col gap-0.5">
          <span className="text-body text-text-2">{formatTodayHeader(now)}</span>
          <h1 className="text-title text-text">Jaque Tracker</h1>
        </header>

        {actionError !== null && (
          <p className="rounded-card border border-danger bg-surface p-[18px] text-body text-danger">
            {actionError}
          </p>
        )}

        {ongoing !== null && (
          <OngoingEpisodeCard
            episode={ongoing}
            onClose={() =>
              void runAction(
                () => closeEpisode(ongoing.id, nowIso()),
                'No se pudo cerrar el episodio.',
              )
            }
            onRegisterIntake={() => onRegisterIntake(ongoing.id)}
          />
        )}

        {hasEpisodes && (
          <section className="flex flex-col gap-3.5 rounded-card border border-border bg-surface p-[18px] shadow-1">
            <h2 className="text-label uppercase text-text-2">{formatMonthName(now)}</h2>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-display tabular-nums text-text">{data.headacheDays}</span>
                <span className="text-body text-text-2" style={{ textWrap: 'pretty' }}>
                  {data.headacheDays === 1 ? 'día con cefalea' : 'días con cefalea'}
                </span>
                {/* El conteo de episodios explica por qué tres cefaleas en un
                    mismo día cuentan como un solo día. */}
                <span className="text-body text-text-2">
                  {data.episodesThisMonth === 1
                    ? '1 episodio'
                    : `${data.episodesThisMonth} episodios`}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 border-l border-border pl-3.5">
                <span className="text-display tabular-nums text-text">{data.rescueDays}</span>
                <span className="text-body text-text-2" style={{ textWrap: 'pretty' }}>
                  {data.rescueDays === 1 ? 'día con analgésicos' : 'días con analgésicos'}
                </span>
              </div>
            </div>

            {warning !== null && (
              <div className="flex items-start gap-3 border-t border-border pt-3.5">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 22 22"
                  fill="none"
                  aria-hidden="true"
                  className="mt-px flex-none"
                >
                  <circle cx="11" cy="11" r="8.6" stroke="var(--text-2)" strokeWidth="1.7" />
                  <path
                    d="M11 7.2v.2M11 10v4.6"
                    stroke="var(--text-2)"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </svg>
                <p className="text-body text-text" style={{ textWrap: 'pretty' }}>
                  {warning}
                </p>
              </div>
            )}
          </section>
        )}

        {!hasEpisodes && (
          <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5">
            <h2 className="text-heading text-text">Todavía no hay episodios</h2>
            <p className="text-body text-text-2" style={{ textWrap: 'pretty' }}>
              Cuando te agarre un dolor de cabeza, tocá el botón de abajo. Alcanza con la
              hora y la intensidad; el resto es opcional.
            </p>
          </section>
        )}

        <section className="flex flex-col gap-2.5">
          <h2 className="text-body font-semibold text-text">Preventivo de hoy</h2>
          {preventives.length === 0 ? (
            <div className="flex min-h-[76px] items-center gap-3.5 rounded-row border border-dashed border-border-strong bg-surface-2 p-4">
              <p className="flex-1 text-body text-text-2" style={{ textWrap: 'pretty' }}>
                Si tomás algún preventivo a diario, cargalo para llevar la cuenta.
              </p>
              <button
                type="button"
                onClick={onAddMedication}
                className="h-12 min-w-[96px] rounded-btn border border-accent px-3.5 text-[17px] font-semibold text-accent"
              >
                Cargar
              </button>
            </div>
          ) : (
            <>
              {preventives.map((medication) => {
                const taken = isPreventiveTaken(data.preventiveLogs, medication.id, today);
                return (
                  <PreventiveRow
                    key={medication.id}
                    medication={medication}
                    taken={taken}
                    onToggle={() =>
                      void runAction(
                        () => setPreventiveTaken(medication.id, today, !taken),
                        'No se pudo guardar la marca.',
                      )
                    }
                  />
                );
              })}
              <button
                type="button"
                onClick={onOpenPreventiveHistory}
                className="min-h-target self-start px-1 text-body font-semibold text-accent"
              >
                Marcar días anteriores
              </button>
            </>
          )}
        </section>

        {(hasRescue || data.todayIntakes.length > 0) && (
          <MedicationCard
            medications={data.medications}
            todayIntakes={data.todayIntakes}
            awaitingRelief={data.awaitingRelief}
            hasRescueMedications={hasRescue}
            onRegisterIntake={() => onRegisterIntake(ongoing?.id ?? null)}
            onAddMedication={onAddMedication}
            onAnswerRelief={(intakeId, relief: ReliefLevel) =>
              void runAction(
                () => setIntakeRelief(intakeId, relief),
                'No se pudo guardar la respuesta.',
              )
            }
          />
        )}

        {data.recent.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <h2 className="text-body font-semibold text-text">Últimos episodios</h2>
            <ul className="flex flex-col gap-2">
              {data.recent.map((episode) => (
                <EpisodeRow
                  key={episode.id}
                  episode={episode}
                  intakeCount={
                    data.recentIntakes.filter((intake) => intake.episodeId === episode.id).length
                  }
                  onSelect={() => onSelectEpisode(episode.id)}
                />
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* RF-01: la acción principal está siempre visible, fuera del scroll.
          Con un episodio abierto pierde el relleno y baja de jerarquía: lo que
          se espera en ese momento es cerrarlo, no abrir otro. */}
      <div className="flex-none border-t border-border bg-bg px-5 pb-3.5 pt-3">
        <button
          type="button"
          onClick={onRegisterEpisode}
          className={[
            'flex h-[66px] w-full items-center justify-center gap-3 rounded-card',
            ongoing === null ? 'bg-accent shadow-2' : 'border border-border bg-surface',
          ].join(' ')}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path
              d="M11 4v14M4 11h14"
              stroke={ongoing === null ? 'var(--on-accent)' : 'var(--text-2)'}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
          <span
            className="text-[21px] font-semibold"
            style={{ color: ongoing === null ? 'var(--on-accent)' : 'var(--text-2)' }}
          >
            {ongoing === null ? 'Registrar episodio' : 'Registrar otro episodio'}
          </span>
        </button>
      </div>
    </div>
  );
}

function CenteredMessage({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: 'muted' | 'danger';
}) {
  return (
    <div
      className="flex h-full flex-col px-5"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}
    >
      <p className={`text-body ${tone === 'danger' ? 'text-danger' : 'text-text-2'}`}>
        {children}
      </p>
    </div>
  );
}
