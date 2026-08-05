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
 * La altura va en `dvh` y no en `vh` porque el `100vh` de Safari incluye la
 * barra de direcciones y deja el botón de abajo cortado (CLAUDE.md §7).
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import type { TabId } from './components/TabBar';
import { TabBar } from './components/TabBar';
import { ComingSoon } from './screens/ComingSoon';
import { History } from './screens/History';
import { Home } from './screens/Home';
import { MedicationForm } from './screens/MedicationForm';
import { Medications } from './screens/Medications';
import { NewEpisode } from './screens/NewEpisode';
import { NewIntake } from './screens/NewIntake';
import { Settings } from './screens/Settings';

type View =
  | { kind: 'tabs' }
  | { kind: 'new-episode' }
  | { kind: 'new-intake'; suggestedEpisodeId: string | null }
  | { kind: 'medications' }
  | { kind: 'medication-form'; medicationId: string | null };

const TABS_VIEW: View = { kind: 'tabs' };

export function App() {
  const [tab, setTab] = useState<TabId>('home');
  const [view, setView] = useState<View>(TABS_VIEW);

  if (view.kind === 'new-episode') {
    return (
      <FullScreen>
        <NewEpisode
          onCancel={() => setView(TABS_VIEW)}
          onSaved={() => {
            setView(TABS_VIEW);
            setTab('home');
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
            onRegisterEpisode={() => setView({ kind: 'new-episode' })}
            onRegisterIntake={(episodeId) =>
              setView({ kind: 'new-intake', suggestedEpisodeId: episodeId })
            }
            onAddMedication={() => setView({ kind: 'medication-form', medicationId: null })}
          />
        )}
        {tab === 'history' && <History />}
        {tab === 'report' && (
          <ComingSoon
            title="Reporte"
            description="Acá va a estar el PDF para llevarle al neurólogo. Llega en la fase 5, cuando ya haya episodios y medicación cargados para resumir."
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
