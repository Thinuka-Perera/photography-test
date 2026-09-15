import React from "react";

import {
    DollarSign,
    Hash,
    Tag,
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
} from "lucide-react";

export default function QuickActionToolbar({
    onNewTransaction,
    onScanItems,
    onFindItem,
    onHoldTransaction,
    onLoadTransaction,
    onChangeQty,

}) {
    const actions = [
        {
            label: "Change Rate",
            shortcut: "F1",
            icon: DollarSign,
        },
        {
            label: "Change Qty",
            shortcut: "F2",
            icon: Hash,
            action: onChangeQty,
        },
        {
            label: "Item Disc.",
            shortcut: "F3",
            icon: Tag,
        },
        {
            label: "Bill Discount",
            shortcut: "F4",
            icon: Percent,
        },
        {
            label: "New Trans",
            shortcut: "F7",
            icon: FilePlus2,
            action: onNewTransaction,
        },
        {
            label: "Scan Items",
            icon: Barcode,
            action: onScanItems,
        },
        {
            label: "Product",
            icon: Package,
        },
        {
            label: "Find Item",
            shortcut: "F9",
            icon: Search,
            action: onFindItem,
        },
        {
            label: "Hold Trans",
            shortcut: "F10",
            icon: PauseCircle,
            action: onHoldTransaction,
        },
        {
            label: "Load Trans",
            icon: FolderOpen,
            action: onLoadTransaction,
        },
        {
            label: "Back Office",
            icon: BriefcaseBusiness,
        },

        {
            label: "Bill Reprint",
            icon: Printer,
        },
        {
            label: "Credit Customer",
            icon: Users,
        },
        {
            label: "Salesman",
            icon: UserRound,
        },
        {
            label: "Quotation",
            icon: ClipboardList,
        },
        {
            label: "Sales Return",
            icon: RotateCcw,
        },
        {
            label: "Stock Update",
            icon: Boxes,
        },
        {
            label: "Open Cash Drawer",
            icon: Banknote,
        },
        {
            label: "Expense/Paid Out",
            icon: Receipt,
        },
        {
            label: "Close Shift",
            icon: LogOut,
        },
        {
            label: "Logout",
            icon: LogOut,
        },
        {
            label: "Lock Screen",
            icon: Lock,
        },
    ];

    return (
        <div
            className="
                mb-5 rounded-2xl border border-slate-200
                bg-white p-3 shadow-sm
                dark:border-slate-700 dark:bg-slate-900
                dark:shadow-none
            "
        >
            <div
                className="
                    grid grid-cols-3 gap-2
                    sm:grid-cols-4
                    md:grid-cols-6
                    lg:grid-cols-8
                    xl:grid-cols-11
                "
            >
                {actions.map((item, index) => {
                    const Icon = item.icon;

                    return (
                        <button
                            key={`${item.label}-${index}`}
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();

                                if (item.action) {
                                    item.action();
                                }
                            }}
                            className="
                                group flex min-h-[74px]
                                flex-col items-center justify-center
                                rounded-xl border border-slate-200
                                bg-white px-2 py-2 text-center
                                transition-all duration-200

                                hover:border-blue-300
                                hover:bg-blue-50
                                hover:shadow-sm

                                dark:border-slate-700
                                dark:bg-slate-800
                                dark:hover:border-blue-500
                                dark:hover:bg-slate-700
                            "
                        >
                            <Icon
                                className="
                                    mb-1 h-5 w-5
                                    text-slate-600
                                    transition-colors
                                    group-hover:text-blue-600
                                    dark:text-slate-300
                                    dark:group-hover:text-blue-400
                                "
                            />

                            <span
                                className="
                                    text-[11px] font-semibold
                                    text-slate-700
                                    dark:text-slate-200
                                "
                            >
                                {item.label}
                            </span>

                            {item.shortcut && (
                                <span
                                    className="
                                        mt-0.5 text-[9px]
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