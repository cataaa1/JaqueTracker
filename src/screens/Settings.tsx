/**
 * Ajustes.
 *
 * Por ahora tiene una sola entrada, Medicamentos, que es lo que trae la fase 2.
 * El nombre del paciente, el tema y la copia de seguridad llegan en las fases
 * 6 y 7; se mencionan como texto, sin dejar ningún botón muerto esperándolas.
 */

interface Props {
  onOpenMedications: () => void;
}

export function Settings({ onOpenMedications }: Props) {
  return (
    <div
      className="flex h-full flex-col gap-6 overflow-y-auto px-5 pb-6"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
    >
      <h1 className="text-title text-text">Ajustes</h1>

      <ul className="flex flex-col gap-2">
        <li>
          <button
            type="button"
            onClick={onOpenMedications}
            className="flex min-h-[68px] w-full items-center gap-3 rounded-row border border-border bg-surface px-4 py-3 text-left"
          >
            <div className="flex flex-1 flex-col gap-px">
              <span className="text-body-lg text-text">Medicamentos</span>
              <span className="text-body text-text-2">
                Los analgésicos y preventivos que tomás
              </span>
            </div>
            <svg width="9" height="16" viewBox="0 0 9 16" fill="none" aria-hidden="true">
              <path d="M1.5 1.5L7 8l-5.5 6.5" stroke="var(--text-2)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </li>
      </ul>

      <p className="rounded-card border border-border bg-surface p-5 text-body text-text-2">
        Tu nombre, el tema claro u oscuro y la copia de seguridad de tus datos
        llegan en las fases 6 y 7.
      </p>
    </div>
  );
}
