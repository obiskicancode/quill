import type { Config } from 'tailwindcss';

/** Every colour is a CSS variable (see app/globals.css) so the brand can be swapped in one place. */
const token = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    screens: { sm: '390px', md: '768px', lg: '1024px', xl: '1440px' },
    extend: {
      colors: {
        ink: token('ink'),
        'ink-soft': token('ink-soft'),
        muted: token('muted'),
        paper: token('paper'),
        surface: token('surface'),
        line: token('line'),
        accent: token('accent'),
        'accent-hover': token('accent-hover'),
        'accent-pressed': token('accent-pressed'),
        'accent-ink': token('accent-ink'),
        whatsapp: token('whatsapp'),
        'whatsapp-hover': token('whatsapp-hover'),
        danger: token('danger'),
        success: token('success'),
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: [
          'clamp(2.5rem, 1.7rem + 3.6vw, 4.5rem)',
          { lineHeight: '1.04', letterSpacing: '-0.015em' },
        ],
        h2: [
          'clamp(1.875rem, 1.45rem + 1.8vw, 2.75rem)',
          { lineHeight: '1.12', letterSpacing: '-0.01em' },
        ],
        h3: ['1.375rem', { lineHeight: '1.3' }],
        'body-lg': ['1.125rem', { lineHeight: '1.65' }],
        body: ['1rem', { lineHeight: '1.6' }],
        small: ['0.875rem', { lineHeight: '1.5' }],
        caption: ['0.75rem', { lineHeight: '1.4' }],
      },
      borderRadius: {
        control: 'var(--radius-control)',
        card: 'var(--radius-card)',
      },
      boxShadow: {
        raised: 'var(--shadow-raised)',
        float: 'var(--shadow-float)',
      },
      maxWidth: { page: '80rem' },
    },
  },
  plugins: [],
};

export default config;
