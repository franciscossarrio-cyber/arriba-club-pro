/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "surface": "#f7f9fb",
        "surface-container": "#eceef0",
        "surface-container-low": "#f2f4f6",
        "surface-container-high": "#e6e8ea",
        "surface-container-lowest": "#ffffff",
        "outline": "#777587",
        "outline-variant": "#c7c4d8",
        "primary": "#3525cd",
        "primary-container": "#4f46e5",
        "secondary": "#712ae2",
        "secondary-container": "#8a4cfc",
        "tertiary": "#00505f",
        "tertiary-container": "#006a7c",
        "on-surface": "#191c1e",
        "on-surface-variant": "#464555",
        "on-primary": "#ffffff",
        "error": "#ba1a1a",
        "success": "#10b981",
        "warning": "#f59e0b"
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"]
      },
    },
  },
  plugins: [],
}
