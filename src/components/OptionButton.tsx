/**
 * Botón de opción del formulario: tipo de cefalea, síntomas, limitación,
 * medicamento. Sirve tanto para elegir una sola cosa como para marcar varias.
 *
 * Tres formas, las de la maqueta:
 *   · `block` — botón de una grilla, centrado (tipo, aura sí/no, unidades).
 *   · `pill`  — cápsula que fluye en varias líneas (síntomas, tipos de aura).
 *   · `row`   — fila ancha con el texto a la izquierda (limitación, medicamento).
 *
 * Todas superan los 48 px de alto, el target táctil de la maqueta (el piso duro
 * de RNF-02 son 44). Sin animaciones: quien lo usa puede estar con dolor.
 */

import type { ReactNode } from 'react';

type Variant = 'block' | 'pill' | 'row';

const VARIANT_CLASS: Record<Variant, string> = {
  block: 'min-h-[52px] rounded-[16px] px-3 text-center',
  pill: 'min-h-12 rounded-[24px] px-[18px] text-center',
  row: 'min-h-[56px] rounded-[16px] px-[18px] text-left',
};

interface Props {
  selected: boolean;
  onClick: () => void;
  variant?: Variant;
  children: ReactNode;
}

export function OptionButton({ selected, onClick, variant = 'block', children }: Props) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        'border text-[17px]',
        VARIANT_CLASS[variant],
        selected
          ? 'border-accent bg-accent font-semibold text-on-accent'
          : 'border-border bg-surface font-medium text-text',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
