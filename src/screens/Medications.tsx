/**
 * Catálogo de medicamentos — RF-16: alta, edición y desactivación.
 *
 * Los inactivos no se esconden: se muestran abajo y apagados. Un medicamento
 * discontinuado sigue explicando las tomas viejas del historial, y poder volver
 * a activarlo con un toque es lo normal cuando un tratamiento se retoma.
 *
 * Acá no se borra nada. Borrar dejaría tomas huérfanas, y el PRD no lo pide.
 */

import { useCallback, useState } from 'react';
import type { Medication } from '../types';
import { listMedications, setMedicationActive } from '../db/queries';
import { MEDICATION_KIND_LABELS } from '../lib/labels';
import { formatMedicationDetail } from '../lib/medications';
import { useDbData } from '../hooks/useDbData';

interface Props {
  onBack: () => void;
  onAdd: () => void;
  onEdit: (medicationId: string) => void;
}

export function Medications({ onBack, onAdd, onEdit }: Props) {
  const load = useCallback((): Promise<Medication[]> => listMedications(), []);
  const { state, reload } = useDbData(load);
  const [error, setError] = useState<string | null>(null);

  async function toggleActive(medication: Medication) {
    setError(null);
    try {
      await setMedicationActive(medication.id, !medication.isActive);
      reload();
    } catch (caught: unknown) {
      setError(
        caught instanceof Error ? caught.message : 'No se pudo cambiar el medicamento.',
      );
    }
  }

  const active = state.status === 'ready' ? state.data.filter((m) => m.isActive) : [];
  const inactive = state.status === 'ready' ? state.data.filter((m) => !m.isActive) : [];

  return (
    <div className="flex h-full flex-col bg-bg">
      <header
        className="flex flex-none items-center justify-between gap-3 border-b border-hairline px-5 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <button
          type="button"
          onClick={onBack}
          className="min-h-target px-2 text-body font-semibold text-accent"
        >
          Volver
        </button>
        <h1 className="text-heading text-text">Medicamentos</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-6">
        {state.status === 'loading' && <p className="text-body text-text-2">Cargando…</p>}

        {state.status === 'error' && (
          <p className="rounded-card border border-danger bg-surface p-[18px] text-body text-danger">
            No se pudo leer el catálogo: {state.message}
          </p>
        )}

        {error !== null && (
          <p className="rounded-card border border-danger bg-surface p-[18px] text-body text-danger">
            {error}
          </p>
        )}

        {state.status === 'ready' && state.data.length === 0 && (
          <p className="rounded-card border border-border bg-surface p-5 text-body text-text-2">
            Todavía no cargaste ningún medicamento. Cargá los analgésicos que tomás
            cuando te duele y, si tomás alguno todos los días, también.
          </p>
        )}

        {active.length > 0 && (
          <MedicationList
            title="En uso"
            medications={active}
            onEdit={onEdit}
            onToggleActive={(medication) => void toggleActive(medication)}
          />
        )}

        {inactive.length > 0 && (
          <MedicationList
            title="Discontinuados"
            medications={inactive}
            onEdit={onEdit}
            onToggleActive={(medication) => void toggleActive(medication)}
          />
        )}
      </div>

      <div className="flex-none border-t border-hairline bg-bg px-5 pb-3.5 pt-3">
        <button
          type="button"
          onClick={onAdd}
          className="flex h-[58px] w-full items-center justify-center gap-3 rounded-card bg-accent shadow-2"
        >
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path d="M11 4v14M4 11h14" stroke="var(--on-accent)" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          <span className="text-heading text-on-accent">Agregar medicamento</span>
        </button>
      </div>
    </div>
  );
}

function MedicationList({
  title,
  medications,
  onEdit,
  onToggleActive,
}: {
  title: string;
  medications: Medication[];
  onEdit: (medicationId: string) => void;
  onToggleActive: (medication: Medication) => void;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-label uppercase text-text-2">{title}</h2>
      <ul className="flex flex-col gap-2">
        {medications.map((medication) => (
          <li
            key={medication.id}
            className="flex min-h-[68px] items-center gap-3 rounded-row border border-border bg-surface p-3 pl-4"
            style={medication.isActive ? undefined : { opacity: 0.65 }}
          >
            <button
              type="button"
              onClick={() => onEdit(medication.id)}
              className="flex flex-1 flex-col gap-px text-left"
            >
              <span className="text-body-lg text-text">{medication.name}</span>
              <span className="text-body text-text-2">
                {MEDICATION_KIND_LABELS[medication.kind]} · {formatMedicationDetail(medication)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onToggleActive(medication)}
              className="min-h-target rounded-btn border border-border-strong px-3 text-body font-semibold text-accent"
            >
              {medication.isActive ? 'Dar de baja' : 'Reactivar'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
