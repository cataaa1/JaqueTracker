/**
 * Reemplazo vacío de canvg.
 *
 * jsPDF depende de canvg (y canvg de DOMPurify) para poder meter SVG dentro de
 * un PDF. El reporte de esta app no tiene ni un SVG: son texto y tablas.
 *
 * Dejarlo entrar costaba unos 175 KB de código que nunca se ejecuta, y ese
 * código trae un cargador de imágenes por `fetch`. En una app de datos de salud
 * que promete cero llamadas de red (RNF-01), la capacidad de hacerlas no
 * debería ni estar en el archivo publicado.
 *
 * Ver el alias en `vite.config.ts` y el mismo razonamiento en
 * `src/stubs/html2canvas.ts`.
 */

const message =
  'canvg está deshabilitado a propósito en este proyecto. El reporte se dibuja con texto y tablas, sin SVG. Ver src/stubs/canvg.ts.';

export class Canvg {
  constructor() {
    throw new Error(message);
  }
}

export const presets = {};

export default Canvg;
