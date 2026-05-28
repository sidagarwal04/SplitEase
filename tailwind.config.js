/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0A0F1E',
          elevated: '#0F162B',
          card: '#111A33',
          subtle: '#0C1326',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.06)',
          strong: 'rgba(255,255,255,0.12)',
        },
        accent: {
          DEFAULT: '#00D4AA',
          soft: 'rgba(0,212,170,0.12)',
          glow: 'rgba(0,212,170,0.35)',
        },
        secondary: {
          DEFAULT: '#6366F1',
          soft: 'rgba(99,102,241,0.12)',
        },
        danger: {
          DEFAULT: '#F87171',
          soft: 'rgba(248,113,113,0.12)',
        },
        warning: {
          DEFAULT: '#FBBF24',
          soft: 'rgba(251,191,36,0.12)',
        },
        text: {
          DEFAULT: '#E6EAF2',
          muted: '#8A93A6',
          subtle: '#5C667D',
        },
      },
      fontFamily: {
        display: ['"Cabinet Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['"Outfit"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(0,212,170,0.35), 0 8px 32px -8px rgba(0,212,170,0.25)',
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px -16px rgba(0,0,0,0.6)',
        cardHover: '0 1px 0 rgba(255,255,255,0.06) inset, 0 12px 40px -12px rgba(0,212,170,0.2)',
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(ellipse at top, rgba(0,212,170,0.06), transparent 60%), radial-gradient(ellipse at bottom right, rgba(99,102,241,0.06), transparent 50%)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%,100%': { opacity: 0.6 },
          '50%': { opacity: 1 },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s linear infinite',
        pulseSoft: 'pulseSoft 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
