/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
        gave: {
          light: '#fef2f2',
          DEFAULT: '#dc2626',
          dark: '#b91c1c',
          text: '#991b1b',
          bg: '#fee2e2'
        },
        got: {
          light: '#f0fdf4',
          DEFAULT: '#16a34a',
          dark: '#15803d',
          text: '#166534',
          bg: '#dcfce7'
        }
      },
      fontFamily: {
        sans: ['var(--font-poppins)', 'Poppins', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
