/**
 * Detalle de un episodio — RF-15, con Editar (RF-13) y Eliminar (RF-14).
 *
 * Muestra todo lo que se registró en el momento, incluidas las tomas
 * vinculadas y qué alivio dieron. Los campos vacíos se muestran con un guion en
 * vez de esconderse: saber que no anotaste un síntoma es distinto de que el
 * campo no exista.
 */

import { useCallback, useState } from 'react';
import type { Episode, Intake, Medication } from '../types';
import {
  deleteEpisodeWithIntakes,
  getEpisode,
  listIntakesForEpisode,
  listMedications,
} from '../db/queries';
import { formatDuration, formatEpisodeLong, formatTime } from '../lib/dates';
import {
  AURA_TYPE_LABELS,
  DISABILITY_LABELS,
  EPISODE_TYPE_LABELS,
  LOCATION_LABELS,
  RELIEF_LABELS,
  SYMPTOM_LABELS,
} from '../lib/labels';
import { findMedication, formatMedication } from '../lib/medications';
import { useDbData } from '../hooks/useDbData';
import { ConfirmDeleteSheet } from '../components/ConfirmDeleteSheet';

interface DetailData {
  episode: Episode | undefined;
  intakes: Intake[];
  medications: Medication[];
}

interface Props {
  episodeId: string;
  /** Abre la pantalla con la confirmación de borrado ya desplegada. Lo usa el
   *  botón "Eliminar este episodio" del formulario de edición. */
  startConfirming?: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}

export function EpisodeDetail({
  episodeId,
  startConfirming = false,
  onBack,
  onEdit,
  onDeleted,
}: Props) {
  const load = useCallback(async (): Promise<DetailData> => {
    const [episode, intakes, medications] = await Promise.all([
      getEpisode(episodeId),
      listIntakesForEpisode(episodeId),
      listMedications(),
    ]);
    return { episode, intakes, medications };
  }, [episodeId]);

  const { state } = useDbData(load);
  const [confirming, setConfirming] = useState(startConfirming);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteEpisodeWithIntakes(episodeId);
      onDeleted();
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? `No se pudo eliminar: ${caught.message}`
          : 'No se pudo eliminar el episodio.',
      );
      setDeleting(false);
      setConfirming(false);
    }
  }

  const episode = state.status === 'ready' ? state.data.episode : undefined;
  const intakes = state.status === 'ready' ? state.data.intakes : [];
  const medications = state.status === 'ready' ? state.data.medications : [];

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
        <h1 className="text-[21px] font-semibold text-text">Episodio</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-5 pb-4 pt-2">
        {state.status === 'loading' && <p className="text-body text-text-2">Cargando…</p>}

        {state.status === 'error' && (
          <p className="rounded-card border border-danger bg-surface p-[18px] text-body text-danger">
            No se pudo leer el episodio: {state.message}
          </p>
        )}

        {error !== null && (
          <p className="rounded-card border border-danger bg-surface p-[18px] text-body text-danger">
            {error}
          </p>
        )}

        {state.status === 'ready' && episode === undefined && (
          <p className="rounded-card border border-border bg-surface p-5 text-body text-text-2">
            Este episodio ya no existe.
          </p>
        )}

        {episode !== undefined && (
          <>
            <div className="flex items-center gap-[14px]">
              <div
                className="flex h-16 w-16 flex-none items-center justify-center rounded-card"
                style={{
                  background: `var(--intensity-${episode.intensity})`,
                  color: `var(--intensity-${episode.intensity}-on)`,
                }}
              >
                <span className="text-[28px] font-semibold tabular-nums">{episode.intensity}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[20px] font-semibold text-text">
                  {formatEpisodeLong(episode.startedAt)}
                </span>
                {/* La duración solo se muestra si el episodio la tiene. Desde
                    que se sacó "¿ya se te pasó?" del formulario los nuevos ya no
                    la registran; los viejos la conservan. */}
                {episode.endedAt !== null && (
                  <span className="text-body text-text-2">
                    Duró {formatDuration(episode.startedAt, episode.endedAt)}
                  </span>
                )}
              </div>
            </div>

            <dl className="overflow-hidden rounded-card border border-border bg-surface">
              <DetailField label="Intensidad" value={`${episode.intensity} de 10`} />
              <DetailField label="Tipo" value={EPISODE_TYPE_LABELS[episode.type]} />
              <DetailField
                label="Aura"
                value={
                  episode.hasAura
                    ? episode.auraTypes.length > 0
                      ? episode.auraTypes.map((type) => AURA_TYPE_LABELS[type]).join(', ')
                      : 'Sí'
                    : 'No'
                }
              />
              <DetailField
                label="Síntomas"
                value={
                  episode.symptoms.length > 0
                    ? episode.symptoms.map((symptom) => SYMPTOM_LABELS[symptom]).join(', ')
                    : '—'
                }
              />
              {/* Dónde y Limitación ya no se piden en el formulario. Se
                  muestran solo si el episodio los tiene cargados, o sea si es
                  anterior al cambio: en los nuevos serían filas siempre vacías. */}
              {episode.location !== null && (
                <DetailField label="Dónde" value={LOCATION_LABELS[episode.location]} />
              )}
              {episode.disability !== 0 && (
                <DetailField label="Limitación" value={DISABILITY_LABELS[episode.disability]} />
              )}
              <DetailField label="Notas" value={episode.notes === '' ? '—' : episode.notes} isLast />
            </dl>

            <section className="flex flex-col gap-2.5">
              <h2 className="text-body font-semibold text-text">Tomas vinculadas</h2>
              {intakes.length === 0 ? (
                <p className="text-body text-text-2">Sin medicación registrada.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {intakes
                    .slice()
                    .sort((a, b) => a.takenAt.localeCompare(b.takenAt))
                    .map((intake) => {
                      const medication = findMedication(medications, intake.medicationId);
                      return (
                        <li
                          key={intake.id}
                          className="flex flex-col gap-0.5 rounded-row border border-border bg-surface px-4 py-3.5"
                        >
                          <span className="text-[17px] font-medium text-text">
                            {medication === undefined
                              ? 'Medicamento no encontrado'
                              : formatMedication(medication)}{' '}
                            · {formatTime(intake.takenAt)}
                          </span>
                          <span className="text-body text-text-2">
                            Alivio:{' '}
                            {intake.relief2h === null
                              ? 'sin responder'
                              : RELIEF_LABELS[intake.relief2h].toLowerCase()}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              )}
            </section>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={onEdit}
                className="flex min-h-[56px] items-center justify-center rounded-btn bg-accent"
              >
                <span className="text-body-lg font-semibold text-on-accent">Editar</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="flex min-h-[56px] items-center justify-center rounded-btn border border-border"
              >
                <span className="text-[17px] font-semibold text-danger">Eliminar</span>
              </button>
            </div>
          </>
        )}
      </div>

      {confirming && (
        <ConfirmDeleteSheet
          linkedIntakes={intakes.length}
          deleting={deleting}
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

function DetailField({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-[14px] px-4 py-3.5 ${isLast ? '' : 'border-b border-border'}`}
    >
      <dt className="w-[104px] flex-none text-body text-text-2">{label}</dt>
      <dd className="flex-1 text-[17px] leading-snug text-text" style={{ textWrap: 'pretty' }}>
        {value}
      </dd>
    </div>
  );
}
