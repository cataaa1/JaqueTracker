/**
 * El cuadradito redondeado con el número de intensidad.
 *
 * El color sale de la rampa de tokens (--intensity-1 … --intensity-10), que se
 * da vuelta sola en modo oscuro. El número SIEMPRE está escrito: el color
 * acompaña, nunca informa solo. Es lo que hace que la escala se entienda con
 * daltonismo o en escala de grises.
 */

import type { Intensity } from '../types';

interface Props {
  intensity: Intensity;
}

export function IntensityBadge({ intensity }: Props) {
  return (
    <div
      className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-badge"
      style={{
        background: `var(--intensity-${intensity})`,
        color: `var(--intensity-${intensity}-on)`,
      }}
    >
      <span className="text-[21px] font-semibold tabular-nums">{intensity}</span>
      <span className="sr-only">de intensidad 10</span>
    </div>
  );
}
