/**
 * La escala de intensidad 1–10 (RF-03).
 *
 * La maqueta la muestra como una sola fila de diez, pero eso a 390 px de ancho
 * deja botones de 35 px: por debajo del mínimo táctil. Van en dos filas de
 * cinco, así cada uno queda holgado por encima de los 48 px de la maqueta.
 *
 * El seleccionado se marca con un contorno grueso en el color del texto, no con
 * un cambio de color de fondo: el fondo ya está ocupado informando la
 * intensidad y no se puede pisar.
 */

import type { Intensity } from '../types';

const INTENSITY_VALUES: Intensity[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interface Props {
  value: Intensity | null;
  onChange: (intensity: Intensity) => void;
}

export function IntensityPicker({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-5 gap-2" role="group" aria-label="Intensidad del 1 al 10">
        {INTENSITY_VALUES.map((intensity) => {
          const selected = value === intensity;
          return (
            <button
              key={intensity}
              type="button"
              aria-pressed={selected}
              aria-label={`Intensidad ${intensity} de 10`}
              onClick={() => onChange(intensity)}
              className="flex h-14 items-center justify-center rounded-chip"
              style={{
                background: `var(--intensity-${intensity})`,
                color: `var(--intensity-${intensity}-on)`,
                ...(selected
                  ? { outline: '3px solid var(--text)', outlineOffset: '2px' }
                  : {}),
              }}
            >
              <span className="text-[19px] font-semibold tabular-nums">{intensity}</span>
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-body text-text-2">
        <span>1 · apenas</span>
        <span>10 · lo peor</span>
      </div>
    </div>
  );
}
