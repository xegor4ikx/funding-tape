/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Warm financial-print palette — no dark mode, no neon.
        paper: '#F4F1EA',       // warm broadsheet ground
        panel: '#EDE9DE',       // slightly recessed panel
        rule: '#D6CFBF',        // hairline rules
        ruleSoft: '#E3DDD0',    // faint inner grid
        ink: '#1B1813',         // warm near-black, body ink
        inkSoft: '#5A544A',     // muted captions / labels
        inkFaint: '#8C8475',    // tertiary
        pos: '#1F6B43',         // newspaper green (longs paying)
        posSoft: '#CFE0D2',
        neg: '#9E2B25',         // oxblood (shorts paying)
        negSoft: '#E9D2CD',
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'Times New Roman', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        masthead: '0.02em',
      },
      fontWeight: {
        400: '400',
        500: '500',
        600: '600',
      },
      maxWidth: {
        broadsheet: '1180px',
      },
    },
  },
  plugins: [],
}
