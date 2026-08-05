/**
 * Confirmación de borrado — RF-14 y RNF-05: ninguna operación destructiva sin
 * confirmación explícita.
 *
 * El texto dice exactamente qué se pierde, incluidas las tomas vinculadas. El
 * borrado es en cascada por decisión del propietario del producto; la
 * consecuencia (baja también el conteo de días con analgésicos del mes) está
 * anotada en `deleteEpisodeWithIntakes`, en queries.ts.
 *
 * "Cancelar" está abajo y es lo que se toca sin querer al errarle: el botón
 * destructivo no queda donde cae el pulgar por descarte.
 */

interface Props {
  linkedIntakes: number;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteSheet({ linkedIntakes, deleting, onConfirm, onCancel }: Props) {
  const intakesLine =
    linkedIntakes === 0
      ? ''
      : linkedIntakes === 1
        ? ' Se va a borrar también la toma vinculada.'
        : ` Se van a borrar también las ${linkedIntakes} tomas vinculadas.`;

  return (
    <div
      role="alertdialog"
      aria-label="Confirmar borrado"
      className="flex flex-none flex-col gap-3.5 border-t border-border-strong bg-surface-2 px-5 pb-7 pt-[18px]"
    >
      <p className="text-body-lg text-text" style={{ textWrap: 'pretty' }}>
        ¿Eliminar este episodio?{intakesLine} No se puede deshacer.
      </p>
      <button
        type="button"
        disabled={deleting}
        onClick={onConfirm}
        className="flex min-h-[58px] items-center justify-center rounded-[17px] disabled:opacity-50"
        style={{ background: 'var(--danger)' }}
      >
        <span className="text-body-lg font-semibold" style={{ color: 'var(--bg)' }}>
          {deleting ? 'Eliminando…' : 'Sí, eliminar'}
        </span>
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="flex min-h-[56px] items-center justify-center rounded-btn border border-border-strong"
      >
        <span className="text-body-lg font-semibold text-text">Cancelar</span>
      </button>
    </div>
  );
}
