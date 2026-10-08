/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fintech: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: 'rgba(226, 232, 240, 0.8)',
          'border-strong': '#CBD5E1',
          muted: '#64748B',
          subtle: '#94A3B8',
          heading: '#0F172A',
        },
        carbon: {
          950: '#07090E',
          900: '#0B0F17',
          850: '#0F1522',
          800: '#151D2A',
          700: '#1E293B',
          600: '#334155',
        },
        slateMesh: '#F1F5F9',
        recovered: {
          DEFAULT: '#059669', // Deep Emerald
          light: '#10B981',
          dark: '#047857',
          bg: '#ECFDF5',
          glow: 'rgba(5, 150, 105, 0.15)',
        },
        diagnosis: {
          DEFAULT: '#0891B2',
          light: '#06B6D4',
          dark: '#0E7490',
          bg: '#ECFEFF',
          glow: 'rgba(6, 182, 212, 0.15)',
        },
        safety: {
          DEFAULT: '#D97706', // Warm Amber
          light: '#F59E0B',
          dark: '#B45309',
          bg: '#FFFBEB',
          glow: 'rgba(217, 119, 6, 0.15)',
        },
        risk: {
          DEFAULT: '#E11D48', // Rose Crimson
          light: '#F43F5E',
          dark: '#BE123C',
          bg: '#FFF1F2',
          glow: 'rgba(225, 29, 72, 0.15)',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'SF Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 12px 0 rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.04)',
        'soft': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'glow-emerald': '0 0 20px -3px rgba(5, 150, 105, 0.25)',
        'glow-crimson': '0 0 20px -3px rgba(225, 29, 72, 0.25)',
        'glow-amber': '0 0 20px -3px rgba(217, 119, 6, 0.25)',
        'glow-cyan': '0 0 20px -3px rgba(8, 145, 178, 0.25)',
      },
      borderColor: {
        translucent: 'rgba(226, 232, 240, 0.8)',
        'translucent-high': 'rgba(203, 213, 225, 0.9)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer-sweep': 'shimmer 2.2s infinite linear',
        'radial-glow': 'radialPulse 6s ease-in-out infinite alternate',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        radialPulse: {
          '0%': { opacity: '0.4', transform: 'scale(0.96)' },
          '100%': { opacity: '0.8', transform: 'scale(1.04)' },
        },
      },
    },
  },
  plugins: [],
};
