import { usePage } from "@inertiajs/react";
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";

// ─────────────────────────────────────────────
// Toast Component
//
// Reads flash messages from Inertia's shared props (set via Laravel session).
// Automatically shows on every successful CRUD operation and disappears after 4s.
//
// Usage in controllers (no frontend changes needed):
//   return back()->with('success', 'Product created!');
//   return back()->with('error',   'Something went wrong.');
//   return back()->with('warning', 'Stock is low.');
//
// Add <Toast /> once in MainLayout — it works globally.
// ─────────────────────────────────────────────

// Config for each toast type
const TOAST_CONFIG = {
    success: {
        icon: CheckCircle2,
        bg:   "bg-emerald-500",
        border: "border-emerald-600",
        iconCls: "text-white",
    },
    error: {
        icon: AlertCircle,
        bg:   "bg-red-500",
        border: "border-red-600",
        iconCls: "text-white",
    },
    warning: {
        icon: AlertTriangle,
        bg:   "bg-amber-500",
        border: "border-amber-600",
        iconCls: "text-white",
    },
};

// Single toast item
function ToastItem({ type, message, onClose }) {
    const config = TOAST_CONFIG[type] ?? TOAST_CONFIG.success;
    const Icon   = config.icon;

    // Auto-dismiss after 4 seconds
    useEffect(() => {
        const t = setTimeout(onClose, 4000);
        return () => clearTimeout(t);
    }, [onClose]);

    return (
        <div
            className={`
                relative flex items-center gap-3 px-4 py-3.5 rounded-xl shadow-lg
                ${config.bg} ${config.border} border text-white
                animate-in
                min-w-[280px] max-w-[380px]
            `}
        >
            {/* Type icon */}
            <Icon className={`w-5 h-5 flex-shrink-0 ${config.iconCls}`} />

            {/* Message */}
            <p className="flex-1 text-sm font-medium">{message}</p>

            {/* Manual close button */}
            <button
                onClick={onClose}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-white/20 transition-colors"
            >
                <X className="w-3.5 h-3.5" />
            </button>

            {/* Auto-dismiss progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/30 rounded-b-xl overflow-hidden">
                <div
                    className="h-full bg-white/60 animate-shrink"
                    style={{ animationDuration: "4000ms" }}
                />
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Main Toast container — reads flash from Inertia page props
// ─────────────────────────────────────────────
export default function Toast() {
    const { flash } = usePage().props;

    // Local toast queue — supports stacking multiple messages
    const [toasts, setToasts] = useState([]);

    // Watch for new flash messages from Inertia (each page visit)
    useEffect(() => {
        const newToasts = [];

        if (typeof flash?.success === "string" && flash.success.trim() !== "") {
            newToasts.push({ id: Date.now(), type: "success", message: flash.success });
        } else if (flash?.success === true && flash?.message) {
            newToasts.push({ id: Date.now(), type: "success", message: flash.message });
        } else if (flash?.success === false && flash?.message) {
            newToasts.push({ id: Date.now(), type: "error", message: flash.message });
        } else if (!flash?.success && flash?.message) {
            newToasts.push({ id: Date.now(), type: "success", message: flash.message });
        }
        if (flash?.error) {
            newToasts.push({ id: Date.now() + 1, type: "error",   message: flash.error });
        }
        if (flash?.warning) {
            newToasts.push({ id: Date.now() + 2, type: "warning", message: flash.warning });
        }

        if (newToasts.length > 0) {
            setToasts((prev) => [...prev, ...newToasts]);
        }
    }, [flash]);

    const dismiss = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    if (toasts.length === 0) return null;

    return (
        // Fixed bottom-right stack, z-50 to stay above modals
        <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-2 items-end">
            {toasts.map((toast) => (
                <ToastItem
                    key={toast.id}
                    type={toast.type}
                    message={toast.message}
                    onClose={() => dismiss(toast.id)}
                />
            ))}
        </div>
    );
}
