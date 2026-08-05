/**
 * Reporte — RF-23: el PDF para llevar a la consulta.
 *
 * La pantalla muestra el período elegido y qué va a contener el archivo, para
 * que no haya que generarlo a ciegas. El PDF lo arma `lib/pdf.ts` con las
 * métricas de `lib/stats.ts`.
 *
 * El PRD fija 90 días como período por defecto (RF-23). La última elección se
 * guarda en `localStorage`, que es uno de los dos usos permitidos: preferencias
 * de interfaz, nunca datos clínicos (CLAUDE.md §4.9).
 */

import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Episode, Intake, Medication, PreventiveLog } from '../types';
import {
  listAllEpisodes,
  listAllIntakes,
  listAllPreventiveLogs,
  listMedications,
} from '../db/queries';
import { buildReport } from '../lib/stats';
import { deliverFile } from '../lib/share';
import { useDbData } from '../hooks/useDbData';

const RANGE_STORAGE_KEY = 'jaque-tracker:report-range';

/** 0 = todo el registro. */
const RANGE_OPTIONS = [
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
  { days: 0, label: 'Todo' },
];

function readStoredRange(): number {
  const stored = window.localStorage.getItem(RANGE_STORAGE_KEY);
  const parsed = stored === null ? Number.NaN : Number(stored);
  return RANGE_OPTIONS.some((option) => option.days === parsed) ? parsed : 90;
}

interface ReportSource {
  episodes: Episode[];
  intakes: Intake[];
  medications: Medication[];
  preventiveLogs: PreventiveLog[];
}

async function loadSource(): Promise<ReportSource> {
  const [episodes, intakes, medications, preventiveLogs] = await Promise.all([
    listAllEpisodes(),
    listAllIntakes(),
    listMedications(),
    listAllPreventiveLogs(),
  ]);
  return { episodes, intakes, medications, preventiveLogs };
}

export function Report() {
  const load = useCallback(loadSource, []);
  const { state } = useDbData(load);

  const [rangeDays, setRangeDays] = useState(readStoredRange);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function chooseRange(days: number) {
    setRangeDays(days);
    setResult(null);
    window.localStorage.setItem(RANGE_STORAGE_KEY, String(days));
  }

  if (state.status === 'loading') {
    return <Frame><p className="text-body text-text-2">Cargando…</p></Frame>;
  }

  if (state.status === 'error') {
    return (
      <Frame>
        <p className="rounded-card border border-danger bg-surface p-[18px] text-body text-danger">
          No se pudieron leer los datos: {state.message}
        </p>
      </Frame>
    );
  }

  const source = state.data;
  const now = new Date();

  // "Todo" arranca en el primer episodio registrado; si no hay ninguno, en hoy.
  const earliest = source.episodes
    .map((episode) => episode.startedAt)
    .sort((a, b) => a.localeCompare(b))[0];

  const from =
    rangeDays === 0
      ? startOfDay(earliest === undefined ? now : new Date(earliest))
      : startOfDay(subDays(now, rangeDays - 1));
  const to = endOfDay(now);

  const report = buildReport({ ...source, from, to });

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      // jsPDF pesa unos 240 KB comprimidos: cargarlo al abrir la app haría que
      // Inicio tarde de más en aparecer (RNF-03, carga inicial < 2 s en 4G).
      // Con este `import()` el navegador lo trae recién cuando se toca el botón.
      // Es un archivo de la propia app, no una llamada externa; el service
      // worker de la fase 7 lo va a dejar precargado para que también funcione
      // sin conexión (RF-28).
      const { generateReportPdf, reportFileName } = await import('../lib/pdf');

      // El nombre del paciente se carga en Ajustes y llega en la fase 7; hasta
      // entonces el encabezado del PDF va sin nombre.
      const blob = generateReportPdf(report, '');
      const delivery = await deliverFile(blob, reportFileName(report), 'application/pdf');

      setResult(
        delivery === 'cancelled'
          ? 'Cancelaste el envío. El reporte no se guardó.'
          : delivery === 'shared'
            ? `Listo: ${report.episodeCount} episodios en el período. Elegiste dónde guardarlo.`
            : `Listo: ${report.episodeCount} episodios en el período. Se abrió en una pestaña nueva para que lo guardes o lo imprimas.`,
      );
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? `No se pudo generar el reporte: ${caught.message}`
          : 'No se pudo generar el reporte.',
      );
    } finally {
      setGenerating(false);
    }
  }

  const rangeLabel =
    rangeDays === 0 && earliest === undefined
      ? 'Todavía no hay registros'
      : `${format(from, "d 'de' MMM", { locale: es })} – ${format(to, "d 'de' MMM 'de' yyyy", { locale: es })}`;

  const summaryLines = [
    { value: report.episodeCount, label: 'episodios registrados' },
    { value: report.rescueDaysTotal, label: 'días con analgésicos' },
    { value: report.rescue.reduce((sum, row) => sum + row.totalDoses, 0), label: 'tomas de rescate' },
    { value: report.preventives.length, label: 'preventivos activos con su adherencia' },
    { value: report.symptoms.length, label: 'síntomas con su frecuencia' },
    { value: report.notes.length, label: 'notas escritas por vos' },
  ];

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
      >
        <header className="flex flex-col gap-1">
          <h1 className="text-title text-text">Reporte</h1>
          <p className="text-body text-text-2" style={{ textWrap: 'pretty' }}>
            Un PDF para llevar a la consulta.
          </p>
        </header>

        <section className="flex flex-col gap-2.5">
          <h2 className="text-body font-semibold text-text">Período</h2>
          <div className="grid grid-cols-3 gap-2">
            {RANGE_OPTIONS.map((option) => {
              const active = option.days === rangeDays;
              return (
                <button
                  key={option.days}
                  type="button"
                  aria-pressed={active}
                  onClick={() => chooseRange(option.days)}
                  className={[
                    'h-[52px] rounded-[16px] border text-[17px]',
                    active
                      ? 'border-accent bg-accent font-semibold text-on-accent'
                      : 'border-border bg-surface font-medium text-text',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <div className="flex min-h-[60px] items-center rounded-row border border-border bg-surface px-4">
            <span className="text-[17px] tabular-nums text-text">{rangeLabel}</span>
          </div>
        </section>

        <section className="flex flex-col gap-3.5 rounded-card border border-border bg-surface p-[18px]">
          <h2 className="text-label uppercase text-text-2">Va a incluir</h2>
          <ul className="flex flex-col gap-3">
            {summaryLines.map((row) => (
              <li key={row.label} className="flex items-baseline gap-3">
                <span className="min-w-[40px] text-[20px] font-semibold tabular-nums text-text">
                  {row.value}
                </span>
                <span className="text-body text-text-2">{row.label}</span>
              </li>
            ))}
          </ul>
          <p className="border-t border-border pt-3.5 text-body text-text-2" style={{ textWrap: 'pretty' }}>
            Sin gráficos ni interpretaciones: tabla, conteos y tus notas.
          </p>
        </section>

        {error !== null && (
          <p className="rounded-card border border-danger bg-surface p-[18px] text-body text-danger">
            {error}
          </p>
        )}

        {result !== null && (
          <section className="flex flex-col gap-1.5 rounded-row border border-border-strong bg-surface-2 p-4">
            <h2 className="text-[17px] font-semibold text-text">Reporte generado</h2>
            <p className="text-body text-text-2" style={{ textWrap: 'pretty' }}>
              {result}
            </p>
          </section>
        )}
      </div>

      <div className="flex-none border-t border-border bg-bg px-5 pb-3.5 pt-3">
        <button
          type="button"
          disabled={generating || report.episodeCount === 0}
          onClick={() => void handleGenerate()}
          className="flex h-[66px] w-full items-center justify-center gap-3 rounded-card bg-accent shadow-2 disabled:opacity-40 disabled:shadow-none"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path
              d="M11 3v11m0 0l-4.2-4.2M11 14l4.2-4.2M4 17.5h14"
              stroke="var(--on-accent)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[21px] font-semibold text-on-accent">
            {generating ? 'Generando…' : 'Generar PDF'}
          </span>
        </button>
      </div>
    </div>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex h-full flex-col gap-5 px-5"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
    >
      <h1 className="text-title text-text">Reporte</h1>
      {children}
    </div>
  );
}
