/**
 * Una fila de "Preventivo de hoy" — RF-19.
 *
 * Marcado y sin marcar son visualmente distintos por más de un rasgo: cambia el
 * fondo, el color del nombre, el relleno del botón y la palabra. No alcanza con
 * el color solo.
 *
 * Se puede desmarcar tocando de nuevo: marcar por error algo que no tomaste
 * ensucia la adherencia que va al reporte.
 */

import type { Medication } from '../types';
import { formatMedicationDetail } from '../lib/medications';

interface Props {
  medication: Medication;
  taken: boolean;
  onToggle: () => void;
}

export function PreventiveRow({ medication, taken, onToggle }: Props) {
  return (
    <div
      className={[
        'flex min-h-[68px] items-center gap-3 rounded-row border border-border py-2.5 pl-4 pr-3',
        taken ? 'bg-surface-2' : 'bg-surface',
      ].join(' ')}
    >
      <div className="flex flex-1 flex-col gap-px">
        <span className={`text-body-lg ${taken ? 'text-text-2' : 'text-text'}`}>
          {medication.name}
        </span>
        <span className="text-body text-text-2">
          {taken
            ? `${formatMedicationDetail(medication).split(' · ')[0] ?? ''} · tomado hoy`
            : formatMedicationDetail(medication)}
        </span>
      </div>
      <button
        type="button"
        aria-pressed={taken}
        onClick={onToggle}
        className={[
          'flex h-12 min-w-[112px] items-center justify-center gap-2 rounded-btn border px-3.5',
          taken ? 'border-border-strong bg-transparent' : 'border-accent bg-accent',
        ].join(' ')}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M4 10.5l4 4 8-9"
            stroke={taken ? 'var(--accent)' : 'var(--on-accent)'}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span
          className="text-[17px] font-semibold"
          style={{ color: taken ? 'var(--accent)' : 'var(--on-accent)' }}
        >
          {taken ? 'Tomado' : 'Tomar'}
        </span>
      </button>
    </div>
  );
}
