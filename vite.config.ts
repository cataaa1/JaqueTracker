import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
