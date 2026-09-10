import MainLayout from "@/Layouts/MainLayout";
import { Head, Link, router } from "@inertiajs/react";
import { CalendarDays, Edit3, Eye, PlusCircle, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const eventTypeLabels = {
    wedding: "Wedding",
    party: "Party",
    corporate_shoot: "Corporate Shoot",
    other: "Other",
};

const statusStyles = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300",
    confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const eventStatusOptions = [
    { label: "Draft", value: "draft" },
    { label: "Confirmed", value: "confirmed" },
    { label: "In Progress", value: "in_progress" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
];

function formatDate(dateString) {
    if (!dateString) {
        return "-";
    }

    return new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
    }).format(new Date(dateString));
}

function formatMoney(value) {
    return new Intl.NumberFormat("en-LK", {
        style: "currency",
        currency: "LKR",
        minimumFractionDigits: 2,
    }).format(Number(value || 0));
}

function formatBalanceDisplay(balance) {
    const amount = Number(balance || 0);

    if (amount <= 0) {
        return { label: "Paid ✅", isPaid: true };
    }

    return { label: formatMoney(amount), isPaid: false };
}

function normalizeDateKey(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value).slice(0, 10);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export default function Index({
    events,
    stats,
    weddingMonthlyBreakdown = [],
    weddingCalendarEvents = [],
    weddingEventsList = { data: [], links: [], current_page: 1, last_page: 1, from: null, to: null, total: 0 },
    availableWeddingYears = [],
    filters = {},
}) {
    const weddingRows = weddingEventsList?.data ?? [];
    const rows = events?.data ?? [];
    const monthLabels = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ];
    const [selectedYear, setSelectedYear] = useState(filters.year || new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(filters.month || new Date().getMonth() + 1);
    const [yearSort, setYearSort] = useState(filters.year_sort || "desc");
    const [weddingOnly, setWeddingOnly] = useState(Boolean(filters.wedding_only));
    const [weddingListYear, setWeddingListYear] = useState(filters.wedding_list_year || filters.year || new Date().getFullYear());
    const [weddingListDate, setWeddingListDate] = useState(filters.wedding_list_date || "");
    const [selectedWeddingEvent, setSelectedWeddingEvent] = useState(null);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [showCalendar, setShowCalendar] = useState(true);

    const updateWeddingStatus = (eventId, status) => {
        setStatusUpdating(true);

        router.post(route("photography.events.status.update", eventId), { status }, {
            preserveScroll: true,
            onSuccess: (page) => {
                const updated = (page.props.weddingEventsList?.data ?? []).find(
                    (event) => Number(event.id) === Number(eventId),
                );

                if (updated) {
                    setSelectedWeddingEvent(updated);
                }
            },
            onFinish: () => setStatusUpdating(false),
        });
    };

    useEffect(() => {
        router.get(
            route("photography.events.index"),
            {
                year: selectedYear,
                month: selectedMonth,
                year_sort: yearSort,
                wedding_only: weddingOnly ? 1 : 0,
                wedding_list_year: weddingListYear,
                wedding_list_date: weddingListDate || undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }, [selectedYear, selectedMonth, yearSort, weddingOnly, weddingListYear, weddingListDate]);

    const weddingByDate = useMemo(() => {
        return weddingCalendarEvents.reduce((carry, event) => {
            const key = normalizeDateKey(event.event_date);
            if (!carry[key]) carry[key] = [];
            carry[key].push(event);
            return carry;
        }, {});
    }, [weddingCalendarEvents]);

    const yearOptions = useMemo(() => {
        const current = new Date().getFullYear();
        const fallbackYears = Array.from({ length: 7 }, (_, idx) => current - 3 + idx);
        const dynamicYears = Array.from(new Set([
            ...availableWeddingYears.map((year) => Number(year)),
            ...fallbackYears,
            Number(selectedYear),
        ]))
            .filter((year) => Number.isFinite(year) && year > 2000)
            .sort((a, b) => b - a);

        return dynamicYears;
    }, [availableWeddingYears, selectedYear]);

    const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
    const leadingDays = monthStart.getDay();
    const totalDays = new Date(selectedYear, selectedMonth, 0).getDate();
    const calendarCells = [
        ...Array.from({ length: leadingDays }).map(() => null),
        ...Array.from({ length: totalDays }).map((_, idx) => idx + 1),
    ];

    useEffect(() => {
        if (!selectedWeddingEvent) return undefined;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [selectedWeddingEvent]);

    return (
        <MainLayout pageTitle="Wedding Management">
            <Head title="Wedding Management" />

            <div className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            Wedding Management
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Create and manage wedding schedules, clients, and delivery status.
                        </p>
                    </div>
                    <Link
                        href={route("photography.events.create")}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
                    >
                        <PlusCircle className="w-4 h-4" />
                        New event
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard label="Total events" value={stats.total} />
                    <StatCard label="Upcoming" value={stats.upcoming} />
                    <StatCard label="Confirmed" value={stats.confirmed} />
                    <StatCard label="Completed" value={stats.completed} />
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 space-y-4">
                    <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            Weddings - monthly + year-wise + calendar view
                        </h3>
                        <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                <input
                                    type="checkbox"
                                    checked={weddingOnly}
                                    onChange={(event) => setWeddingOnly(event.target.checked)}
                                />
                                Wedding only
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowCalendar((current) => !current)}
                                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-700/40"
                            >
                                {showCalendar ? "Hide calendar" : "Show calendar"}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <select
                            value={selectedYear}
                            onChange={(event) => setSelectedYear(Number(event.target.value))}
                            className="rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        >
                            {yearOptions.map((year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedMonth}
                            onChange={(event) => setSelectedMonth(Number(event.target.value))}
                            className="rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        >
                            {monthLabels.map((label, idx) => (
                                <option key={label} value={idx + 1}>
                                    {label}
                                </option>
                            ))}
                        </select>

                        <select
                            value={yearSort}
                            onChange={(event) => setYearSort(event.target.value)}
                            className="rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        >
                            <option value="desc">Year sort: Newest first</option>
                            <option value="asc">Year sort: Oldest first</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-12 gap-2">
                        {monthLabels.map((label, idx) => {
                            const row = weddingMonthlyBreakdown.find((item) => Number(item.month_number) === idx + 1);
                            const total = Number(row?.total || 0);
                            const hasWeddings = total > 0;
                            return (
                                <div
                                    key={label}
                                    className={`rounded-lg px-2 py-1.5 text-xs border transition-colors ${
                                        hasWeddings
                                            ? "bg-emerald-100 border-emerald-200 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-300"
                                            : "bg-gray-50 border-gray-100 text-gray-500 dark:bg-slate-900/40 dark:border-slate-700 dark:text-gray-400"
                                    }`}
                                >
                                    <span className="font-medium">{label.slice(0, 3)}</span>
                                    <span className={`ml-2 font-bold ${hasWeddings ? "text-emerald-700 dark:text-emerald-300" : "text-gray-700 dark:text-gray-300"}`}>
                                        {total}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="rounded-xl border border-gray-100 dark:border-slate-700 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <h4 className="font-semibold text-gray-900 dark:text-white">Weddings</h4>
                            <div className="flex items-center gap-2 text-sm">
                                <select
                                    value={weddingListYear}
                                    onChange={(event) => setWeddingListYear(Number(event.target.value))}
                                    className="rounded-lg border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                >
                                    {yearOptions.map((year) => (
                                        <option key={`list-${year}`} value={year}>
                                            {year}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="date"
                                    value={weddingListDate}
                                    onChange={(event) => setWeddingListDate(event.target.value)}
                                    className="rounded-lg border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                                {weddingListDate && (
                                    <button
                                        type="button"
                                        onClick={() => setWeddingListDate("")}
                                        className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 dark:border-slate-700 dark:text-gray-300"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {weddingRows.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No weddings found for selected filters.</p>
                        ) : (
                            <div className="overflow-x-auto space-y-3">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-slate-900/60">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs uppercase text-gray-500 dark:text-gray-400">Title</th>
                                            <th className="px-3 py-2 text-left text-xs uppercase text-gray-500 dark:text-gray-400">Client</th>
                                            <th className="px-3 py-2 text-left text-xs uppercase text-gray-500 dark:text-gray-400">Date</th>
                                            <th className="px-3 py-2 text-right text-xs uppercase text-gray-500 dark:text-gray-400">Amount</th>
                                            <th className="px-3 py-2 text-right text-xs uppercase text-gray-500 dark:text-gray-400">Received balance</th>
                                            <th className="px-3 py-2 pr-10 text-right text-xs uppercase text-gray-500 dark:text-gray-400">Balance</th>
                                            <th className="px-3 py-2 pl-8 text-left text-xs uppercase text-gray-500 dark:text-gray-400">Status</th>
                                            <th className="px-3 py-2 text-right text-xs uppercase text-gray-500 dark:text-gray-400">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                        {weddingRows.map((event) => {
                                            const balance = formatBalanceDisplay(event.balance_amount);

                                            return (
                                            <tr key={`wedding-list-${event.id}`}>
                                                <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{event.title}</td>
                                                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{event.client_name}</td>
                                                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{formatDate(event.event_date)}</td>
                                                <td className="px-3 py-2 text-right text-gray-900 dark:text-white whitespace-nowrap">
                                                    {formatMoney(event.total_amount)}
                                                </td>
                                                <td className="px-3 py-2 text-right text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                                                    {formatMoney(event.received_amount)}
                                                </td>
                                                <td className="px-3 py-2 pr-10 text-right font-medium whitespace-nowrap">
                                                    {balance.isPaid ? (
                                                        <span className="text-emerald-700 dark:text-emerald-300">{balance.label}</span>
                                                    ) : (
                                                        <span className="text-red-600 dark:text-red-400">{balance.label}</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 pl-8">
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[event.status] ?? statusStyles.draft}`}>
                                                        {event.status.replace("_", " ")}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedWeddingEvent(event)}
                                                        className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-700/40"
                                                    >
                                                        Details
                                                    </button>
                                                </td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {weddingEventsList?.last_page > 1 && (
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Showing {weddingEventsList.from}-{weddingEventsList.to} of {weddingEventsList.total} weddings
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {(weddingEventsList.links || []).map((link) => (
                                                <button
                                                    key={`wedding-page-${link.label}-${link.url ?? "no-url"}-${link.active ? "active" : "inactive"}`}
                                                    type="button"
                                                    disabled={!link.url}
                                                    onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true, preserveState: true })}
                                                    className={`rounded-lg px-3 py-1.5 text-xs transition ${
                                                        link.active
                                                            ? "bg-primary-500 text-white"
                                                            : link.url
                                                                ? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600"
                                                                : "cursor-not-allowed bg-gray-50 text-gray-300 dark:bg-slate-800 dark:text-slate-600"
                                                    }`}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </div>

                {showCalendar && (
                    <div className="rounded-3xl border border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-br from-white to-slate-50/70 dark:from-slate-800 dark:to-slate-900/70 p-6 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 dark:border-slate-700/70 pb-3">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                Wedding Calendar
                            </h3>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                Click a highlighted date to view details
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 overflow-hidden bg-white/70 dark:bg-slate-900/40 backdrop-blur-sm">
                            <div className="grid grid-cols-7 bg-slate-100/80 dark:bg-slate-900/70 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                    <div key={day} className="px-2 py-2.5 text-center tracking-wide">{day}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7">
                                {calendarCells.map((day, index) => {
                                    if (!day) {
                                        return <div key={`empty-${index}`} className="h-24 border-t border-r border-slate-100 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/20" />;
                                    }

                                    const key = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                    const dayEvents = weddingByDate[key] || [];
                                    const hasWeddings = dayEvents.length > 0;

                                    return (
                                        <div
                                            key={key}
                                            className={`h-24 border-t border-r p-2 transition-colors ${hasWeddings
                                                ? "bg-emerald-50/80 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/40 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30"
                                                : "border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                                }`}
                                        >
                                            <div className={`text-xs font-semibold ${hasWeddings ? "text-emerald-700 dark:text-emerald-300" : "text-slate-700 dark:text-slate-200"}`}>{day}</div>
                                            {hasWeddings && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedWeddingEvent(dayEvents[0])}
                                                    className="mt-1 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                                >
                                                    {dayEvents.length} wedding{dayEvents.length > 1 ? "s" : ""}
                                                </button>
                                            )}
                                            {dayEvents.slice(0, 2).map((event) => (
                                                <button
                                                    key={event.id}
                                                    type="button"
                                                    onClick={() => setSelectedWeddingEvent(event)}
                                                    className="mt-1 w-full truncate rounded-lg bg-primary-50 px-2 py-1 text-[10px] font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 text-left"
                                                >
                                                    {event.title}
                                                </button>
                                            ))}
                                            {dayEvents.length > 2 && (
                                                <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">+{dayEvents.length - 2} more</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3">
                        <CalendarDays className="w-5 h-5 text-primary-500" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            Events
                        </h3>
                    </div>

                    {rows.length === 0 ? (
                        <div className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                            No Events have been created yet.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-slate-700/40">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                            Title
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                            Client
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                            Type
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                            Date
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {rows.map((event) => (
                                        <tr key={event.id}>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {event.title}
                                                </div>
                                                {event.location && (
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        {event.location}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {event.client_name}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {eventTypeLabels[event.event_type] ?? event.event_type}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {formatDate(event.event_date)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${statusStyles[event.status] ?? statusStyles.draft}`}
                                                >
                                                    {event.status.replace("_", " ")}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={route("photography.events.show", event.id)}
                                                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-gray-300"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        View
                                                    </Link>
                                                    <Link
                                                        href={route("photography.events.edit", event.id)}
                                                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-gray-300"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                        Edit
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (confirm("Delete this event?")) {
                                                                router.delete(
                                                                    route("photography.events.destroy", event.id),
                                                                );
                                                            }
                                                        }}
                                                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {selectedWeddingEvent && typeof document !== "undefined" && createPortal(
                    <div className="fixed inset-0 z-[9999] bg-slate-900/45 backdrop-blur-[1px] flex items-center justify-center p-4">
                        <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-6 shadow-2xl">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {selectedWeddingEvent.title}
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {formatDate(selectedWeddingEvent.event_date)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedWeddingEvent(null)}
                                    className="text-sm text-gray-500 hover:text-gray-700"
                                >
                                    Close
                                </button>
                            </div>
                            <div className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                <p><strong>Client:</strong> {selectedWeddingEvent.client_name}</p>
                                <p><strong>Location:</strong> {selectedWeddingEvent.location || "-"}</p>
                                <p><strong>Amount:</strong> {formatMoney(selectedWeddingEvent.total_amount)}</p>
                                <p><strong>Received balance:</strong> {formatMoney(selectedWeddingEvent.received_amount)}</p>
                                <p>
                                    <strong>Balance:</strong>{" "}
                                    {formatBalanceDisplay(selectedWeddingEvent.balance_amount).isPaid ? (
                                        <span className="text-emerald-700 dark:text-emerald-300">Paid ✅</span>
                                    ) : (
                                        <span className="text-red-600 dark:text-red-400">
                                            {formatMoney(selectedWeddingEvent.balance_amount)}
                                        </span>
                                    )}
                                </p>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                                    <span className="font-semibold text-gray-900 dark:text-white shrink-0">Status:</span>
                                    <select
                                        value={selectedWeddingEvent.status}
                                        disabled={statusUpdating}
                                        onChange={(e) => updateWeddingStatus(selectedWeddingEvent.id, e.target.value)}
                                        className="rounded-lg border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm min-w-[160px] disabled:opacity-60"
                                    >
                                        {eventStatusOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium w-fit ${statusStyles[selectedWeddingEvent.status] ?? statusStyles.draft}`}>
                                        {selectedWeddingEvent.status.replace("_", " ")}
                                    </span>
                                </div>
                                {formatBalanceDisplay(selectedWeddingEvent.balance_amount).isPaid && selectedWeddingEvent.status !== "completed" && (
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                        Fully paid — status will update to completed automatically.
                                    </p>
                                )}
                                <p><strong>Notes:</strong> {selectedWeddingEvent.notes || "-"}</p>
                            </div>
                            <div className="mt-5">
                                <Link
                                    href={route("photography.events.show", selectedWeddingEvent.id)}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600"
                                >
                                    <Eye className="w-4 h-4" />
                                    View full details
                                </Link>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </MainLayout>
    );
}

function StatCard({ label, value }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
    );
}
