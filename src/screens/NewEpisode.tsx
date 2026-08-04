/**
 * Registrar episodio — RF-01 a RF-10.
 *
 * El orden de los campos no es casual: el objetivo del PRD es guardar en menos
 * de 60 segundos, con dolor de cabeza. Por eso arriba de todo va lo único
 * obligatorio (intensidad y cuándo empezó, RF-10) y el botón de guardar queda
 * fijo abajo, sin scroll. Todo lo demás está más abajo y dice "opcional".
 */

import { useState } from 'react';
import type {
  AuraType,
  Disability,
  EpisodeLocation,
  EpisodeType,
  Intensity,
  NewEpisode as NewEpisodeData,
  Symptom,
} from '../types';
import { createEpisode } from '../db/queries';
import {
  dateTimeLocalInputToIso,
  isValidDateTimeLocalInput,
  isoToDateTimeLocalInput,
  nowIso,
} from '../lib/dates';
import {
  AURA_TYPE_LABELS,
  AURA_TYPE_ORDER,
  DISABILITY_LABELS,
  DISABILITY_ORDER,
  EPISODE_TYPE_LABELS,
  EPISODE_TYPE_ORDER,
  LOCATION_LABELS,
  LOCATION_ORDER,
  SYMPTOM_LABELS,
  SYMPTOM_ORDER,
} from '../lib/labels';
import { Field } from '../components/Field';
import { IntensityPicker } from '../components/IntensityPicker';
import { OptionButton } from '../components/OptionButton';

/** Agrega o saca un valor de una lista, para las selecciones múltiples. */
function toggleInList<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

const INPUT_CLASS =
  'min-h-target w-full rounded-chip border border-border bg-surface px-4 py-3 text-body text-text';

interface Props {
  onCancel: () => void;
  onSaved: () => void;
}

export function NewEpisode({ onCancel, onSaved }: Props) {
  // RF-02: la fecha y hora vienen precargadas con "ahora" y se pueden cambiar.
  const [startedAt, setStartedAt] = useState(() => isoToDateTimeLocalInput(nowIso()));
  const [stillOngoing, setStillOngoing] = useState(true);
  const [endedAt, setEndedAt] = useState(() => isoToDateTimeLocalInput(nowIso()));

  const [intensity, setIntensity] = useState<Intensity | null>(null);
  const [type, setType] = useState<EpisodeType>('unknown');
  const [location, setLocation] = useState<EpisodeLocation | null>(null);
  const [hasAura, setHasAura] = useState(false);
  const [auraTypes, setAuraTypes] = useState<AuraType[]>([]);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [disability, setDisability] = useState<Disability>(0);
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startedAtIsValid = isValidDateTimeLocalInput(startedAt);
  const endedAtIsValid = stillOngoing || isValidDateTimeLocalInput(endedAt);
  const endedAfterStart =
    stillOngoing || !startedAtIsValid || !endedAtIsValid || endedAt >= startedAt;

  const canSave =
    startedAtIsValid && endedAtIsValid && endedAfterStart && intensity !== null && !saving;

  async function handleSave() {
    if (intensity === null || !canSave) return;

    setSaving(true);
    setError(null);

    const episode: NewEpisodeData = {
      startedAt: dateTimeLocalInputToIso(startedAt),
      endedAt: stillOngoing ? null : dateTimeLocalInputToIso(endedAt),
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
      await createEpisode(episode);
      onSaved();
    } catch (caught: unknown) {
      // Error visible: el usuario tiene que enterarse de que no se guardó
      // (CLAUDE.md §5). Nunca un catch mudo.
      setError(
        caught instanceof Error
          ? `No se pudo guardar el episodio: ${caught.message}`
          : 'No se pudo guardar el episodio.',
      );
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-bg">
      <header
        className="flex flex-none items-center justify-between gap-3 border-b border-hairline px-5 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <h1 className="text-heading text-text">Nuevo episodio</h1>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-target px-2 text-body font-semibold text-accent"
        >
          Cancelar
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-5 py-6">
        <Field label="¿Qué tan fuerte?" hint="Es lo único que hace falta, además de la hora.">
          <IntensityPicker value={intensity} onChange={setIntensity} />
        </Field>

        <Field label="¿Cuándo empezó?">
          <input
            type="datetime-local"
            value={startedAt}
            onChange={(event) => setStartedAt(event.target.value)}
            className={INPUT_CLASS}
            aria-label="Fecha y hora de inicio"
          />
        </Field>

        <Field label="¿Todavía te duele?">
          <div className="grid grid-cols-2 gap-2">
            <OptionButton selected={stillOngoing} onClick={() => setStillOngoing(true)}>
              Sí, sigue
            </OptionButton>
            <OptionButton selected={!stillOngoing} onClick={() => setStillOngoing(false)}>
              Ya se me pasó
            </OptionButton>
          </div>
          {!stillOngoing && (
            <input
              type="datetime-local"
              value={endedAt}
              onChange={(event) => setEndedAt(event.target.value)}
              className={INPUT_CLASS}
              aria-label="Fecha y hora de fin"
            />
          )}
          {!endedAfterStart && (
            <p className="text-body text-danger">
              La hora de fin no puede ser anterior a la de inicio.
            </p>
          )}
        </Field>

        <Field label="¿Qué tipo?" hint="«No sé» es una respuesta válida.">
          <div className="grid grid-cols-3 gap-2">
            {EPISODE_TYPE_ORDER.map((option) => (
              <OptionButton key={option} selected={type === option} onClick={() => setType(option)}>
                {EPISODE_TYPE_LABELS[option]}
              </OptionButton>
            ))}
          </div>
        </Field>

        <Field label="¿Dónde te dolía?" optional>
          <div className="grid grid-cols-2 gap-2">
            {LOCATION_ORDER.map((option) => (
              <OptionButton
                key={option}
                selected={location === option}
                onClick={() => setLocation(location === option ? null : option)}
              >
                {LOCATION_LABELS[option]}
              </OptionButton>
            ))}
          </div>
        </Field>

        <Field label="¿Tuviste aura?" optional>
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
            <div className="grid grid-cols-2 gap-2">
              {AURA_TYPE_ORDER.map((option) => (
                <OptionButton
                  key={option}
                  selected={auraTypes.includes(option)}
                  onClick={() => setAuraTypes(toggleInList(auraTypes, option))}
                >
                  {AURA_TYPE_LABELS[option]}
                </OptionButton>
              ))}
            </div>
          )}
        </Field>

        <Field label="Otros síntomas" optional hint="Podés marcar varios.">
          <div className="grid grid-cols-2 gap-2">
            {SYMPTOM_ORDER.map((option) => (
              <OptionButton
                key={option}
                selected={symptoms.includes(option)}
                onClick={() => setSymptoms(toggleInList(symptoms, option))}
              >
                {SYMPTOM_LABELS[option]}
              </OptionButton>
            ))}
          </div>
        </Field>

        <Field label="¿Cuánto te afectó el día?" optional>
          <div className="flex flex-col gap-2">
            {DISABILITY_ORDER.map((option) => (
              <OptionButton
                key={option}
                selected={disability === option}
                onClick={() => setDisability(option)}
              >
                {DISABILITY_LABELS[option]}
              </OptionButton>
            ))}
          </div>
        </Field>

        <Field label="Notas" optional>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            className={`${INPUT_CLASS} resize-y`}
            placeholder="Lo que quieras anotar."
          />
        </Field>
      </div>

      <div className="flex flex-none flex-col gap-2 border-t border-hairline bg-bg px-5 pb-3.5 pt-3">
        {error !== null && <p className="text-body text-danger">{error}</p>}
        {intensity === null && (
          <p className="text-body text-text-2">Elegí una intensidad para poder guardar.</p>
        )}
        <button
          type="button"
          disabled={!canSave}
          onClick={() => void handleSave()}
          className="flex h-[66px] w-full items-center justify-center rounded-card bg-accent shadow-2 disabled:opacity-40 disabled:shadow-none"
        >
          <span className="text-[21px] font-semibold text-on-accent">
            {saving ? 'Guardando…' : 'Guardar episodio'}
          </span>
        </button>
      </div>
    </div>
  );
}
