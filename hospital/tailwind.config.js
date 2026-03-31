/** @type {import('tailwindcss').Config} */
module.exports = {
  content: {
    relative: true,
    files: [
      './public/index.html',
      './src/*.{js,jsx,ts,tsx}',
      './src/components/*.{js,jsx,ts,tsx}',
      './src/pages/*.{js,jsx,ts,tsx}',
      './src/services/*.{js,jsx,ts,tsx}',
      './src/utils/*.{js,jsx,ts,tsx}',
    ],
  },
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        secondary: '#14B8A6',
        emergency: '#EF4444',
        'bg-default': '#F8FAFC',
        'text-dark': '#1E293B',
        'text-light': '#64748B',
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
