/**
 * Alta y edición de un medicamento — RF-16.
 *
 * El mismo formulario sirve para los dos casos: si viene un `medicationId`,
 * carga los valores y edita; si no, crea uno nuevo.
 *
 * El horario de los preventivos se reduce a "cuántas veces por día". Cargar las
 * horas concretas no serviría de nada: los recordatorios de toma están fuera de
 * alcance (PRD §9), así que una hora guardada no dispararía nada.
 */

import { useCallback, useEffect, useState } from 'react';
import type {
  Medication,
  MedicationKind,
  MedicationUnit,
  NewMedication,
} from '../types';
import { createMedication, getMedication, updateMedication } from '../db/queries';
import {
  MEDICATION_KIND_LABELS,
  MEDICATION_KIND_ORDER,
  UNIT_LABELS,
  UNIT_ORDER,
} from '../lib/labels';
import { useDbData } from '../hooks/useDbData';
import { Field } from '../components/Field';
import { OptionButton } from '../components/OptionButton';

const TIMES_PER_DAY_OPTIONS = [1, 2, 3, 4];

const INPUT_CLASS =
  'min-h-target w-full rounded-chip border border-border bg-surface px-4 py-3 text-body text-text';

interface Props {
  medicationId: string | null;
  onCancel: () => void;
  onSaved: () => void;
}

export function MedicationForm({ medicationId, onCancel, onSaved }: Props) {
  const load = useCallback(
    (): Promise<Medication | undefined> =>
      medicationId === null ? Promise.resolve(undefined) : getMedication(medicationId),
    [medicationId],
  );
  const { state } = useDbData(load);

  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [unit, setUnit] = useState<MedicationUnit>('mg');
  const [kind, setKind] = useState<MedicationKind>('rescue');
  const [timesPerDay, setTimesPerDay] = useState(1);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cuando termina de leerse el medicamento que se está editando, se vuelcan
  // sus valores en el formulario. En un alta nueva no hay nada que volcar.
  useEffect(() => {
    if (state.status !== 'ready' || state.data === undefined) return;
    const medication = state.data;
    setName(medication.name);
    setDose(String(medication.dose));
    setUnit(medication.unit);
    setKind(medication.kind);
    setTimesPerDay(medication.schedule?.timesPerDay ?? 1);
  }, [state]);

  const parsedDose = Number(dose.replace(',', '.'));
  const doseIsValid = dose.trim() !== '' && Number.isFinite(parsedDose) && parsedDose > 0;
  const nameIsValid = name.trim() !== '';
  const canSave = nameIsValid && doseIsValid && !saving;

  async function handleSave() {
    if (!canSave) return;

    setSaving(true);
    setError(null);

    const medication: NewMedication = {
      name: name.trim(),
      dose: parsedDose,
      unit,
      kind,
      isActive: state.status === 'ready' && state.data !== undefined ? state.data.isActive : true,
      schedule: kind === 'preventive' ? { timesPerDay, times: [] } : null,
    };

    try {
      if (medicationId === null) {
        await createMedication(medication);
      } else {
        await updateMedication(medicationId, medication);
      }
      onSaved();
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? `No se pudo guardar: ${caught.message}`
          : 'No se pudo guardar el medicamento.',
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
        <h1 className="text-heading text-text">
          {medicationId === null ? 'Nuevo medicamento' : 'Editar medicamento'}
        </h1>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-target px-2 text-body font-semibold text-accent"
        >
          Cancelar
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-5 py-6">
        {state.status === 'error' && (
          <p className="rounded-card border border-danger bg-surface p-[18px] text-body text-danger">
            No se pudo leer el medicamento: {state.message}
          </p>
        )}

        <Field label="¿Cómo se llama?">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={INPUT_CLASS}
            placeholder="Ibuprofeno"
            autoComplete="off"
            aria-label="Nombre del medicamento"
          />
        </Field>

        <Field label="¿Qué dosis?">
          <div className="flex flex-col gap-3">
            <input
              type="text"
              inputMode="decimal"
              value={dose}
              onChange={(event) => setDose(event.target.value)}
              className={INPUT_CLASS}
              placeholder="400"
              aria-label="Dosis"
            />
            <div className="grid grid-cols-4 gap-2">
              {UNIT_ORDER.map((option) => (
                <OptionButton key={option} selected={unit === option} onClick={() => setUnit(option)}>
                  <span className="block text-center">{UNIT_LABELS[option]}</span>
                </OptionButton>
              ))}
            </div>
          </div>
        </Field>

        <Field
          label="¿Para qué es?"
          hint="Analgésico es lo que tomás cuando ya te duele. Preventivo, lo que tomás todos los días."
        >
          <div className="grid grid-cols-2 gap-2">
            {MEDICATION_KIND_ORDER.map((option) => (
              <OptionButton key={option} selected={kind === option} onClick={() => setKind(option)}>
                {MEDICATION_KIND_LABELS[option]}
              </OptionButton>
            ))}
          </div>
        </Field>

        {kind === 'preventive' && (
          <Field label="¿Cuántas veces por día?">
            <div className="grid grid-cols-4 gap-2">
              {TIMES_PER_DAY_OPTIONS.map((option) => (
                <OptionButton
                  key={option}
                  selected={timesPerDay === option}
                  onClick={() => setTimesPerDay(option)}
                >
                  <span className="block text-center tabular-nums">{option}</span>
                </OptionButton>
              ))}
            </div>
          </Field>
        )}
      </div>

      <div className="flex flex-none flex-col gap-2 border-t border-hairline bg-bg px-5 pb-3.5 pt-3">
        {error !== null && <p className="text-body text-danger">{error}</p>}
        {!canSave && !saving && (
          <p className="text-body text-text-2">
            Hace falta un nombre y una dosis mayor que cero.
          </p>
        )}
        <button
          type="button"
          disabled={!canSave}
          onClick={() => void handleSave()}
          className="flex h-[58px] w-full items-center justify-center rounded-card bg-accent shadow-2 disabled:opacity-40 disabled:shadow-none"
        >
          <span className="text-heading text-on-accent">{saving ? 'Guardando…' : 'Guardar'}</span>
        </button>
      </div>
    </div>
  );
}
