/** @type {import('tailwindcss').Config} */
const tailwindConfig = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        '3xl': '1920px', // Full HD / 2K
        '4xl': '2560px', // 2K / QHD
        '5xl': '3840px', // 4K / UHD
      },
    },
  },
  plugins: [],
}

export default tailwindConfig
