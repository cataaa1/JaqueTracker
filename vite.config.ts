import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // jsPDF trae dos funciones opcionales que esta app no usa:
    //   · `doc.html()`   → arrastra html2canvas
    //   · SVG en el PDF  → arrastra canvg, y canvg arrastra DOMPurify
    //
    // Juntas son unos 325 KB de código que nunca se ejecuta, y ese código
    // incluye cargadores de imágenes por `fetch` y por XMLHttpRequest. En una
    // app de datos de salud que promete cero llamadas de red (RNF-01), la
    // capacidad de hacerlas no debería ni estar en el archivo publicado: es la
    // diferencia entre "no las hace" y "no puede hacerlas".
    //
    // Verificado con las dos sustituciones puestas: el PDF sale con sus seis
    // bloques, dos páginas y las tildes bien.
    //
    // La barra inicial no es una ruta del disco: para Vite significa "desde la
    // raíz del proyecto". Se escribe así para no necesitar los tipos de Node
    // solo para armar una ruta absoluta en el archivo de configuración.
    alias: {
      html2canvas: '/src/stubs/html2canvas.ts',
      canvg: '/src/stubs/canvg.ts',
    },
  },
  build: {
    // Sin el polyfill de modulepreload no queda un solo `fetch(` en el bundle.
    // La app es un chunk único, así que no había nada que precargar; sacarlo
    // hace que RNF-01 ("cero llamadas de red") se pueda verificar de un vistazo
    // en la pestaña Network.
    modulePreload: { polyfill: false },
  },
  server: {
    // Permite abrir la app desde el iPhone usando la IP de la notebook.
    host: true,
  },
});
