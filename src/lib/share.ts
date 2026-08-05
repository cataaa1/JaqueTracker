/**
 * Entrega de un archivo generado en el dispositivo.
 *
 * A diferencia del resto de `lib/`, esto no es una función pura: habla con APIs
 * del navegador. Pero tampoco sabe nada de React, y la fase 6 va a necesitar lo
 * mismo para el respaldo en JSON, así que vive acá y no dentro de una pantalla.
 *
 * POR QUÉ NO ES UN SIMPLE "DESCARGAR"
 * En Safari de iOS bajar un blob no funciona como en escritorio: el archivo
 * puede terminar en ningún lado. Por eso se usa primero la Web Share API, que
 * abre la hoja de compartir del sistema y deja guardarlo en Archivos, mandarlo
 * por mail o imprimirlo. Recién si no está disponible se abre en una pestaña
 * nueva (PRD §8, nota de implementación, y CLAUDE.md §7).
 *
 * Nada de esto sale a la red: `navigator.share` es una API del sistema
 * operativo, no una llamada HTTP.
 */

export type DeliveryResult = 'shared' | 'cancelled' | 'opened';

export async function deliverFile(
  blob: Blob,
  fileName: string,
  mimeType: string,
): Promise<DeliveryResult> {
  const file = new File([blob], fileName, { type: mimeType });

  if (
    typeof navigator.canShare === 'function' &&
    typeof navigator.share === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (error: unknown) {
      // Que el usuario cierre la hoja de compartir no es un error: es una
      // decisión. Cualquier otra falla sí se propaga para que se vea en pantalla.
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      throw error;
    }
  }

  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');

  // El objeto URL se libera con demora: revocarlo enseguida cancelaría la
  // pestaña que todavía se está abriendo.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);

  return 'opened';
}
