// client/tailwind.config.cjs
module.exports = {
  darkMode: 'class', // Enable class-based dark mode strategy
  content: [
    './index.html', 
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          50: '#f9fafb',    // Light mode background
          100: '#f3f4f6',   // Light mode secondary background
          200: '#e5e7eb',   // Light mode button
          300: '#d1d5db',
          600: '#4b5563',
          700: '#374151',   // Dark mode button
          800: '#1f2937',   // Dark mode secondary background
          900: '#111827',   // Dark mode background
        },
        blue: {
          500: '#1e88e5',   // BRAC University lighter blue
          600: '#0a50a7',   // BRAC University primary blue
          700: '#084793',   // BRAC University darker blue
          800: '#063e80',   // BRAC University darkest blue
        },
        bracu: {
          blue: '#0a50a7',  // BRAC University primary blue
          navy: '#00274c',  // BRAC University navy
          gray: '#4D4D4D',  // BRAC University gray
          lightgray: '#E6E6E6', // BRAC University light gray
        },
        green: {
          600: '#16a34a',
          700: '#15803d',
        },
        red: {
          600: '#dc2626',
          700: '#b91c1c',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.5s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
  // These classes are always included in the CSS to prevent issues when toggling
  safelist: [
    'dark',
    'bg-gray-50', 'dark:bg-gray-900',
    'text-gray-800', 'dark:text-gray-100',
    'bg-gray-200', 'dark:bg-gray-700',
    'animate-fade-in', 'animate-slide-in', 'animate-pulse-slow'
  ]
}