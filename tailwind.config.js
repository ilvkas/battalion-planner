/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    red: '#D52B1E', // Swiss Red
                    dark: '#1a1a1a',
                }
            }
        },
    },
    plugins: [],
}
