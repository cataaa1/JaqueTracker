/**
 * Barra de pestañas inferior, con los iconos de la maqueta.
 *
 * "Reporte" y "Ajustes" ya están porque la maqueta las tiene y sacarlas
 * cambiaría el reparto de la barra, pero todavía no hacen nada real: llevan a
 * una pantalla que dice en qué fase llegan. Es preferible a una pestaña muda.
 *
 * El padding de abajo respeta `safe-area-inset-bottom`, la franja que ocupa la
 * barra de gestos del iPhone: sin eso, la fila de abajo queda tapada.
 */

export type TabId = 'home' | 'history' | 'report' | 'settings';

interface Tab {
  id: TabId;
  label: string;
  icon: (color: string) => JSX.Element;
}

const TABS: Tab[] = [
  {
    id: 'home',
    label: 'Inicio',
    icon: (color) => (
      <path
        d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1v-9.5z"
        stroke={color}
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: 'history',
    label: 'Historial',
    icon: (color) => (
      <path d="M4 6.5h16M4 12h16M4 17.5h11" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
    ),
  },
  {
    id: 'report',
    label: 'Reporte',
    icon: (color) => (
      <>
        <path
          d="M6 3.5h8l4.5 4.5V20a.5.5 0 01-.5.5H6a.5.5 0 01-.5-.5V4a.5.5 0 01.5-.5z"
          stroke={color}
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        <path d="M8.5 13h7M8.5 16.5h4.5" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
      </>
    ),
  },
  {
    id: 'settings',
    label: 'Ajustes',
    icon: (color) => (
      <>
        <circle cx="12" cy="12" r="3.2" stroke={color} strokeWidth="1.9" />
        <path
          d="M12 3.5v2.2M12 18.3v2.2M4.5 12H6.7M17.3 12h2.2M6.7 6.7l1.6 1.6M15.7 15.7l1.6 1.6M17.3 6.7l-1.6 1.6M8.3 15.7l-1.6 1.6"
          stroke={color}
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      </>
    ),
  },
];

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export function TabBar({ active, onChange }: Props) {
  return (
    <nav
      className="grid flex-none grid-cols-4 border-t border-border bg-surface p-2"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      aria-label="Secciones"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        // Los colores salen de los tokens y no de un hexadecimal fijo, para que
        // la barra se dé vuelta sola en modo oscuro.
        const color = isActive ? 'var(--accent)' : 'var(--text-2)';

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={isActive ? 'page' : undefined}
            className="flex min-h-[52px] flex-col items-center justify-center gap-[3px]"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {tab.icon(color)}
            </svg>
            <span
              className="text-tab"
              style={{ color, fontWeight: isActive ? 600 : 400 }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
