/**
 * Botón de opción del formulario: tipo de cefalea, ubicación, síntomas,
 * discapacidad. Sirve tanto para elegir una sola cosa como para marcar varias.
 *
 * Mide 48 px de alto como mínimo, el target táctil de la maqueta (el piso duro
 * de RNF-02 son 44). Sin animaciones: quien lo usa puede estar con dolor.
 */

import type { ReactNode } from 'react';

interface Props {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function OptionButton({ selected, onClick, children }: Props) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        'min-h-target rounded-chip border px-4 py-2 text-body text-left',
        selected
          ? 'border-accent bg-accent font-semibold text-on-accent'
          : 'border-border bg-surface text-text',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
