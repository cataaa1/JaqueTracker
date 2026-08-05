/**
 * Registrar una toma de analgésico — RF-17.
 *
 * Se llega acá de dos maneras: desde la tarjeta del episodio en curso, o desde
 * la tarjeta de medicación de Inicio sin ningún episodio de por medio. La
 * diferencia es solo si viene un `episodeId` sugerido.
 *
 * Solo lista analgésicos. Marcar la toma diaria de un preventivo es RF-19, de
 * la fase 3, y es otra cosa: no es un evento, es una casilla por día.
 */

import { useCallback, useState } from 'react';
import type { Medication, NewIntake as NewIntakeData } from '../types';
import { createIntake, listActiveMedications } from '../db/queries';
import { dateTimeLocalInputToIso, isValidDateTimeLocalInput, isoToDateTimeLocalInput, nowIso } from '../lib/dates';
import { formatMedication } from '../lib/medications';
import { useDbData } from '../hooks/useDbData';
import { Field } from '../components/Field';
import { OptionButton } from '../components/OptionButton';

const INPUT_CLASS =
  'min-h-target w-full rounded-chip border border-border bg-surface px-4 py-3 text-body text-text';

interface Props {
  /** Episodio al que se sugiere vincular la toma, si hay uno en curso. */
  suggestedEpisodeId: string | null;
  onCancel: () => void;
  onSaved: () => void;
}

export function NewIntake({ suggestedEpisodeId, onCancel, onSaved }: Props) {
  const load = useCallback(async (): Promise<Medication[]> => {
    const active = await listActiveMedications();
    return active.filter((medication) => medication.kind === 'rescue');
  }, []);
  const { state } = useDbData(load);

  const [medicationId, setMedicationId] = useState<string | null>(null);
  const [takenAt, setTakenAt] = useState(() => isoToDateTimeLocalInput(nowIso()));
  const [linkToEpisode, setLinkToEpisode] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si hay un solo analgésico cargado no tiene sentido hacer elegir: se
  // preselecciona y el registro queda en dos toques.
  const medications = state.status === 'ready' ? state.data : [];
  const onlyOption = medications.length === 1 ? medications[0] : undefined;
  const selectedId = medicationId ?? onlyOption?.id ?? null;

  const takenAtIsValid = isValidDateTimeLocalInput(takenAt);
  const canSave = selectedId !== null && takenAtIsValid && !saving;

  async function handleSave() {
    if (selectedId === null || !canSave) return;

    setSaving(true);
    setError(null);

    const intake: NewIntakeData = {
      medicationId: selectedId,
      takenAt: dateTimeLocalInputToIso(takenAt),
      episodeId: suggestedEpisodeId !== null && linkToEpisode ? suggestedEpisodeId : null,
      // El alivio se responde a las 2 horas, no ahora (RF-18).
      relief2h: null,
    };

    try {
      await createIntake(intake);
      onSaved();
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? `No se pudo guardar la toma: ${caught.message}`
          : 'No se pudo guardar la toma.',
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
        <h1 className="text-heading text-text">Registrar una toma</h1>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-target px-2 text-body font-semibold text-accent"
        >
          Cancelar
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-5 py-6">
        {state.status === 'loading' && <p className="text-body text-text-2">Cargando…</p>}

        {state.status === 'error' && (
          <p className="rounded-card border border-danger bg-surface p-[18px] text-body text-danger">
            No se pudieron leer los medicamentos: {state.message}
          </p>
        )}

        {state.status === 'ready' && medications.length === 0 && (
          <p className="rounded-card border border-border bg-surface p-5 text-body text-text-2">
            No tenés ningún analgésico cargado. Andá a Ajustes → Medicamentos y
            cargá uno para poder registrar tomas.
          </p>
        )}

        {medications.length > 0 && (
          <Field label="¿Qué tomaste?">
            <div className="flex flex-col gap-2">
              {medications.map((medication) => (
                <OptionButton
                  key={medication.id}
                  selected={selectedId === medication.id}
                  onClick={() => setMedicationId(medication.id)}
                >
                  {formatMedication(medication)}
                </OptionButton>
              ))}
            </div>
          </Field>
        )}

        {medications.length > 0 && (
          <Field label="¿Cuándo?">
            <input
              type="datetime-local"
              value={takenAt}
              onChange={(event) => setTakenAt(event.target.value)}
              className={INPUT_CLASS}
              aria-label="Fecha y hora de la toma"
            />
          </Field>
        )}

        {medications.length > 0 && suggestedEpisodeId !== null && (
          <Field
            label="¿Fue por el episodio en curso?"
            hint="Vincularla deja el analgésico junto al episodio en el reporte."
          >
            <div className="grid grid-cols-2 gap-2">
              <OptionButton selected={linkToEpisode} onClick={() => setLinkToEpisode(true)}>
                Sí
              </OptionButton>
              <OptionButton selected={!linkToEpisode} onClick={() => setLinkToEpisode(false)}>
                No
              </OptionButton>
            </div>
          </Field>
        )}
      </div>

      <div className="flex flex-none flex-col gap-2 border-t border-hairline bg-bg px-5 pb-3.5 pt-3">
        {error !== null && <p className="text-body text-danger">{error}</p>}
        <button
          type="button"
          disabled={!canSave}
          onClick={() => void handleSave()}
          className="flex h-[58px] w-full items-center justify-center rounded-card bg-accent shadow-2 disabled:opacity-40 disabled:shadow-none"
        >
          <span className="text-heading text-on-accent">
            {saving ? 'Guardando…' : 'Guardar toma'}
          </span>
        </button>
      </div>
    </div>
  );
}
