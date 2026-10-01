/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colombia Blue Museum Theme
        museum: {
          blue: {
            50: '#f0f9ff',
            100: '#e0f2fe', 
            200: '#bae6fd',
            300: '#7dd3fc',
            400: '#38bdf8',
            500: '#0ea5e9', // Colombia Blue primary
            600: '#0284c7',
            700: '#0369a1',
            800: '#075985',
            900: '#0c4a6e',
          },
          sand: {
            50: '#fdf8f6',
            100: '#f2e8e0',
            200: '#e8d5c4',
            300: '#d4a574',
            400: '#c19660',
            500: '#b8935f', // Museum sand
            600: '#9c7c47',
            700: '#7d6238',
            800: '#634e33',
            900: '#4a3a25',
          },
          gold: {
            50: '#fffdf0',
            100: '#fefce8',
            200: '#fef9c3',
            300: '#fef08a',
            400: '#fde047',
            500: '#facc15', // Museum gold
            600: '#eab308',
            700: '#ca8a04',
            800: '#a16207',
            900: '#854d0e',
          },
          bronze: {
            50: '#fef7f0',
            100: '#fdede3',
            200: '#fbd7bb',
            300: '#f8bb7e',
            400: '#f59446',
            500: '#d97706', // Museum bronze
            600: '#b45309',
            700: '#92400e',
            800: '#78350f',
            900: '#5c2e0a',
          },
          stone: {
            50: '#f8fafc',
            100: '#f1f5f9',
            200: '#e2e8f0',
            300: '#cbd5e1',
            400: '#94a3b8',
            500: '#64748b', // Museum stone
            600: '#475569',
            700: '#334155',
            800: '#1e293b',
            900: '#0f172a',
          },
        },
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        telegram: {
          bg: '#17212b',
          secondary: '#242f3d',
          text: '#ffffff',
          hint: '#708499',
          link: '#62bcf9',
          button: '#5288c1',
        },
      },
      animation: {
        'flip': 'flip 0.25s ease-in-out',
        'match': 'match 0.4s ease-in-out',
        'shake': 'shake 0.3s ease-in-out',
        'bounce-in': 'bounceIn 0.4s ease-out',
      },
      keyframes: {
        flip: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        match: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-10px)' },
          '75%': { transform: 'translateX(10px)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

