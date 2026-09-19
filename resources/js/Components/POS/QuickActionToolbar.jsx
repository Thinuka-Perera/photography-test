import React from "react";

import {
    DollarSign,
    Hash,
    Percent,
    FilePlus2,
    Barcode,
    Package,
    Search,
    PauseCircle,
    FolderOpen,
    BriefcaseBusiness,
    Printer,
    Users,
    UserRound,
    ClipboardList,
    RotateCcw,
    Boxes,
    Banknote,
    Receipt,
    LogOut,
    Lock,
    Maximize,
} from "lucide-react";

export default function QuickActionToolbar({
    // =========================
    // FIRST ROW
    // =========================
    onNewTransaction,
    onScanItems,
    onFindItem,
    onHoldTransaction,
    onLoadTransaction,
    onChangeQty,
    onChangeRate,
    onBillDiscount,
    onProduct,
    onBackOffice,
    onBillReprint,

    // =========================
    // SECOND ROW
    // =========================
    onCreditCustomer,
    onSalesman,
    onQuotation,
    onSalesReturn,
    onStockUpdate,
    onOpenCashDrawer,
    onExpensePaidOut,
    onCloseShift,
    onLogout,
    onLockScreen,

    // =========================
    // FULLSCREEN
    // =========================
    onToggleFullscreen,
}) {
    const actions = [
        // =====================================================
        // FIRST ROW
        // =====================================================

        {
            label: "Change Rate",
            shortcut: "F1",
            icon: DollarSign,
            iconStyle:
                "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
            action: onChangeRate,
        },

        {
            label: "Change Qty",
            shortcut: "F2",
            icon: Hash,
            iconStyle:
                "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
            action: onChangeQty,
        },

        {
            label: "Bill Discount",
            shortcut: "F4",
            icon: Percent,
            iconStyle:
                "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
            action: onBillDiscount,
        },

        {
            label: "New Trans",
            shortcut: "F7",
            icon: FilePlus2,
            iconStyle:
                "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
            action: onNewTransaction,
        },

        {
            label: "Scan Items",
            icon: Barcode,
            iconStyle:
                "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
            action: onScanItems,
        },

        {
            label: "Product",
            icon: Package,
            iconStyle:
                "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
            action: onProduct,
        },

        {
            label: "Find Item",
            shortcut: "F9",
            icon: Search,
            iconStyle:
                "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
            action: onFindItem,
        },

        {
            label: "Hold Trans",
            shortcut: "F10",
            icon: PauseCircle,
            iconStyle:
                "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
            action: onHoldTransaction,
        },

        {
            label: "Load Trans",
            icon: FolderOpen,
            iconStyle:
                "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400",
            action: onLoadTransaction,
        },

        {
            label: "Back Office",
            icon: BriefcaseBusiness,
            iconStyle:
                "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
            action: onBackOffice,
        },

        {
            label: "Bill Reprint",
            icon: Printer,
            iconStyle:
                "bg-pink-50 text-pink-600 dark:bg-pink-500/15 dark:text-pink-400",
            action: onBillReprint,
        },

        // =====================================================
        // SECOND ROW
        // =====================================================

        {
            label: "Credit Customer",
            icon: Users,
            iconStyle:
                "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400",
            action: onCreditCustomer,
        },

        {
            label: "Salesman",
            icon: UserRound,
            iconStyle:
                "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
            action: onSalesman,
        },

        {
            label: "Quotation",
            icon: ClipboardList,
            iconStyle:
                "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
            action: onQuotation,
        },

        {
            label: "Sales Return",
            icon: RotateCcw,
            iconStyle:
                "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
            action: onSalesReturn,
        },

        {
            label: "Stock Update",
            icon: Boxes,
            iconStyle:
                "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
            action: onStockUpdate,
        },

        {
            label: "Open Cash Drawer",
            icon: Banknote,
            iconStyle:
                "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
            action: onOpenCashDrawer,
        },

        {
            label: "Expense/Paid Out",
            icon: Receipt,
            iconStyle:
                "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
            action: onExpensePaidOut,
        },

        {
            label: "Close Shift",
            icon: LogOut,
            iconStyle:
                "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
            action: onCloseShift,
        },

        {
            label: "Logout",
            icon: LogOut,
            iconStyle:
                "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400",
            action: onLogout,
        },

        {
            label: "Lock Screen",
            icon: Lock,
            iconStyle:
                "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
            action: onLockScreen,
        },

        {
            label: "Fullscreen",
            shortcut: "F11",
            icon: Maximize,
            iconStyle:
                "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-400",
            action: onToggleFullscreen,
        },
    ];

    // =========================================================
    // BUTTON CLICK
    // =========================================================

    const handleActionClick = (event, item) => {
        event.preventDefault();
        event.stopPropagation();

        if (typeof item.action === "function") {
            item.action();
        }
    };

    return (
        <div
            className="
                mb-5
                rounded-2xl
                border border-slate-200
                bg-white
                p-3
                shadow-sm

                dark:border-slate-700
                dark:bg-slate-900
                dark:shadow-none
            "
        >
            <div
                className="
                    grid
                    grid-cols-3
                    gap-2

                    sm:grid-cols-4
                    md:grid-cols-6
                    lg:grid-cols-8
                    xl:grid-cols-11
                "
            >
                {actions.map((item, index) => {
                    const Icon = item.icon;

                    const isAvailable =
                        typeof item.action === "function";

                    return (
                        <button
                            key={`${item.label}-${index}`}
                            type="button"
                            onClick={(event) =>
                                handleActionClick(event, item)
                            }
                            title={
                                item.shortcut
                                    ? `${item.label} (${item.shortcut})`
                                    : item.label
                            }
                            className={`
                                group
                                relative

                                flex
                                min-h-[86px]
                                flex-col
                                items-center
                                justify-center

                                rounded-xl
                                border
                                border-slate-200

                                bg-white

                                px-2
                                py-2.5

                                text-center

                                transition-all
                                duration-200
                                ease-out

                                ${
                                    isAvailable
                                        ? `
                                            cursor-pointer

                                            hover:-translate-y-0.5
                                            hover:border-slate-300
                                            hover:shadow-md

                                            active:translate-y-0
                                            active:scale-[0.98]
                                        `
                                        : `
                                            cursor-default
                                        `
                                }

                                dark:border-slate-700
                                dark:bg-slate-800

                                ${
                                    isAvailable
                                        ? `
                                            dark:hover:border-slate-600
                                            dark:hover:bg-slate-800
                                        `
                                        : ""
                                }
                            `}
                        >
                            {/* ============================
                                ICON CONTAINER
                            ============================ */}

                            <div
                                className={`
                                    mb-2

                                    flex
                                    h-10
                                    w-10
                                    items-center
                                    justify-center

                                    rounded-xl

                                    transition-all
                                    duration-200

                                    ${
                                        isAvailable
                                            ? "group-hover:scale-105"
                                            : ""
                                    }

                                    ${item.iconStyle}
                                `}
                            >
                                <Icon
                                    className="h-5 w-5"
                                    strokeWidth={2}
                                />
                            </div>

                            {/* ============================
                                BUTTON LABEL
                            ============================ */}

                            <span
                                className="
                                    text-[11px]
                                    font-semibold
                                    leading-tight

                                    text-slate-700

                                    dark:text-slate-200
                                "
                            >
                                {item.label}
                            </span>

                            {/* ============================
                                KEYBOARD SHORTCUT
                            ============================ */}

                            {item.shortcut && (
                                <span
                                    className="
                                        mt-1

                                        text-[9px]
                                        font-medium

                                        text-slate-400

                                        dark:text-slate-500
                                    "
                                >
                                    {item.shortcut}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}