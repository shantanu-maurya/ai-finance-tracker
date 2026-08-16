/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Chart-safe palette shared with src/utils/chartTheme.js.
        primary: {
          50: '#eff6ff',
          100: '#cde2fb',
          200: '#9ec5f4',
          300: '#6da7ec',
          400: '#3987e5',
          500: '#2a78d6',
          600: '#256abf',
          700: '#1c5cab',
          800: '#184f95',
          900: '#104281'
        },
        secondary: {
          50: '#fdf3ee',
          100: '#fbe0d4',
          400: '#f08a5f',
          500: '#eb6834',
          600: '#d95926'
        },
        accent: {
          50: '#e9f9f2',
          100: '#c6f0e0',
          400: '#2ec48d',
          500: '#1baf7a',
          600: '#199e70'
        },
        surface: '#fcfcfb',
        plane: '#f9f9f7',
        ink: {
          DEFAULT: '#0b0b0b',
          secondary: '#52514e',
          muted: '#898781'
        },
        hairline: '#e1e0d9',
        baseline: '#c3c2b7',
        good: '#0ca30c',
        warning: '#fab219',
        serious: '#ec835a',
        critical: '#d03b3b'
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgba(11, 11, 11, 0.04), 0 1px 3px rgba(11, 11, 11, 0.06)'
      }
    }
  },
  plugins: []
};
