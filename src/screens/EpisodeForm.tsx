/**
 * Crear y editar un episodio — RF-01 a RF-10 y RF-13.
 *
 * Es un solo formulario para las dos cosas: si viene un `episodeId`, carga el
 * episodio y lo modifica; si no, crea uno nuevo. Editando aparece además el
 * botón de eliminar (RF-14).
 *
 * El orden de los campos es el de la maqueta. Lo único obligatorio para guardar
 * es la hora de inicio —que ya viene puesta— y la intensidad (RF-10); el botón
 * de abajo lo dice con todas las letras mientras falte elegirla.
 *
 * TRES CAMPOS SIN CONTROL, POR DECISIÓN DEL PROPIETARIO DEL PRODUCTO
 *
 * `endedAt`, `location` y `disability` siguen en el modelo de datos y en la
 * base, pero ya no se piden en pantalla. Eso deja fuera RF-07 (discapacidad) y
 * RF-08 (cerrar el episodio), y con ellos dos items de la especificación del
 * reporte: la duración de los episodios y los días con discapacidad grado 2 o 3.
 *
 * Los valores YA GUARDADOS se conservan tal cual al editar: el formulario los
 * lee y los vuelve a escribir sin tocarlos. Editar un episodio viejo no le borra
 * la discapacidad que tenía cargada. Si algún día se decide volver atrás,
 * alcanza con reponer los controles: no hay datos perdidos ni migración que
 * hacer.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  AuraType,
  Disability,
  Episode,
  EpisodeLocation,
  EpisodeType,
  Intensity,
  NewEpisode,
  Symptom,
} from '../types';
import { createEpisode, getEpisode, updateEpisode } from '../db/queries';
import {
  dateTimeLocalInputToIso,
  isValidDateTimeLocalInput,
  isoToDateTimeLocalInput,
  nowIso,
} from '../lib/dates';
import {
  AURA_TYPE_LABELS,
  AURA_TYPE_ORDER,
  EPISODE_TYPE_LABELS,
  EPISODE_TYPE_ORDER,
  SYMPTOM_LABELS,
  SYMPTOM_ORDER,
} from '../lib/labels';
import { useDbData } from '../hooks/useDbData';
import { IntensityPicker } from '../components/IntensityPicker';
import { OptionButton } from '../components/OptionButton';

function toggleInList<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

const INPUT_CLASS =
  'min-h-[56px] w-full rounded-[16px] border border-border bg-surface px-4 text-body text-text';

interface Props {
  /** `null` para crear uno nuevo. */
  episodeId: string | null;
  onCancel: () => void;
  onSaved: (episodeId: string) => void;
  onRequestDelete: () => void;
}

export function EpisodeForm({ episodeId, onCancel, onSaved, onRequestDelete }: Props) {
  const load = useCallback(
    (): Promise<Episode | undefined> =>
      episodeId === null ? Promise.resolve(undefined) : getEpisode(episodeId),
    [episodeId],
  );
  const { state } = useDbData(load);

  const [startedAt, setStartedAt] = useState(() => isoToDateTimeLocalInput(nowIso()));
  const [intensity, setIntensity] = useState<Intensity | null>(null);
  const [type, setType] = useState<EpisodeType>('unknown');
  const [hasAura, setHasAura] = useState(false);
  const [auraTypes, setAuraTypes] = useState<AuraType[]>([]);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [notes, setNotes] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);

  // Sin control en pantalla: se arrastran tal como estaban guardados. Ver el
  // comentario del encabezado del archivo.
  const [endedAt, setEndedAt] = useState<string | null>(null);
  const [location, setLocation] = useState<EpisodeLocation | null>(null);
  const [disability, setDisability] = useState<Disability>(0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cuando termina de leerse el episodio que se edita, se vuelcan sus valores.
  useEffect(() => {
    if (state.status !== 'ready' || state.data === undefined) return;
    const episode = state.data;
    setStartedAt(isoToDateTimeLocalInput(episode.startedAt));
    setIntensity(episode.intensity);
    setType(episode.type);
    setHasAura(episode.hasAura);
    setAuraTypes(episode.auraTypes);
    setSymptoms(episode.symptoms);
    setNotes(episode.notes);
    setNotesOpen(episode.notes !== '');
    setEndedAt(episode.endedAt);
    setLocation(episode.location);
    setDisability(episode.disability);
  }, [state]);

  const startedAtIsValid = isValidDateTimeLocalInput(startedAt);
  const canSave = startedAtIsValid && intensity !== null && !saving;

  async function handleSave() {
    if (intensity === null || !canSave) return;

    setSaving(true);
    setError(null);

    const data: NewEpisode = {
      startedAt: dateTimeLocalInputToIso(startedAt),
      endedAt,
      type,
      intensity,
      location,
      hasAura,
      auraTypes: hasAura ? auraTypes : [],
      symptoms,
      disability,
      notes: notes.trim(),
    };

    try {
      if (episodeId === null) {
        const id = await createEpisode(data);
        onSaved(id);
      } else {
        await updateEpisode(episodeId, data);
        onSaved(episodeId);
      }
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? `No se pudo guardar el episodio: ${caught.message}`
          : 'No se pudo guardar el episodio.',
      );
      setSaving(false);
    }
  }

  const isEditing = episodeId !== null;

  return (
    <div className="flex h-full flex-col bg-bg">
      <header
        className="flex flex-none items-center gap-1 px-3 pb-2"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Volver"
          className="flex h-12 w-12 items-center justify-center rounded-btn"
        >
          <svg width="11" height="20" viewBox="0 0 11 20" fill="none" aria-hidden="true">
            <path d="M8.5 1.5L2 10l6.5 8.5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <h1 className="text-[21px] font-semibold text-text">
          {isEditing ? 'Editar episodio' : 'Nuevo episodio'}
        </h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 pb-4 pt-2">
        {state.status === 'error' && (
          <p className="rounded-card border border-danger bg-surface p-[18px] text-body text-danger">
            No se pudo leer el episodio: {state.message}
          </p>
        )}

        <Group label="Empezó">
          <input
            type="datetime-local"
            value={startedAt}
            onChange={(event) => setStartedAt(event.target.value)}
            className={INPUT_CLASS}
            aria-label="Fecha y hora de inicio"
          />
        </Group>

        <Group label="Intensidad">
          <IntensityPicker value={intensity} onChange={setIntensity} />
        </Group>

        <Group label="Tipo">
          <div className="grid grid-cols-3 gap-2">
            {EPISODE_TYPE_ORDER.map((option) => (
              <OptionButton key={option} selected={type === option} onClick={() => setType(option)}>
                {EPISODE_TYPE_LABELS[option]}
              </OptionButton>
            ))}
          </div>
        </Group>

        <Group label="¿Tuviste aura?">
          <div className="grid grid-cols-2 gap-2">
            <OptionButton selected={hasAura} onClick={() => setHasAura(true)}>
              Sí
            </OptionButton>
            <OptionButton
              selected={!hasAura}
              onClick={() => {
                setHasAura(false);
                setAuraTypes([]);
              }}
            >
              No
            </OptionButton>
          </div>
          {hasAura && (
            <div className="flex flex-wrap gap-2 pt-1">
              {AURA_TYPE_ORDER.map((option) => (
                <OptionButton
                  key={option}
                  variant="pill"
                  selected={auraTypes.includes(option)}
                  onClick={() => setAuraTypes(toggleInList(auraTypes, option))}
                >
                  {AURA_TYPE_LABELS[option]}
                </OptionButton>
              ))}
            </div>
          )}
        </Group>

        <Group label="Síntomas">
          <div className="flex flex-wrap gap-2">
            {SYMPTOM_ORDER.map((option) => (
              <OptionButton
                key={option}
                variant="pill"
                selected={symptoms.includes(option)}
                onClick={() => setSymptoms(toggleInList(symptoms, option))}
              >
                {SYMPTOM_LABELS[option]}
              </OptionButton>
            ))}
          </div>
        </Group>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => setNotesOpen(!notesOpen)}
            aria-expanded={notesOpen}
            className="flex min-h-[52px] items-center gap-2.5 rounded-[16px] border border-border px-4"
          >
            <span className="flex-1 text-left text-[17px] text-text">Notas</span>
            <span className="text-body text-text-2">
              {notes !== '' ? 'escritas' : notesOpen ? 'abrir/cerrar' : 'opcional'}
            </span>
          </button>
          {notesOpen && (
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Lo que quieras acordarte."
              className="resize-none rounded-[16px] border border-border bg-surface px-4 py-3.5 text-body leading-relaxed text-text"
            />
          )}
        </div>

        {isEditing && (
          <button
            type="button"
            onClick={onRequestDelete}
            className="flex min-h-[56px] items-center justify-center rounded-[16px] border border-border"
          >
            <span className="text-[17px] font-semibold text-danger">Eliminar este episodio</span>
          </button>
        )}
      </div>

      <div className="flex flex-none flex-col gap-2 border-t border-border bg-bg px-5 pb-3.5 pt-3">
        {error !== null && <p className="text-body text-danger">{error}</p>}
        <button
          type="button"
          disabled={!canSave}
          onClick={() => void handleSave()}
          className={[
            'flex h-[66px] w-full items-center justify-center rounded-card border',
            canSave
              ? 'border-accent bg-accent shadow-2'
              : 'border-border bg-surface',
          ].join(' ')}
        >
          <span
            className={`text-[21px] font-semibold ${canSave ? 'text-on-accent' : 'text-text-2'}`}
          >
            {saving ? 'Guardando…' : canSave ? 'Guardar' : 'Elegí la intensidad'}
          </span>
        </button>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h2 className="text-body font-semibold text-text">{label}</h2>
      {children}
    </div>
  );
}
