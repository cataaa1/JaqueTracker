/**
 * Un bloque del formulario: la pregunta arriba, los controles abajo.
 *
 * `optional` pinta la palabra "opcional" al lado del título. Es deliberado y lo
 * pide el PRD (RF-10): lo único obligatorio para guardar son la fecha y la
 * intensidad, y eso tiene que verse, no adivinarse.
 */

import type { ReactNode } from 'react';

interface Props {
  label: string;
  optional?: boolean;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, optional = false, hint, children }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <h2 className="text-heading text-text">{label}</h2>
          {optional && <span className="text-body text-text-2">opcional</span>}
        </div>
        {hint !== undefined && <p className="text-body text-text-2">{hint}</p>}
      </div>
      {children}
    </div>
  );
}
