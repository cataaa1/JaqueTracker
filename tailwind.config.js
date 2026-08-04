/**
 * Los colores no son hexadecimales acá: apuntan a las variables CSS de
 * src/styles/tokens.css. Gracias a eso una clase como `bg-surface` sirve en
 * modo claro y oscuro sin escribir variantes `dark:`.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        hairline: 'var(--hairline)',
        text: 'var(--text)',
        'text-2': 'var(--text-2)',
        accent: 'var(--accent)',
        'on-accent': 'var(--on-accent)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      // Escala tipográfica de la maqueta. El piso de lectura son 16 px (RNF-02);
      // `label` y `tab` están por debajo solo porque nunca son texto corrido.
      fontSize: {
        display: ['34px', { lineHeight: '1.1', fontWeight: '600' }],
        title: ['26px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        heading: ['19px', { lineHeight: '1.3', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.4', fontWeight: '500' }],
        body: ['16px', { lineHeight: '1.45', fontWeight: '400' }],
        label: ['14px', { lineHeight: '1.2', letterSpacing: '0.06em', fontWeight: '600' }],
        tab: ['13px', { lineHeight: '1.2', fontWeight: '600' }],
      },
      borderRadius: {
        chip: '12px',
        btn: '14px',
        badge: '15px',
        row: '18px',
        card: '20px',
        'card-lg': '22px',
        pill: '999px',
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
      },
      minHeight: {
        // Target táctil mínimo de la maqueta: 48 px, con piso duro en 44 (RNF-02).
        target: '48px',
      },
      minWidth: {
        target: '48px',
      },
    },
  },
  plugins: [],
};
