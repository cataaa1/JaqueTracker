/**
 * Ajustes — con el respaldo de la fase 6 (RF-24, RF-25, RF-26).
 *
 * El nombre del paciente y el tema llegan en la fase 7.
 *
 * SOBRE EL FLUJO DE IMPORTACIÓN
 * Elegir un archivo no importa nada todavía: primero se lee, se valida entero y
 * se muestra qué contiene. Recién ahí aparecen las dos opciones. "Reemplazar"
 * pide una segunda confirmación porque borra todo lo que hay (CLAUDE.md §4.4 y
 * RNF-05); "Fusionar" no la pide porque no puede perder nada: solo agrega lo
 * que falta.
 */

import { useCallback, useRef, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { exportEverything, mergeEverything, replaceEverything } from '../db/queries';
import type { ImportResult } from '../db/queries';
import {
  BackupError,
  backupFileName,
  buildBackupFile,
  countRecords,
  daysSinceLastBackup,
  markBackupDone,
  parseBackup,
  readLastBackupAt,
  serializeBackup,
} from '../lib/backup';
import type { BackupFile } from '../lib/backup';
import { deliverFile } from '../lib/share';

interface Props {
  onOpenMedications: () => void;
}

export function Settings({ onOpenMedications }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [pending, setPending] = useState<BackupFile | null>(null);
  const [confirmingReplace, setConfirmingReplace] = useState(false);

  // Se relee en cada render para reflejar una exportación recién hecha.
  const lastBackup = readLastBackupAt();
  const daysAgo = daysSinceLastBackup();

  const reset = useCallback(() => {
    setPending(null);
    setConfirmingReplace(false);
    if (fileInput.current !== null) fileInput.current.value = '';
  }, []);

  async function handleExport() {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const data = await exportEverything();
      const file = buildBackupFile(data);
      const blob = new Blob([serializeBackup(file)], { type: 'application/json' });
      const delivery = await deliverFile(blob, backupFileName(), 'application/json');

      if (delivery === 'cancelled') {
        setNotice('Cancelaste el envío. No se guardó ninguna copia.');
      } else {
        // Solo se marca cuando el archivo llegó a salir de la app.
        markBackupDone();
        setNotice(
          `Copia lista con ${countRecords(data)} registros. Guardala en un lugar que no sea este teléfono.`,
        );
      }
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? `No se pudo exportar: ${caught.message}`
          : 'No se pudo exportar.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleFileChosen(file: File) {
    setError(null);
    setNotice(null);
    setConfirmingReplace(false);

    try {
      const text = await file.text();
      setPending(parseBackup(text));
    } catch (caught: unknown) {
      setPending(null);
      setError(
        caught instanceof BackupError
          ? caught.message
          : caught instanceof Error
            ? `No se pudo leer el archivo: ${caught.message}`
            : 'No se pudo leer el archivo.',
      );
    }
  }

  async function runImport(mode: 'merge' | 'replace') {
    if (pending === null) return;

    setBusy(true);
    setError(null);

    try {
      const result: ImportResult =
        mode === 'replace'
          ? await replaceEverything(pending.data)
          : await mergeEverything(pending.data);

      const added =
        result.episodes + result.medications + result.intakes + result.preventiveLogs;

      setNotice(
        mode === 'replace'
          ? `Listo. Se reemplazó todo con el respaldo: ${added} registros.`
          : `Listo. Se agregaron ${added} registros nuevos${result.skipped === 0 ? '' : ` y se saltearon ${result.skipped} que ya tenías`}.`,
      );
      reset();
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? `No se pudo importar: ${caught.message}. No se modificó nada.`
          : 'No se pudo importar. No se modificó nada.',
      );
    } finally {
      setBusy(false);
    }
  }

  const backupText =
    lastBackup === null
      ? 'Todavía no hiciste ningún respaldo. Los datos viven solo en este teléfono.'
      : `Último respaldo: ${format(lastBackup, "d 'de' MMMM", { locale: es })}, hace ${daysAgo} ${daysAgo === 1 ? 'día' : 'días'}.${
          daysAgo !== null && daysAgo > 30
            ? ' Los datos viven solo en este teléfono; conviene guardar una copia.'
            : ''
        }`;

  return (
    <div
      className="flex h-full flex-col gap-6 overflow-y-auto px-5 pb-6"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
    >
      <h1 className="text-title text-text">Ajustes</h1>

      <button
        type="button"
        onClick={onOpenMedications}
        className="flex min-h-[64px] items-center gap-3 rounded-row border border-border bg-surface px-4 py-3.5 text-left"
      >
        <span className="flex-1 text-body-lg text-text">Medicamentos</span>
        <svg width="9" height="16" viewBox="0 0 9 16" fill="none" aria-hidden="true">
          <path d="M1.5 1.5L7 8l-5.5 6.5" stroke="var(--text-2)" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-body font-semibold text-text">Respaldo</h2>

        <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-[18px]">
          <div className="flex items-start gap-3">
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              aria-hidden="true"
              className="mt-px flex-none"
            >
              <circle cx="11" cy="11" r="8.6" stroke="var(--text-2)" strokeWidth="1.7" />
              <path d="M11 6.6V11l3 2" stroke="var(--text-2)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <p className="text-body text-text" style={{ textWrap: 'pretty' }}>
              {backupText}
            </p>
          </div>

          {error !== null && (
            <p className="rounded-row border border-danger bg-bg p-3.5 text-body text-danger">
              {error}
            </p>
          )}

          {notice !== null && (
            <p className="rounded-row border border-border-strong bg-surface-2 p-3.5 text-body text-text">
              {notice}
            </p>
          )}

          {pending !== null && (
            <ImportPreview
              file={pending}
              busy={busy}
              confirmingReplace={confirmingReplace}
              onMerge={() => void runImport('merge')}
              onAskReplace={() => setConfirmingReplace(true)}
              onConfirmReplace={() => void runImport('replace')}
              onCancel={reset}
            />
          )}

          {pending === null && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleExport()}
                className="flex min-h-[56px] items-center justify-center rounded-[16px] bg-accent disabled:opacity-50"
              >
                <span className="text-body-lg font-semibold text-on-accent">
                  {busy ? 'Preparando…' : 'Exportar a un archivo'}
                </span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
                className="flex min-h-[52px] items-center justify-center rounded-[16px] border border-border-strong disabled:opacity-50"
              >
                <span className="text-[17px] font-semibold text-accent">
                  Importar desde un archivo
                </span>
              </button>

              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  const chosen = event.target.files?.[0];
                  if (chosen !== undefined) void handleFileChosen(chosen);
                }}
              />
            </div>
          )}
        </div>
      </section>

      <p className="text-body text-text-2" style={{ textWrap: 'pretty' }}>
        Tu nombre y el tema claro u oscuro llegan en la fase 7.
      </p>
    </div>
  );
}

/** Qué trae el archivo elegido y qué hacer con él. Nada se tocó todavía. */
function ImportPreview({
  file,
  busy,
  confirmingReplace,
  onMerge,
  onAskReplace,
  onConfirmReplace,
  onCancel,
}: {
  file: BackupFile;
  busy: boolean;
  confirmingReplace: boolean;
  onMerge: () => void;
  onAskReplace: () => void;
  onConfirmReplace: () => void;
  onCancel: () => void;
}) {
  const rows = [
    { value: file.data.episodes.length, label: 'episodios' },
    { value: file.data.medications.length, label: 'medicamentos' },
    { value: file.data.intakes.length, label: 'tomas' },
    { value: file.data.preventiveLogs.length, label: 'marcas de preventivo' },
  ];

  return (
    <div className="flex flex-col gap-3.5 rounded-row border border-border-strong bg-surface-2 p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-[17px] font-semibold text-text">El archivo tiene</h3>
        <p className="text-body text-text-2">
          Exportado el {format(new Date(file.exportedAt), "d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-baseline gap-2.5">
            <span className="min-w-[36px] text-body-lg tabular-nums text-text">{row.value}</span>
            <span className="text-body text-text-2">{row.label}</span>
          </li>
        ))}
      </ul>

      {confirmingReplace ? (
        <div className="flex flex-col gap-2 border-t border-border-strong pt-3.5">
          <p className="text-body text-text" style={{ textWrap: 'pretty' }}>
            Reemplazar borra <strong>todo</strong> lo que tenés ahora y deja solo lo del
            archivo. No se puede deshacer.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirmReplace}
            className="flex min-h-[56px] items-center justify-center rounded-[16px] disabled:opacity-50"
            style={{ background: 'var(--danger)' }}
          >
            <span className="text-body-lg font-semibold" style={{ color: 'var(--bg)' }}>
              {busy ? 'Reemplazando…' : 'Sí, borrar todo y reemplazar'}
            </span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex min-h-[52px] items-center justify-center rounded-[16px] border border-border-strong"
          >
            <span className="text-[17px] font-semibold text-text">Cancelar</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 border-t border-border-strong pt-3.5">
          <button
            type="button"
            disabled={busy}
            onClick={onMerge}
            className="flex min-h-[56px] items-center justify-center rounded-[16px] bg-accent disabled:opacity-50"
          >
            <span className="text-body-lg font-semibold text-on-accent">
              {busy ? 'Fusionando…' : 'Fusionar con lo que tengo'}
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onAskReplace}
            className="flex min-h-[52px] items-center justify-center rounded-[16px] border border-border"
          >
            <span className="text-[17px] font-semibold text-danger">Reemplazar todo</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-target px-1 text-left text-body font-semibold text-text-2"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
