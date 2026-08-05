/**
 * La tarjeta de medicación de Inicio.
 *
 * Hace dos cosas, las dos a un toque y sin navegar:
 *   · pregunta por el alivio de las tomas que ya cumplieron 2 horas (RF-18);
 *   · muestra lo que se tomó hoy y deja registrar una toma nueva (RF-17).
 *
 * No importa nada de `db/`: recibe todo por props y avisa hacia arriba. Es la
 * regla de dependencias de CLAUDE.md §3.
 */

import type { Intake, Medication, ReliefLevel } from '../types';
import { formatTime } from '../lib/dates';
import { RELIEF_LABELS, RELIEF_ORDER } from '../lib/labels';
import { findMedication, formatMedication } from '../lib/medications';

/** Cuántas preguntas de alivio se muestran a la vez. Más de dos convierten la
 *  pantalla de inicio en un formulario. */
const MAX_RELIEF_QUESTIONS = 2;

interface Props {
  medications: Medication[];
  todayIntakes: Intake[];
  awaitingRelief: Intake[];
  onRegisterIntake: () => void;
  onAnswerRelief: (intakeId: string, relief: ReliefLevel) => void;
}

export function MedicationCard({
  medications,
  todayIntakes,
  awaitingRelief,
  onRegisterIntake,
  onAnswerRelief,
}: Props) {
  function label(intake: Intake): string {
    const medication = findMedication(medications, intake.medicationId);
    return medication === undefined ? 'la medicación' : formatMedication(medication);
  }

  return (
    <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-[18px] shadow-1">
      <h2 className="text-label uppercase text-text-2">Medicación</h2>

      {awaitingRelief.slice(0, MAX_RELIEF_QUESTIONS).map((intake) => (
        <div key={intake.id} className="flex flex-col gap-2.5 border-b border-border pb-4">
          <p className="text-body text-text" style={{ textWrap: 'pretty' }}>
            ¿Te alivió {label(intake)} de las {formatTime(intake.takenAt)}?
          </p>
          <div className="grid grid-cols-3 gap-2">
            {RELIEF_ORDER.map((relief) => (
              <button
                key={relief}
                type="button"
                onClick={() => onAnswerRelief(intake.id, relief)}
                className="min-h-target rounded-chip border border-border-strong px-2 text-body font-semibold text-accent"
              >
                {RELIEF_LABELS[relief]}
              </button>
            ))}
          </div>
        </div>
      ))}

      {todayIntakes.length === 0 ? (
        <p className="text-body text-text-2">Hoy no registraste ninguna toma.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {todayIntakes.map((intake) => (
            <li key={intake.id} className="flex items-baseline justify-between gap-3">
              <span className="text-body text-text">{label(intake)}</span>
              <span className="text-body tabular-nums text-text-2">
                {formatTime(intake.takenAt)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Cargar medicamentos se hace desde Ajustes. Acá solo se registra una
          toma de lo que ya está cargado. */}
      <button
        type="button"
        onClick={onRegisterIntake}
        className="mt-1 flex min-h-target items-center justify-center rounded-btn border border-border-strong"
      >
        <span className="text-[17px] font-semibold text-accent">Registrar una toma</span>
      </button>
    </section>
  );
}
