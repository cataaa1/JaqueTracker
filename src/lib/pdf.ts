/**
 * Generación del reporte en PDF — RF-23, con los seis bloques del PRD §8.
 *
 * Función pura en el sentido que importa: recibe un `Report` ya calculado y
 * devuelve un Blob. No lee la base ni sabe nada de React.
 *
 * SOBRE LAS TILDES: se usa Helvetica, una de las fuentes que jsPDF trae
 * incorporadas. Codifica en WinAnsi, que incluye á é í ó ú ñ ü ¿ ¡, así que el
 * español sale bien sin incrustar ninguna fuente ni pedir nada a la red.
 *
 * Lo que esa codificación NO dibuja es el guion largo (–): jsPDF lo descarta en
 * silencio y el texto queda pegado ("8 de mayo  5 de agosto"). Por eso en el
 * PDF los rangos se escriben con la palabra "a" y no con un guion. En pantalla
 * el guion largo se usa igual: ahí el problema no existe.
 *
 * El PDF no interpreta nada: son conteos, una tabla y las notas del paciente.
 * El pie lleva la leyenda obligatoria del PRD.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Report } from './stats';
import {
  AURA_TYPE_LABELS,
  EPISODE_TYPE_LABELS,
  RELIEF_LABELS,
  SYMPTOM_CLINICAL_LABELS,
} from './labels';
import type { AuraType } from '../types';

const MARGIN = 14;
const FOOTER_TEXT = 'Registro autoinformado por el paciente. No constituye un diagnóstico.';

/** Paleta en gris: un informe clínico se fotocopia y se lee en blanco y negro. */
const INK = 30;
const MUTED = 110;

interface Cursor {
  y: number;
}

export function generateReportPdf(report: Report, patientName: string): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  const cursor: Cursor = { y: MARGIN };

  drawHeader(doc, report, patientName, cursor, contentWidth);
  drawBlock1(doc, report, cursor, contentWidth);
  drawBlock2(doc, report, cursor, contentWidth);
  drawBlock3(doc, report, cursor, contentWidth);
  drawBlock4(doc, report, cursor, contentWidth);
  drawBlock5(doc, report, cursor);
  drawBlock6(doc, report, cursor, contentWidth);
  drawFooters(doc);

  return doc.output('blob');
}

// ─── Piezas de dibujo ────────────────────────────────────────────────────────

function ensureSpace(doc: jsPDF, cursor: Cursor, needed: number): void {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (cursor.y + needed > pageHeight - 18) {
    doc.addPage();
    cursor.y = MARGIN;
  }
}

function sectionTitle(doc: jsPDF, cursor: Cursor, text: string, width: number): void {
  ensureSpace(doc, cursor, 14);
  cursor.y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(INK);
  doc.text(text, MARGIN, cursor.y);
  cursor.y += 2;
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, cursor.y, MARGIN + width, cursor.y);
  cursor.y += 5;
}

function line(doc: jsPDF, cursor: Cursor, label: string, value: string, bold = false): void {
  ensureSpace(doc, cursor, 6);
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(10);
  doc.setTextColor(bold ? INK : MUTED);
  doc.text(label, MARGIN, cursor.y);
  doc.setTextColor(INK);
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.text(value, MARGIN + 70, cursor.y);
  cursor.y += 5.5;
}

function table(
  doc: jsPDF,
  cursor: Cursor,
  head: string[],
  body: string[][],
  options: { fontSize?: number; columnStyles?: Record<number, { cellWidth: number }> } = {},
): void {
  autoTable(doc, {
    startY: cursor.y,
    margin: { left: MARGIN, right: MARGIN },
    head: [head],
    body,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: options.fontSize ?? 9,
      cellPadding: 1.6,
      textColor: INK,
      lineColor: 210,
      lineWidth: 0.2,
      overflow: 'linebreak',
    },
    headStyles: { fillColor: [242, 240, 235], textColor: INK, fontStyle: 'bold' },
    ...(options.columnStyles === undefined ? {} : { columnStyles: options.columnStyles }),
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
  cursor.y = (finalY ?? cursor.y) + 4;
}

// ─── Encabezado ──────────────────────────────────────────────────────────────

function drawHeader(
  doc: jsPDF,
  report: Report,
  patientName: string,
  cursor: Cursor,
  width: number,
): void {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(INK);
  doc.text('Registro de cefaleas', MARGIN, cursor.y + 4);
  cursor.y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(MUTED);

  const range = `Del ${format(report.from, "d 'de' MMMM 'de' yyyy", { locale: es })} al ${format(report.to, "d 'de' MMMM 'de' yyyy", { locale: es })}`;
  const generated = `Generado el ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`;

  if (patientName.trim() !== '') {
    doc.text(patientName.trim(), MARGIN, cursor.y);
    cursor.y += 5;
  }
  doc.text(range, MARGIN, cursor.y);
  cursor.y += 5;
  doc.text(generated, MARGIN, cursor.y);
  cursor.y += 3;

  doc.setDrawColor(160);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, cursor.y, MARGIN + width, cursor.y);
  cursor.y += 4;
}

// ─── Bloque 1 — Resumen del período ──────────────────────────────────────────

function drawBlock1(doc: jsPDF, report: Report, cursor: Cursor, width: number): void {
  sectionTitle(doc, cursor, 'Resumen del período', width);

  line(doc, cursor, 'Días con cefalea', String(report.headacheDays), true);
  line(doc, cursor, 'Promedio por mes (30 días)', String(report.headacheDaysPerMonth));
  line(doc, cursor, 'Episodios registrados', String(report.episodeCount));
  line(
    doc,
    cursor,
    'Por tipo',
    `${EPISODE_TYPE_LABELS.migraine}: ${report.byType.migraine} · ${EPISODE_TYPE_LABELS.tension}: ${report.byType.tension} · Sin clasificar: ${report.byType.unknown}`,
  );
  line(
    doc,
    cursor,
    'Intensidad promedio / máxima',
    report.averageIntensity === null
      ? 'sin registro'
      : `${report.averageIntensity} / ${report.maxIntensity ?? '-'} (escala 1 a 10)`,
  );
  line(
    doc,
    cursor,
    'Duración promedio',
    report.averageDurationMinutes === null
      ? 'no se registra'
      : formatMinutes(report.averageDurationMinutes),
  );
  line(
    doc,
    cursor,
    'Días con limitación grado 2 o 3',
    report.disabilityDays === null ? 'no se registra' : String(report.disabilityDays),
  );

  cursor.y += 2;
  table(
    doc,
    cursor,
    [report.periodRowsAreWeekly ? 'Semana' : 'Mes', 'Días con cefalea'],
    report.periodRows.map((row) => [row.label, String(row.days)]),
    { columnStyles: { 1: { cellWidth: 32 } } },
  );
}

// ─── Bloque 2 — Medicación de rescate ────────────────────────────────────────

function drawBlock2(doc: jsPDF, report: Report, cursor: Cursor, width: number): void {
  sectionTitle(doc, cursor, 'Medicación de rescate', width);

  // Este número es el que determina el riesgo de cefalea por abuso de
  // medicación: va destacado, como pide el PRD.
  line(doc, cursor, 'Días con analgésicos en el período', String(report.rescueDaysTotal), true);
  cursor.y += 2;

  if (report.rescue.length === 0) {
    line(doc, cursor, 'Sin tomas registradas', '');
    return;
  }

  table(
    doc,
    cursor,
    ['Medicamento', 'Días con toma', 'Dosis totales'],
    report.rescue.map((row) => [row.name, String(row.daysWithIntake), String(row.totalDoses)]),
    { columnStyles: { 1: { cellWidth: 32 }, 2: { cellWidth: 32 } } },
  );

  const relief = report.reliefCounts;
  line(
    doc,
    cursor,
    'Alivio a las 2 h',
    `${RELIEF_LABELS.none}: ${relief.none} · ${RELIEF_LABELS.partial}: ${relief.partial} · ${RELIEF_LABELS.complete}: ${relief.complete} · Sin responder: ${relief.unanswered}`,
  );
}

// ─── Bloque 3 — Medicación preventiva ────────────────────────────────────────

function drawBlock3(doc: jsPDF, report: Report, cursor: Cursor, width: number): void {
  sectionTitle(doc, cursor, 'Medicación preventiva', width);

  if (report.preventives.length === 0) {
    line(doc, cursor, 'Sin preventivos activos', '');
    return;
  }

  table(
    doc,
    cursor,
    ['Medicamento', 'Dosis', 'Adherencia', 'Días tomados', 'Días omitidos'],
    report.preventives.map((row) => [
      row.name,
      row.dose,
      `${row.adherencePercent} %`,
      String(row.takenDays),
      String(row.missedDays),
    ]),
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  doc.text(
    'Un día sin marca se cuenta como omitido. La app no registra desde qué fecha se toma cada preventivo.',
    MARGIN,
    cursor.y,
    { maxWidth: width },
  );
  cursor.y += 6;
}

// ─── Bloque 4 — Síntomas asociados ───────────────────────────────────────────

function drawBlock4(doc: jsPDF, report: Report, cursor: Cursor, width: number): void {
  sectionTitle(doc, cursor, 'Síntomas asociados', width);

  const auraPercent =
    report.episodeCount === 0 ? 0 : Math.round((report.auraEpisodes / report.episodeCount) * 100);

  const auraDetail = Object.entries(report.auraTypeCounts)
    .map(([type, count]) => `${AURA_TYPE_LABELS[type as AuraType]}: ${count}`)
    .join(' · ');

  line(
    doc,
    cursor,
    'Aura',
    `${report.auraEpisodes} de ${report.episodeCount} episodios (${auraPercent} %)${auraDetail === '' ? '' : ` · ${auraDetail}`}`,
  );

  if (report.symptoms.length === 0) {
    line(doc, cursor, 'Sin síntomas registrados', '');
    return;
  }

  cursor.y += 2;
  table(
    doc,
    cursor,
    ['Síntoma', 'Episodios', '% del total'],
    report.symptoms.map((row) => [
      SYMPTOM_CLINICAL_LABELS[row.symptom],
      String(row.count),
      `${row.percent} %`,
    ]),
    { columnStyles: { 1: { cellWidth: 28 }, 2: { cellWidth: 28 } } },
  );
}

// ─── Bloque 5 — Registro detallado ───────────────────────────────────────────

function drawBlock5(doc: jsPDF, report: Report, cursor: Cursor): void {
  const width = doc.internal.pageSize.getWidth() - MARGIN * 2;
  sectionTitle(doc, cursor, 'Registro detallado', width);

  if (report.episodes.length === 0) {
    line(doc, cursor, 'Sin episodios en el período', '');
    return;
  }

  const head = ['Fecha', 'Hora'];
  if (report.showDurationColumn) head.push('Duración');
  head.push('Tipo', 'Int.', 'Aura', 'Síntomas', 'Tomas', 'Alivio');
  if (report.showDisabilityColumn) head.push('Limit.');

  const body = report.episodes.map((episode) => {
    const linked = report.intakesByEpisode.get(episode.id) ?? [];
    const row: string[] = [
      format(new Date(episode.startedAt), 'dd/MM/yy'),
      format(new Date(episode.startedAt), 'HH:mm'),
    ];

    if (report.showDurationColumn) {
      row.push(
        episode.endedAt === null
          ? '—'
          : formatMinutes(
              Math.max(
                0,
                Math.round(
                  (new Date(episode.endedAt).getTime() - new Date(episode.startedAt).getTime()) /
                    60000,
                ),
              ),
            ),
      );
    }

    row.push(
      EPISODE_TYPE_LABELS[episode.type],
      String(episode.intensity),
      episode.hasAura
        ? episode.auraTypes.map((type) => AURA_TYPE_LABELS[type]).join(', ') || 'sí'
        : 'no',
      episode.symptoms.map((symptom) => SYMPTOM_CLINICAL_LABELS[symptom]).join(', ') || '-',
      linked.length === 0 ? '-' : String(linked.length),
      linked.length === 0
        ? '-'
        : linked
            .map((intake) =>
              intake.relief2h === null ? 's/r' : RELIEF_LABELS[intake.relief2h].toLowerCase(),
            )
            .join(', '),
    );

    if (report.showDisabilityColumn) row.push(String(episode.disability));

    return row;
  });

  table(doc, cursor, head, body, { fontSize: 7.5 });
}

// ─── Bloque 6 — Notas ────────────────────────────────────────────────────────

function drawBlock6(doc: jsPDF, report: Report, cursor: Cursor, width: number): void {
  if (report.notes.length === 0) return;

  sectionTitle(doc, cursor, 'Notas del paciente', width);

  for (const note of report.notes) {
    const text = doc.splitTextToSize(note.text, width - 24) as string[];
    ensureSpace(doc, cursor, text.length * 4.5 + 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(MUTED);
    doc.text(format(new Date(note.startedAt), 'dd/MM/yy'), MARGIN, cursor.y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(INK);
    doc.text(text, MARGIN + 20, cursor.y);
    cursor.y += text.length * 4.2 + 3;
  }
}

// ─── Pie ─────────────────────────────────────────────────────────────────────

function drawFooters(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text(FOOTER_TEXT, MARGIN, pageHeight - 10);
    doc.text(`${page} / ${pageCount}`, pageWidth - MARGIN, pageHeight - 10, { align: 'right' });
  }
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

/** Nombre del archivo: legible y ordenable. */
export function reportFileName(report: Report): string {
  return `cefaleas-${format(report.from, 'yyyy-MM-dd')}-a-${format(report.to, 'yyyy-MM-dd')}.pdf`;
}
