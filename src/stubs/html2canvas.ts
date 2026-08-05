/**
 * Reemplazo vacío de html2canvas.
 *
 * jsPDF depende de html2canvas para su método `doc.html()`, que convierte un
 * pedazo de página en imagen. Esta app no lo usa: el reporte se dibuja con
 * primitivas (texto y tablas), no con capturas.
 *
 * El problema de dejarlo entrar es doble: son unos 150 KB de código que nunca
 * se ejecuta, y ese código trae un cargador de imágenes por XMLHttpRequest. En
 * una app de datos de salud que promete cero llamadas de red (RNF-01), conviene
 * que la capacidad de hacerlas ni siquiera esté en el archivo.
 *
 * `vite.config.ts` redirige `html2canvas` acá. Si alguna vez hiciera falta
 * `doc.html()`, hay que sacar ese alias y volver a instalar la librería de
 * verdad; este error lo deja dicho en voz alta en vez de fallar en silencio.
 */

export default function html2canvasStub(): never {
  throw new Error(
    'html2canvas está deshabilitado a propósito en este proyecto. El reporte se dibuja con texto y tablas, no con capturas de pantalla. Ver src/stubs/html2canvas.ts.',
  );
}
