/** @type {import('tailwindcss').Config} */

const defaultTheme = require('tailwindcss/defaultTheme')

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Raleway', ...defaultTheme.fontFamily.sans],
        performanceMode: ['Outfit', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  safelist: [
    {
      pattern: /btn-.*/,
    },
  ],
  daisyui: {
    themes: ['dracula', 'cyberpunk'],
  },
  plugins: [require('daisyui')],
}
