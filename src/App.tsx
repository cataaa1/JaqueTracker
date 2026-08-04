/**
 * Navegación de la app.
 *
 * Sin librería de ruteo: son cinco pantallas y una variable de estado alcanza.
 * Meter un router sería una dependencia más para resolver algo que todavía no
 * es un problema (CLAUDE.md §4.6 y §5).
 *
 * "Nuevo episodio" no es una pestaña: tapa toda la pantalla, barra inferior
 * incluida. Eso hace que al cerrarla la pantalla de Inicio se vuelva a montar y
 * relea la base sola, así el episodio recién guardado aparece sin más trámite.
 *
 * La altura va en `dvh` y no en `vh` porque el `100vh` de Safari incluye la
 * barra de direcciones y deja el botón de abajo cortado (CLAUDE.md §7).
 */

import { useState } from 'react';
import type { TabId } from './components/TabBar';
import { TabBar } from './components/TabBar';
import { ComingSoon } from './screens/ComingSoon';
import { History } from './screens/History';
import { Home } from './screens/Home';
import { NewEpisode } from './screens/NewEpisode';

export function App() {
  const [tab, setTab] = useState<TabId>('home');
  const [registering, setRegistering] = useState(false);

  if (registering) {
    return (
      <main className="h-dvh overflow-hidden">
        <NewEpisode
          onCancel={() => setRegistering(false)}
          onSaved={() => {
            setRegistering(false);
            setTab('home');
          }}
        />
      </main>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <main className="min-h-0 flex-1">
        {tab === 'home' && <Home onRegisterEpisode={() => setRegistering(true)} />}
        {tab === 'history' && <History />}
        {tab === 'report' && (
          <ComingSoon
            title="Reporte"
            description="Acá va a estar el PDF para llevarle al neurólogo. Llega en la fase 5, cuando ya haya episodios y medicación cargados para resumir."
          />
        )}
        {tab === 'settings' && (
          <ComingSoon
            title="Ajustes"
            description="Acá vas a poder cargar tu nombre, elegir el tema claro u oscuro y exportar una copia de seguridad de tus datos. Llegan en las fases 6 y 7."
          />
        )}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
