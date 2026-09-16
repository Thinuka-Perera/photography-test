import { Link } from "@inertiajs/react";
import {
    Clock,
    FilePlus,
    PauseCircle,
    ReceiptText,
    Search,
} from "lucide-react";

const TABS = [
    { id: "manual", label: "Custom Entry" },
    { id: "creation", label: "Creation Charges", gated: true },
    { id: "inventory", label: "Inventory" },
    { id: "packages", label: "Packages" },
    { id: "invoices", label: "Manual Invoices" },
];

/**
 * @param {{
 *   activeTabId: string,
 *   onTabChange: (id: string) => void,
 *   canManageCommissions: boolean,
 *   onNewTransaction: () => void,
 *   onHold: () => void,
 *   onLoadHeld: () => void,
 *   heldCount: number,
 *   onFindItem: () => void,
 *   historyHref: string,
 * }} props
 */
export default function PosActionBar({
    activeTabId,
    onTabChange,
    canManageCommissions,
    onNewTransaction,
    onHold,
    onLoadHeld,
    heldCount = 0,
    onFindItem,
    historyHref,
}) {
    const tabs = TABS.filter((t) => !t.gated || canManageCommissions);

    return (
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/60 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Tab switcher */}
            <div className="flex flex-wrap items-center gap-1.5">
                {tabs.map((tab) => {
                    const active = activeTabId === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => onTabChange(tab.id)}
                            aria-pressed={active}
                            className={`flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all ${
                                active
                                    ? "bg-primary-600 text-white shadow-md"
                                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={onNewTransaction}
                    className="flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                    <FilePlus className="h-5 w-5" strokeWidth={1.75} />
                    New
                </button>

                <button
                    type="button"
                    onClick={onHold}
                    className="flex min-h-[44px] items-center gap-2 rounded-xl bg-amber-50 px-4 text-sm font-semibold text-amber-600 transition-colors hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30"
                >
                    <PauseCircle className="h-5 w-5" strokeWidth={1.75} />
                    Hold
                </button>

                <button
                    type="button"
                    onClick={onLoadHeld}
                    className="relative flex min-h-[44px] items-center gap-2 rounded-xl bg-amber-50 px-4 text-sm font-semibold text-amber-600 transition-colors hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30"
                >
                    <Clock className="h-5 w-5" strokeWidth={1.75} />
                    Held
                    {heldCount > 0 && (
                        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-white shadow-md">
                            {heldCount}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={onFindItem}
                    className="flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                    <Search className="h-5 w-5" strokeWidth={1.75} />
                    Find
                </button>

                <div className="mx-1 h-8 w-px bg-slate-200 dark:bg-slate-700" />

                <Link
                    href={historyHref}
                    className="flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                    <ReceiptText className="h-5 w-5" strokeWidth={1.75} />
                    <span className="hidden lg:inline">History</span>
                </Link>
            </div>
        </div>
    );
}
