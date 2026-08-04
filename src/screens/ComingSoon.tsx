/**
 * Pantalla de relleno para las pestañas que la maqueta ya dibuja pero que
 * todavía no llegaron: Reporte (fase 5, RF-23) y Ajustes (fase 7).
 *
 * Existe solo para que una pestaña no quede muda al tocarla. No prepara nada ni
 * deja andamiaje: cuando llegue la fase, se reemplaza por la pantalla real.
 */

interface Props {
  title: string;
  description: string;
}

export function ComingSoon({ title, description }: Props) {
  return (
    <div
      className="flex h-full flex-col gap-5 overflow-y-auto px-5 pb-6"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
    >
      <h1 className="text-title text-text">{title}</h1>
      <p className="rounded-card border border-border bg-surface p-5 text-body text-text-2">
        {description}
      </p>
    </div>
  );
}
