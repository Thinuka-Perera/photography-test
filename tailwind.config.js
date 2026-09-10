import forms from "@tailwindcss/forms";
import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: "class",
    content: [
        "./vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php",
        "./storage/framework/views/*.php",
        "./resources/views/**/*.blade.php",
        "./resources/js/**/*.jsx",
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "Figtree", ...defaultTheme.fontFamily.sans],
            },
            colors: {
                // Light mode colors
                light: {
                    bg: "#F8F9FA",
                    card: "#FFFFFF",
                    text: "#1F2937",
                },
                // Dark mode colors
                dark: {
                    bg: "#0F172A",
                    card: "#1E293B",
                    text: "#F8FAFC",
                },
                // Primary brand color (Blue)
                primary: {
                    50: "#EFF6FF",
                    100: "#DBEAFE",
                    200: "#BFDBFE",
                    300: "#93C5FD",
                    400: "#60A5FA",
                    500: "#3B82F6",
                    600: "#2563EB",
                    700: "#1D4ED8",
                    800: "#1E40AF",
                    900: "#1E3A8A",
                },
                // Success (green for positive indicators)
                success: {
                    50: "#ECFDF5",
                    500: "#10B981",
                    600: "#059669",
                },
                // Danger (red for negative indicators)
                danger: {
                    50: "#FEF2F2",
                    500: "#EF4444",
                    600: "#DC2626",
                },
                // Warning (amber/yellow)
                warning: {
                    50: "#FFFBEB",
                    500: "#F59E0B",
                    600: "#D97706",
                },
            },
        },
    },

    plugins: [forms],
};
