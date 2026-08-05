import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Deja afuera dos funciones de jsPDF que esta app no usa.
 *
 *   · `doc.html()`  arrastra html2canvas
 *   · SVG en el PDF arrastra canvg, y canvg arrastra DOMPurify
 *
 * Juntas son unos 325 KB de código que nunca se ejecuta, y ese código incluye
 * cargadores de imágenes por `fetch` y por XMLHttpRequest. En una app de datos
 * de salud que promete cero llamadas de red (RNF-01), la capacidad de hacerlas
 * no debería ni estar en el archivo publicado: es la diferencia entre "no las
 * hace" y "no puede hacerlas".
 *
 * Verificado con las dos sustituciones puestas: el PDF sale con sus seis
 * bloques, dos páginas y las tildes bien.
 *
 * POR QUÉ UN PLUGIN Y NO UN `resolve.alias`
 * Un alias necesita una ruta absoluta del disco. Una relativa a la raíz
 * (`/src/stubs/...`) funciona al compilar pero falla en el modo dev, porque el
 * pre-empaquetado de dependencias la resuelve desde `node_modules` y no
 * encuentra nada. Armar la ruta absoluta obligaría a instalar `@types/node`
 * solo para eso. Un módulo virtual no tiene ruta: no hay nada que resolver.
 *
 * El `\0` del principio es la convención de Rollup y Vite para decir "este id
 * es mío, ningún otro plugin lo toque".
 *
 * Si alguna vez hiciera falta `doc.html()` o meter un SVG, hay que sacar este
 * plugin y volver a dejar entrar las librerías de verdad. Los reemplazos tiran
 * un error explicándolo en vez de fallar en silencio.
 */
function stubUnusedJsPdfFeatures(): Plugin {
  const stubs: Record<string, string> = {
    html2canvas: `
      const message = 'html2canvas está deshabilitado a propósito en este proyecto: el reporte se dibuja con texto y tablas, no con capturas. Ver vite.config.ts.';
      export default function html2canvas() { throw new Error(message); }
    `,
    canvg: `
      const message = 'canvg está deshabilitado a propósito en este proyecto: el reporte no lleva SVG. Ver vite.config.ts.';
      export class Canvg { constructor() { throw new Error(message); } }
      export const presets = {};
      export default Canvg;
    `,
  };

  const prefix = '\0jaque-stub:';

  return {
    name: 'jaque-stub-unused-jspdf-features',
    enforce: 'pre',
    resolveId(source) {
      return source in stubs ? prefix + source : null;
    },
    load(id) {
      if (!id.startsWith(prefix)) return null;
      return stubs[id.slice(prefix.length)] ?? null;
    },
  };
}

export default defineConfig({
  plugins: [stubUnusedJsPdfFeatures(), react()],
  build: {
    // Sin el polyfill de modulepreload no queda un solo `fetch(` propio en el
    // bundle. La app es chica, así que no había nada que precargar; sacarlo
    // hace que RNF-01 ("cero llamadas de red") se pueda verificar de un vistazo
    // en la pestaña Network.
    modulePreload: { polyfill: false },
  },
  optimizeDeps: {
    // El pre-empaquetado de dependencias del modo dev corre antes que los
    // plugins normales. Sin esto, en `npm run dev` entrarían las librerías de
    // verdad y el modo dev no se parecería a lo que se publica.
    exclude: ['html2canvas', 'canvg'],
  },
  server: {
    // Permite abrir la app desde el iPhone usando la IP de la notebook.
    host: true,
  },
});
