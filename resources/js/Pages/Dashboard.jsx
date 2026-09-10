import StatCard from "@/Components/StatCard";
import MainLayout from "@/Layouts/MainLayout";
import { Head, Link, router } from "@inertiajs/react";
import {
    AlertTriangle,
    ArrowRight,
    Boxes,
    Camera,
    CheckCircle2,
    CircleDollarSign,
    MessageCircle,
    Package,
    Printer,
    Receipt,
    RotateCcw,
    Ticket,
    TrendingUp,
    Users2,
} from "lucide-react";

// ─────────────────────────────────────────────
// Low Stock Products — paginated table
// ─────────────────────────────────────────────
function LowStockProductsWidget({ lowStockProducts }) {
    const items = lowStockProducts?.data ?? [];
    const total = lowStockProducts?.total ?? 0;
    const from = lowStockProducts?.from ?? 0;
    const to = lowStockProducts?.to ?? 0;
    const visitPage = (url) => {
        if (!url) {
            return;
        }

        router.visit(url, {
            preserveState: true,
            preserveScroll: true,
            only: ["lowStockProducts", "inventoryStats"],
        });
    };

    return (
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="rounded-lg bg-red-50 p-1.5 dark:bg-red-900/20">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                            Low Stock Products
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {total === 0
                                ? "No variants below threshold"
                                : `${total} variant${total === 1 ? "" : "s"} at or below minimum`}
                        </p>
                    </div>
                </div>
                <Link
                    href={route("inventory.stock")}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary-500 transition hover:text-primary-600"
                >
                    Manage stock <ArrowRight className="h-3 w-3" />
                </Link>
            </div>

            {items.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
                    <p className="font-medium text-gray-700 dark:text-gray-200">
                        All products are sufficiently stocked
                    </p>
                    <p className="mt-1 text-xs">
                        No variants are at or below their low stock threshold.
                    </p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-900/50 dark:text-gray-400">
                                <tr>
                                    <th className="px-6 py-4">Product / SKU</th>
                                    <th className="px-6 py-4">Current stock</th>
                                    <th className="px-6 py-4">Min threshold</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {items.map((item) => {
                                    const isOut = item.status === "Out of Stock";

                                    return (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-gray-50/80 dark:hover:bg-slate-900/40"
                                        >
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {item.name}
                                                </p>
                                                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                                    SKU: {item.sku}
                                                    {item.category
                                                        ? ` · ${item.category}`
                                                        : ""}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${isOut
                                                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                                        }`}
                                                >
                                                    {item.current_stock}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {item.low_stock_threshold}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${isOut
                                                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                                        }`}
                                                >
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {(lowStockProducts?.last_page ?? 1) > 1 && (
                        <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 text-sm text-gray-500 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                            <span>
                                Showing {from}–{to} of {total} · Page{" "}
                                {lowStockProducts.current_page} of{" "}
                                {lowStockProducts.last_page}
                            </span>
                            <div className="flex gap-2">
                                {lowStockProducts.prev_page_url && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            visitPage(lowStockProducts.prev_page_url)
                                        }
                                        className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700"
                                    >
                                        Previous
                                    </button>
                                )}
                                {lowStockProducts.next_page_url && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            visitPage(lowStockProducts.next_page_url)
                                        }
                                        className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700"
                                    >
                                        Next
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
// TopProductsWidget — Chamath's (unchanged)
// ─────────────────────────────────────────────
function TopProductsWidget({ products = [] }) {
    const maxStock = products.length > 0 ? Math.max(...products.map((p) => p.total_stock), 1) : 1;
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Top Products</h3>
                        <p className="text-xs text-gray-400">Ranked by total stock units</p>
                    </div>
                </div>
                <Link href={route("products.index")} className="inline-flex items-center gap-1 text-xs font-medium text-primary-500 hover:text-primary-600 transition-colors">
                    All products <ArrowRight className="w-3 h-3" />
                </Link>
            </div>
            {products.length === 0 ? (
                <div className="px-6 py-10 text-center text-gray-400 text-sm">No products in inventory yet.</div>
            ) : (
                <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
                    {products.map((product, i) => {
                        const barWidth = maxStock > 0 ? Math.round((product.total_stock / maxStock) * 100) : 0;
                        return (
                            <div key={product.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                                <span className="flex-shrink-0 w-5 text-xs font-bold text-gray-400">#{i + 1}</span>
                                <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                                    {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-contain" /> : <Package className="w-4 h-4 text-gray-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                                        {product.has_low_stock && <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                                            <div className="h-full rounded-full bg-blue-400 dark:bg-blue-500 transition-all" style={{ width: `${barWidth}%` }} />
                                        </div>
                                        <span className="text-xs text-gray-400 flex-shrink-0">{product.category}</span>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{product.total_stock}</span>
                                    <span className="text-xs text-gray-400 ml-1">{product.uom}s</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
// FinanceWidget — Thinuka's (NEW — real data)
// ─────────────────────────────────────────────
function FinanceWidget({ stats = {} }) {
    const fmtMoney = (val) => {
        const n = Number(val ?? 0);
        if (n >= 1_000_000) return `LKR ${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1_000) return `LKR ${(n / 1_000).toFixed(1)}K`;
        return "LKR " + n.toLocaleString("en-LK", { minimumFractionDigits: 0 });
    };

    const profitPos = (stats.netProfit ?? 0) >= 0;

    return (
        <div className="mb-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Finance Overview</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Revenue, refunds and net profit for this month</p>
                </div>
                <Link href="/finance/invoices" className="inline-flex items-center gap-1 text-xs font-medium text-primary-500 hover:text-primary-600 transition-colors">
                    View invoices <ArrowRight className="w-3 h-3" />
                </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Revenue */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                            <CircleDollarSign className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Monthly Revenue</p>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{fmtMoney(stats.monthRevenue)}</p>
                    <p className="text-xs text-gray-400 mt-1">All-time: {fmtMoney(stats.totalRevenue)}</p>
                </div>
                {/* Net Profit */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-xl ${profitPos ? "bg-blue-100 dark:bg-blue-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                            <TrendingUp className={`w-4 h-4 ${profitPos ? "text-blue-500" : "text-red-500"}`} />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Net Profit (Month)</p>
                    </div>
                    <p className={`text-xl font-bold ${profitPos ? "text-gray-900 dark:text-white" : "text-red-500"}`}>{fmtMoney(stats.netProfit)}</p>
                    <p className="text-xs text-gray-400 mt-1">After {fmtMoney(stats.monthRefunds)} refunds</p>
                </div>
                {/* Open Invoices */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                            <Receipt className="w-4 h-4 text-amber-500" />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Open Invoices</p>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.openInvoices ?? 0}</p>
                    <Link href="/finance/invoices?status=awaiting_payment" className="text-xs text-primary-500 hover:underline mt-1 block">
                        View outstanding →
                    </Link>
                </div>
                {/* Pending Refunds */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-xl ${(stats.pendingRefunds ?? 0) > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-gray-100 dark:bg-gray-700"}`}>
                            <RotateCcw className={`w-4 h-4 ${(stats.pendingRefunds ?? 0) > 0 ? "text-red-500" : "text-gray-400"}`} />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Pending Refunds</p>
                    </div>
                    <p className={`text-xl font-bold ${(stats.pendingRefunds ?? 0) > 0 ? "text-red-500" : "text-gray-900 dark:text-white"}`}>{stats.pendingRefunds ?? 0}</p>
                    <Link href="/finance/refunds?status=pending" className="text-xs text-primary-500 hover:underline mt-1 block">
                        Review now →
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────
const SNAPSHOT_ICON_STYLES = {
    printer: { icon: Printer, iconBgColor: "bg-sky-100 dark:bg-sky-900/30", iconColor: "text-sky-500" },
    camera: { icon: Camera, iconBgColor: "bg-violet-100 dark:bg-violet-900/30", iconColor: "text-violet-500" },
    ticket: { icon: Ticket, iconBgColor: "bg-amber-100 dark:bg-amber-900/30", iconColor: "text-amber-500" },
    receipt: { icon: Receipt, iconBgColor: "bg-rose-100 dark:bg-rose-900/30", iconColor: "text-rose-500" },
};

const SHARED_ICON_STYLES = {
    "circle-dollar-sign": { icon: CircleDollarSign, iconBgColor: "bg-emerald-100 dark:bg-emerald-900/30", iconColor: "text-emerald-500" },
    package: { icon: Package, iconBgColor: "bg-blue-100 dark:bg-blue-900/30", iconColor: "text-blue-500" },
    users: { icon: Users2, iconBgColor: "bg-fuchsia-100 dark:bg-fuchsia-900/30", iconColor: "text-fuchsia-500" },
    "message-circle": { icon: MessageCircle, iconBgColor: "bg-lime-100 dark:bg-lime-900/30", iconColor: "text-lime-500" },
};

function mapSnapshotRows(rows) {
    return (rows ?? []).map((row) => {
        const preset = SNAPSHOT_ICON_STYLES[row.icon] ?? {
            icon: Package,
            iconBgColor: "bg-gray-100 dark:bg-gray-800",
            iconColor: "text-gray-500",
        };
        return {
            ...row,
            icon: preset.icon,
            iconBgColor: preset.iconBgColor,
            iconColor: preset.iconColor,
        };
    });
}

function mapSharedRows(rows) {
    return (rows ?? []).map((row) => {
        const preset = SHARED_ICON_STYLES[row.icon] ?? {
            icon: Package,
            iconBgColor: "bg-gray-100 dark:bg-gray-800",
            iconColor: "text-gray-500",
        };
        return {
            ...row,
            icon: preset.icon,
            iconBgColor: preset.iconBgColor,
            iconColor: preset.iconColor,
        };
    });
}

export default function Dashboard({
    inventoryStats,
    lowStockProducts,
    topProducts,
    financeStats,
    dailySnapshot = [],
    sharedStatsRow = [],
}) {
    const stats = mapSnapshotRows(dailySnapshot);
    const sharedStats = mapSharedRows(sharedStatsRow);

    const inventoryStatCards = [
        { title: "Total Products", value: String(inventoryStats?.totalProducts ?? 0), percentage: null, trend: "up", icon: Package, iconBgColor: "bg-blue-100 dark:bg-blue-900/30", iconColor: "text-blue-500", linkHref: "/inventory/products" },
        { title: "Total SKUs", value: String(inventoryStats?.totalSKUs ?? 0), percentage: null, trend: "up", icon: Boxes, iconBgColor: "bg-indigo-100 dark:bg-indigo-900/30", iconColor: "text-indigo-500", linkHref: "/inventory/products" },
        { title: "Low Stock Alerts", value: String(inventoryStats?.lowStockCount ?? 0), percentage: null, trend: inventoryStats?.lowStockCount > 0 ? "down" : "up", icon: AlertTriangle, iconBgColor: inventoryStats?.lowStockCount > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-emerald-100 dark:bg-emerald-900/30", iconColor: inventoryStats?.lowStockCount > 0 ? "text-red-500" : "text-emerald-500", linkHref: "/inventory/stock" },
        { title: "Total Units in Stock", value: String(inventoryStats?.totalInventory ?? 0), percentage: null, trend: "up", icon: TrendingUp, iconBgColor: "bg-emerald-100 dark:bg-emerald-900/30", iconColor: "text-emerald-500", linkHref: "/inventory/stock" },
    ];

    const moduleCards = [
        { title: "Printing", description: "Handle print jobs, retail orders, and item movement from the shared inventory.", icon: Printer, href: "/studio", actions: ["Dashboard", "Print queue"] },
        { title: "Photography", description: "Manage events, quotations, custom packages, invoicing, and customer follow-ups for shoots and sessions.", icon: Camera, href: "/photography/events", actions: ["Event calendar", "Quotations", "Package customization"] },
    ];

    const sharedOperations = [
        "Centralized inventory updates for sales and shoot usage",
        "Employee assignment tracking across events and internal tasks",
        "Quotation-to-invoice workflow with editable financial records",
        "WhatsApp delivery of quotations, invoices, and payment reminders",
    ];

    return (
        <MainLayout pageTitle="Operations Overview">
            <Head title="Dashboard" />

            {/* Hero Banner */}
            <div className="mb-8 bg-gradient-to-r from-primary-500 via-primary-600 to-blue-500 rounded-2xl p-6 lg:p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-300/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
                </div>
                <div className="relative z-10">
                    <h1 className="text-2xl lg:text-3xl font-bold mb-2">Resins By Ru and Ru Creates operations in one place</h1>
                    <p className="text-blue-100 max-w-2xl">This workspace manages operations with dedicated modules for printing, projects, and shared operations for inventory, staff, billing, refunds, and communication.</p>
                </div>
            </div>

            {/* Daily Snapshot */}
            <div className="mb-8">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Daily Snapshot</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Live counts for the active shop (trend only where a day-over-day comparison exists)
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat) => <StatCard key={stat.id} {...stat} />)}
                </div>
            </div>

            {/* Inventory Overview — Chamath (unchanged) */}
            <div className="mb-8">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Inventory Overview</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Live stock counts from the product &amp; inventory database</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {inventoryStatCards.map((stat, index) => <StatCard key={index} {...stat} />)}
                </div>
            </div>

            {/* Low stock table + top products */}
            <div className="mb-8">
                <LowStockProductsWidget lowStockProducts={lowStockProducts} />
            </div>

            <div className="mb-8">
                <TopProductsWidget products={topProducts ?? []} />
            </div>

            {/* ── Finance Overview — Thinuka (REAL data, NEW) ── */}
            <FinanceWidget stats={financeStats ?? {}} />

            {/* Shared Operations */}
            <div className="mb-8">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Shared Operations</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {sharedStats.map((stat) => (
                        <StatCard key={stat.id ?? stat.title} {...stat} />
                    ))}
                </div>
            </div>

            {/* Module Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {moduleCards.map((module) => {
                    const Icon = module.icon;
                    return (
                        <div key={module.title} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                            <div className="flex items-start justify-between mb-5">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{module.title}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{module.description}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20">
                                    <Icon className="w-5 h-5 text-primary-500" />
                                </div>
                            </div>
                            <div className="space-y-3 mb-5">
                                {module.actions.map((action) => (
                                    <div key={action} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        <span>{action}</span>
                                    </div>
                                ))}
                            </div>
                            <Link href={module.href} className="inline-flex items-center gap-2 text-sm font-semibold text-primary-500 hover:text-primary-600">Open module</Link>
                        </div>
                    );
                })}
            </div>

            {/* Cross-Team Focus */}
            <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-5">
                    <Boxes className="w-5 h-5 text-primary-500" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Cross-Team Focus</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sharedOperations.map((item) => (
                        <div key={item} className="rounded-xl bg-gray-50 dark:bg-slate-700/40 px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item}</div>
                    ))}
                </div>
            </div>
        </MainLayout>
    );
}