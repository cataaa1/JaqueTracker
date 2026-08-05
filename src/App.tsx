/**
 * Navegación de la app.
 *
 * Sin librería de ruteo: una variable dice qué se está viendo y alcanza. Meter
 * un router sería una dependencia más para algo que todavía no es un problema
 * (CLAUDE.md §4.6 y §5).
 *
 * Hay dos niveles. `tabs` muestra una de las cuatro pestañas con la barra
 * inferior; cualquier otra vista tapa la pantalla entera, barra incluida. Eso
 * hace que al cerrar una vista la pestaña se vuelva a montar y relea la base
 * sola: lo que acabás de guardar aparece sin trámite.
 *
 * `returnTo` en el detalle guarda de dónde se llegó, para que "Volver" no te
 * escupa siempre en Inicio cuando entraste desde el Historial.
 *
 * La altura va en `dvh` y no en `vh` porque el `100vh` de Safari incluye la
 * barra de direcciones y deja el botón de abajo cortado (CLAUDE.md §7).
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import type { TabId } from './components/TabBar';
import { TabBar } from './components/TabBar';
import { ComingSoon } from './screens/ComingSoon';
import { EpisodeDetail } from './screens/EpisodeDetail';
import { EpisodeForm } from './screens/EpisodeForm';
import { History } from './screens/History';
import { Home } from './screens/Home';
import { MedicationForm } from './screens/MedicationForm';
import { Medications } from './screens/Medications';
import { NewIntake } from './screens/NewIntake';
import { PreventiveHistory } from './screens/PreventiveHistory';
import { Settings } from './screens/Settings';

type View =
  | { kind: 'tabs' }
  | { kind: 'episode-form'; episodeId: string | null }
  | { kind: 'episode-detail'; episodeId: string; returnTo: TabId; confirmDelete?: boolean }
  | { kind: 'new-intake'; suggestedEpisodeId: string | null }
  | { kind: 'preventive-history' }
  | { kind: 'medications' }
  | { kind: 'medication-form'; medicationId: string | null };

const TABS_VIEW: View = { kind: 'tabs' };

export function App() {
  const [tab, setTab] = useState<TabId>('home');
  const [view, setView] = useState<View>(TABS_VIEW);

  function openEpisode(episodeId: string, returnTo: TabId) {
    setView({ kind: 'episode-detail', episodeId, returnTo });
  }

  if (view.kind === 'episode-form') {
    const { episodeId } = view;
    return (
      <FullScreen>
        <EpisodeForm
          episodeId={episodeId}
          onCancel={() =>
            // Al cancelar una edición se vuelve al detalle del que se venía;
            // al cancelar un alta, a las pestañas.
            episodeId === null
              ? setView(TABS_VIEW)
              : openEpisode(episodeId, 'home')
          }
          onSaved={(savedId) => {
            if (episodeId === null) {
              setView(TABS_VIEW);
              setTab('home');
            } else {
              openEpisode(savedId, 'home');
            }
          }}
          onRequestDelete={() => {
            // Se vuelve al detalle con la confirmación ya abierta: es donde
            // vive, y así se ve cuántas tomas se van a llevar puestas.
            if (episodeId !== null) {
              setView({ kind: 'episode-detail', episodeId, returnTo: 'home', confirmDelete: true });
            }
          }}
        />
      </FullScreen>
    );
  }

  if (view.kind === 'episode-detail') {
    const { episodeId, returnTo } = view;
    return (
      <FullScreen>
        <EpisodeDetail
          key={`${episodeId}-${view.confirmDelete === true ? 'confirm' : 'plain'}`}
          episodeId={episodeId}
          startConfirming={view.confirmDelete === true}
          onBack={() => {
            setTab(returnTo);
            setView(TABS_VIEW);
          }}
          onEdit={() => setView({ kind: 'episode-form', episodeId })}
          onDeleted={() => {
            setTab(returnTo);
            setView(TABS_VIEW);
          }}
        />
      </FullScreen>
    );
  }

  if (view.kind === 'new-intake') {
    return (
      <FullScreen>
        <NewIntake
          suggestedEpisodeId={view.suggestedEpisodeId}
          onCancel={() => setView(TABS_VIEW)}
          onSaved={() => {
            setView(TABS_VIEW);
            setTab('home');
          }}
        />
      </FullScreen>
    );
  }

  if (view.kind === 'preventive-history') {
    return (
      <FullScreen>
        <PreventiveHistory onBack={() => setView(TABS_VIEW)} />
      </FullScreen>
    );
  }

  if (view.kind === 'medications') {
    return (
      <FullScreen>
        <Medications
          onBack={() => setView(TABS_VIEW)}
          onAdd={() => setView({ kind: 'medication-form', medicationId: null })}
          onEdit={(medicationId) => setView({ kind: 'medication-form', medicationId })}
        />
      </FullScreen>
    );
  }

  if (view.kind === 'medication-form') {
    return (
      <FullScreen>
        <MedicationForm
          medicationId={view.medicationId}
          onCancel={() => setView({ kind: 'medications' })}
          onSaved={() => setView({ kind: 'medications' })}
        />
      </FullScreen>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <main className="min-h-0 flex-1">
        {tab === 'home' && (
          <Home
            onRegisterEpisode={() => setView({ kind: 'episode-form', episodeId: null })}
            onRegisterIntake={(episodeId) =>
              setView({ kind: 'new-intake', suggestedEpisodeId: episodeId })
            }
            onAddMedication={() => setView({ kind: 'medication-form', medicationId: null })}
            onSelectEpisode={(episodeId) => openEpisode(episodeId, 'home')}
            onOpenPreventiveHistory={() => setView({ kind: 'preventive-history' })}
          />
        )}
        {tab === 'history' && (
          <History onSelectEpisode={(episodeId) => openEpisode(episodeId, 'history')} />
        )}
        {tab === 'report' && (
          <ComingSoon
            title="Reporte"
            description="Acá va a estar el PDF de dos páginas para llevarle al neurólogo, con el período que elijas. Llega en la fase 5."
          />
        )}
        {tab === 'settings' && <Settings onOpenMedications={() => setView({ kind: 'medications' })} />}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}

function FullScreen({ children }: { children: ReactNode }) {
  return <main className="h-dvh overflow-hidden">{children}</main>;
}
