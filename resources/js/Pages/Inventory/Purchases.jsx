import MainLayout from "@/Layouts/MainLayout";
import ActiveShopBanner from "@/Modules/Shops/Components/ActiveShopBanner";
import { formatDate, formatMoney } from "@/utils/format";
import { Head, router } from "@inertiajs/react";
import {
    CalendarRange,
    History,
    Package,
    Search,
    WalletCards,
} from "lucide-react";
import { useState } from "react";

function SummaryCard({ label, value, icon: Icon, tone = "primary" }) {
    const tones = {
        primary:
            "bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300",
        emerald:
            "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
        amber:
            "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
        slate:
            "bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200",
    };

    return (
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {label}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                        {value}
                    </p>
                </div>
                <div
                    className={`rounded-2xl p-3 ${
                        tones[tone] ?? tones.primary
                    }`}
                >
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </div>
    );
}

export default function Purchases({ entries, filters, stats }) {
    const [search, setSearch] = useState(filters.search ?? "");
    const [from, setFrom] = useState(filters.from ?? "");
    const [to, setTo] = useState(filters.to ?? "");

    const submitFilters = event => {
        event.preventDefault();

        router.get(
            route("inventory.purchases"),
            {
                search: search || undefined,
                from: from || undefined,
                to: to || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const clearFilters = () => {
        setSearch("");
        setFrom("");
        setTo("");

        router.get(
            route("inventory.purchases"),
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    return (
        <MainLayout pageTitle="Purchase History">
            <Head title="Purchase History" />

            <div className="space-y-6">
                <ActiveShopBanner />

                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                                <History className="h-3.5 w-3.5" />
                                Inventory ledger
                            </div>
                            <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                                Purchase history ledger
                            </h1>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Every stock-in entry recorded with the
                                <span className="font-semibold text-gray-700 dark:text-gray-200">
                                    {" "}
                                    Purchase
                                </span>{" "}
                                reason appears here automatically, so the team
                                has one continuous purchase trail.
                            </p>
                        </div>

                        <form
                            onSubmit={submitFilters}
                            className="grid gap-3 rounded-3xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-[minmax(0,1fr)_150px_150px_auto_auto]"
                        >
                            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                                <Search className="h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={event =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search item, SKU, or user"
                                    className="w-full border-0 bg-transparent p-0 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-0 dark:text-gray-200"
                                />
                            </div>

                            <input
                                type="date"
                                value={from}
                                onChange={event => setFrom(event.target.value)}
                                className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
                            />
                            <input
                                type="date"
                                value={to}
                                onChange={event => setTo(event.target.value)}
                                className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
                            />

                            <button
                                type="submit"
                                className="rounded-2xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600"
                            >
                                Filter
                            </button>
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800"
                            >
                                Clear
                            </button>
                        </form>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        label="Purchase entries"
                        value={stats.entries}
                        icon={History}
                        tone="primary"
                    />
                    <SummaryCard
                        label="Units purchased"
                        value={stats.units}
                        icon={Package}
                        tone="emerald"
                    />
                    <SummaryCard
                        label="Ledger value"
                        value={formatMoney(stats.total_value)}
                        icon={WalletCards}
                        tone="amber"
                    />
                    <SummaryCard
                        label="This month"
                        value={formatMoney(stats.current_month_value)}
                        icon={CalendarRange}
                        tone="slate"
                    />
                </section>

                <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="border-b border-gray-100 px-6 py-4 dark:border-slate-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Purchase ledger
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Each row is generated from a recorded stock purchase.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-900/50 dark:text-gray-400">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Item</th>
                                    <th className="px-6 py-4 text-right">
                                        Qty
                                    </th>
                                    <th className="px-6 py-4 text-right">
                                        Unit cost
                                    </th>
                                    <th className="px-6 py-4 text-right">
                                        Extra costs
                                    </th>
                                    <th className="px-6 py-4 text-right">
                                        Total
                                    </th>
                                    <th className="px-6 py-4">Recorded by</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {entries.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="7"
                                            className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                                        >
                                            No purchase entries matched the
                                            current filters.
                                        </td>
                                    </tr>
                                ) : (
                                    entries.data.map(entry => (
                                        <tr
                                            key={entry.id}
                                            className="align-top hover:bg-gray-50/80 dark:hover:bg-slate-900/40"
                                        >
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {entry.date
                                                    ? formatDate(entry.date, {
                                                          year: "numeric",
                                                          month: "short",
                                                          day: "numeric",
                                                      })
                                                    : "—"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900 dark:text-white">
                                                    {entry.product_name}
                                                </div>
                                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    {[entry.variant_label, entry.sku]
                                                        .filter(Boolean)
                                                        .join(" • ")}
                                                </div>
                                                {entry.notes ? (
                                                    <div className="mt-2 rounded-2xl bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-slate-900 dark:text-gray-300">
                                                        {entry.notes}
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">
                                                {entry.quantity}
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">
                                                {formatMoney(entry.unit_cost)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">
                                                <div>{formatMoney(entry.shipping_cost)}</div>
                                                <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                                    Other:{" "}
                                                    {formatMoney(
                                                        entry.other_cost,
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">
                                                {formatMoney(entry.line_total)}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {entry.recorded_by}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {entries.links?.length > 3 ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 py-4 text-sm dark:border-slate-700">
                            <div className="text-gray-500 dark:text-gray-400">
                                Showing {entries.from ?? 0}-{entries.to ?? 0} of{" "}
                                {entries.total ?? 0}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {entries.links
                                    .filter(link => link.url)
                                    .map(link => (
                                        <button
                                            key={`${link.label}-${link.url}`}
                                            type="button"
                                            onClick={() => router.visit(link.url)}
                                            className={`rounded-xl px-3 py-2 text-sm transition ${
                                                link.active
                                                    ? "bg-primary-500 text-white"
                                                    : "border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-700"
                                            }`}
                                            dangerouslySetInnerHTML={{
                                                __html: link.label,
                                            }}
                                        />
                                    ))}
                            </div>
                        </div>
                    ) : null}
                </section>
            </div>
        </MainLayout>
    );
}
