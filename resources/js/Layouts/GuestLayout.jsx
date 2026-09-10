import { ThemeProvider, useTheme } from "@/Contexts/ThemeContext";
import { Link } from "@inertiajs/react";
import {
    Camera,
    MessageCircle,
    Moon,
    Printer,
    Sparkles,
    Sun,
} from "lucide-react";

function GuestLayoutContent({ children }) {
    const { darkMode, toggleTheme } = useTheme();

    return (
        <div className="flex min-h-screen bg-light-bg dark:bg-dark-bg">
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-500 to-blue-400 relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                    <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-2xl"></div>
                </div>

                <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
                    <div className="mb-8">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-2xl">
                            <Camera className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-center">
                            Resins By Ru and Ru Creates
                        </h1>
                        <p className="text-blue-100 text-center mt-2">
                            Management System
                        </p>
                    </div>

                    <div className="space-y-4 max-w-sm">
                        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold">
                                    Dual Module Workflow
                                </h3>
                                <p className="text-sm text-blue-100">
                                    Printing and projects operations
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                <Printer className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold">
                                    Billing & Inventory
                                </h3>
                                <p className="text-sm text-blue-100">
                                    Quotations, invoices, stock and wholesale
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                <MessageCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold">
                                    WhatsApp Communication
                                </h3>
                                <p className="text-sm text-blue-100">
                                    Send quotations and invoices faster
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative">
                <button
                    onClick={toggleTheme}
                    className="absolute top-6 right-6 p-3 rounded-xl bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-transform duration-200 shadow-lg border border-gray-200 dark:border-slate-700 hover:scale-105"
                    aria-label="Toggle theme"
                >
                    {darkMode ? (
                        <Sun className="w-5 h-5 text-yellow-500" />
                    ) : (
                        <Moon className="w-5 h-5 text-slate-600" />
                    )}
                </button>

                <div className="lg:hidden mb-8">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Camera className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-xl text-gray-900 dark:text-white">
                                Resins By Ru and Ru Creates
                            </h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Management System
                            </p>
                        </div>
                    </Link>
                </div>

                <div className="w-full max-w-md">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 p-8">
                        {children}
                    </div>

                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                        © 2026 Resins By Ru and Ru Creates.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function GuestLayout({ children }) {
    return (
        <ThemeProvider>
            <GuestLayoutContent>{children}</GuestLayoutContent>
        </ThemeProvider>
    );
}
