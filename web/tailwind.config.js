/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        primary: "#497BEF"
      },
      fontSize: {
        xxs: "0.625rem",
        smd: "0.94rem"
      }
    }
  },
  plugins: [
    require("tailwind-scrollbar")({ nocompatible: true }),
    require("@tailwindcss/typography")
  ]
};