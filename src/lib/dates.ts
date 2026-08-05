/**
 * Fechas: conversión, formato y "días locales".
 *
 * Funciones puras, sin React y sin tocar la base: se pueden probar solas.
 *
 * CONVENCIÓN DE ALMACENAMIENTO
 * En la base se guarda siempre ISO 8601 en UTC (`2026-08-04T17:20:00.000Z`),
 * que es lo que devuelve `Date.toISOString()`. UTC es un instante absoluto, sin
 * ambigüedad.
 *
 * Pero un "día con cefalea" NO es un día UTC: es un día del calendario del
 * usuario. Un episodio a las 22:00 del 4 de agosto en Buenos Aires es el 5 de
 * agosto en UTC, y contarlo ahí correría toda la estadística un día. Por eso
 * todo lo que agrupa por día pasa por `localDayKey()`, que convierte a la zona
 * horaria del dispositivo antes de recortar la fecha.
 *
 * (Consecuencia asumida: si el usuario viaja de zona horaria, los episodios
 * viejos se muestran en la hora de la zona nueva. Para un diario personal en un
 * solo teléfono es aceptable; anotarlo acá por si algún día deja de serlo.)
 */

import {
  differenceInMinutes,
  eachDayOfInterval,
  format,
  formatDistanceToNowStrict,
  isSameDay,
  isSameYear,
  parseISO,
  subDays,
} from 'date-fns';
import { es } from 'date-fns/locale';

/** Instante actual, listo para guardar. */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Clave de día local: `2026-08-04`. Dos instantes distintos del mismo día del
 * calendario del usuario dan la misma clave; es la unidad de "días con cefalea".
 */
export function localDayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Todas las claves de día local que un episodio toca, de principio a fin.
 * Un episodio que empieza a las 23:30 y termina a las 01:00 cuenta como dos
 * días, que es como lo cuenta la clínica.
 *
 * `endedAt` en `null` significa "no se registró cuándo terminó", y cuenta un
 * solo día: el de inicio.
 *
 * OJO, ACÁ HUBO UN ERROR CARO: antes `null` se interpretaba como "sigue en
 * curso" y se contaba hasta el día de hoy. Mientras existía el episodio en
 * curso eso era correcto. Cuando se sacó del formulario la pregunta "¿ya se te
 * pasó?", todos los episodios pasaron a tener `endedAt` en null y un episodio
 * de hace 79 días sumaba 79 días con cefalea. La métrica principal del producto
 * quedaba inflada tres veces.
 */
export function localDayKeysTouched(startedAt: string, endedAt: string | null): string[] {
  const start = parseISO(startedAt);
  if (endedAt === null) return [localDayKey(start)];

  const end = parseISO(endedAt);

  // Un `endedAt` anterior al `startedAt` sería un dato corrupto; no explotamos
  // por eso, devolvemos al menos el día de inicio.
  if (end < start) return [localDayKey(start)];

  return eachDayOfInterval({ start, end }).map(localDayKey);
}

// ─── Conversión con el campo <input type="datetime-local"> ───────────────────
// Ese input no habla ISO/UTC: habla `2026-08-04T14:20` en hora local. Estas dos
// funciones son el único lugar donde se hace la traducción.

export function isoToDateTimeLocalInput(iso: string): string {
  return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm");
}

export function dateTimeLocalInputToIso(value: string): string {
  // `new Date('2026-08-04T14:20')` sin zona horaria lo interpreta como hora
  // local, que es exactamente lo que escribió el usuario.
  return new Date(value).toISOString();
}

/** ¿El texto del input es una fecha que existe? Los campos vacíos dan `false`. */
export function isValidDateTimeLocalInput(value: string): boolean {
  if (value === '') return false;
  return !Number.isNaN(new Date(value).getTime());
}

// ─── Formato para pantalla ───────────────────────────────────────────────────

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * "Hoy" y "ayer" respecto de un `now` que se pasa por parámetro.
 *
 * A propósito no se usan `isToday`/`isYesterday` de date-fns: esas comparan
 * siempre contra el reloj del sistema e ignorarían el `now` recibido, lo que
 * deja estas funciones imposibles de probar y el parámetro mintiendo.
 */
function isSameDayAs(date: Date, reference: Date): boolean {
  return isSameDay(date, reference);
}

/** `Hoy, 14:20` · `Ayer, 14:20` · `1 de agosto, 8:05` · `1 de agosto de 2025, 8:05` */
export function formatEpisodeStart(iso: string, now: Date = new Date()): string {
  const date = parseISO(iso);
  const time = format(date, 'H:mm', { locale: es });

  if (isSameDayAs(date, now)) return `Hoy, ${time}`;
  if (isSameDayAs(date, subDays(now, 1))) return `Ayer, ${time}`;

  const day = isSameYear(date, now)
    ? format(date, "d 'de' MMMM", { locale: es })
    : format(date, "d 'de' MMMM 'de' yyyy", { locale: es });

  return `${day}, ${time}`;
}

/** `Mié 5 · 14:20` — el formato corto de las filas de la maqueta. */
export function formatEpisodeShort(iso: string): string {
  const date = parseISO(iso);
  return `${capitalize(format(date, 'EEE', { locale: es }))} ${date.getDate()} · ${format(date, 'H:mm', { locale: es })}`;
}

/** `martes 4 de agosto, 14:20` — el encabezado del detalle. */
export function formatEpisodeLong(iso: string): string {
  const date = parseISO(iso);
  return format(date, "EEEE d 'de' MMMM, H:mm", { locale: es });
}

/** `Agosto 2026` — el encabezado de mes que separa el historial. */
export function formatMonthAndYear(iso: string): string {
  const date = parseISO(iso);
  return `${capitalize(format(date, 'MMMM', { locale: es }))} ${date.getFullYear()}`;
}

/** `14:20` — solo la hora, para la tarjeta del episodio en curso. */
export function formatTime(iso: string): string {
  return format(parseISO(iso), 'H:mm', { locale: es });
}

/** `hace 2 horas` · `hace 35 minutos` */
export function formatElapsedSince(iso: string): string {
  return formatDistanceToNowStrict(parseISO(iso), { addSuffix: true, locale: es });
}

/** `Miércoles 4 de agosto`, con la primera letra en mayúscula. */
export function formatTodayHeader(now: Date = new Date()): string {
  return capitalize(format(now, "EEEE d 'de' MMMM", { locale: es }));
}

/** `Agosto` — el encabezado de la tarjeta de resumen del mes. */
export function formatMonthName(date: Date): string {
  return capitalize(format(date, 'MMMM', { locale: es }));
}

/** `Martes 4` — el encabezado de cada día en el marcado retroactivo. */
export function formatDayHeader(date: Date, now: Date = new Date()): string {
  if (isSameDayAs(date, now)) return 'Hoy';
  if (isSameDayAs(date, subDays(now, 1))) return 'Ayer';
  return capitalize(
    isSameYear(date, now)
      ? format(date, "EEEE d 'de' MMMM", { locale: es })
      : format(date, "EEEE d 'de' MMMM 'de' yyyy", { locale: es }),
  );
}

/** Duración legible de un episodio ya cerrado: `2 h 15 min` · `40 min`. */
export function formatDuration(startedAt: string, endedAt: string): string {
  const minutes = Math.max(0, differenceInMinutes(parseISO(endedAt), parseISO(startedAt)));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}
