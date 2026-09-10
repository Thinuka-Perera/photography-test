import { Cake, X } from "lucide-react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

function formatBirthdayLabel(value) {
    if (!value) {
        return "—";
    }

    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function EmployeeBirthdayCalendar({
    calendar,
    onClose,
    onMonthChange,
}) {
    const { year, month, month_label, days_in_month, first_weekday, by_day } =
        calendar;

    const yearOptions = Array.from({ length: 7 }, (_, idx) => year - 3 + idx);

    const cells = [];
    for (let i = 0; i < first_weekday; i++) {
        cells.push({ type: "empty", key: `empty-${i}` });
    }
    for (let day = 1; day <= days_in_month; day++) {
        cells.push({ type: "day", day, entries: by_day[day] ?? [] });
    }

    return (
        <div className="rounded-3xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50/70 p-6 shadow-sm dark:border-slate-700/70 dark:from-slate-800 dark:to-slate-900/70">
            <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-4 dark:border-slate-700/70 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-pink-700 dark:bg-pink-900/20 dark:text-pink-300">
                        <Cake className="h-3.5 w-3.5" />
                        Employee birthdays
                    </div>
                    <h3 className="mt-2 font-semibold text-gray-900 dark:text-white">
                        Birthday calendar — {month_label}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        Dates with staff birthdays are highlighted
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 self-start rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                >
                    <X className="h-4 w-4" />
                    Close
                </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <select
                    value={year}
                    onChange={(event) =>
                        onMonthChange(Number(event.target.value), month)
                    }
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                    {yearOptions.map((optionYear) => (
                        <option key={optionYear} value={optionYear}>
                            {optionYear}
                        </option>
                    ))}
                </select>
                <select
                    value={month}
                    onChange={(event) =>
                        onMonthChange(year, Number(event.target.value))
                    }
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                    {MONTH_LABELS.map((label, idx) => (
                        <option key={label} value={idx + 1}>
                            {label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/40">
                <div className="grid grid-cols-7 bg-slate-100/80 text-xs font-semibold text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
                    {WEEKDAYS.map((day) => (
                        <div
                            key={day}
                            className="px-2 py-2.5 text-center tracking-wide"
                        >
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7">
                    {cells.map((cell) => {
                        if (cell.type === "empty") {
                            return (
                                <div
                                    key={cell.key}
                                    className="h-24 border-r border-t border-slate-100 bg-slate-50/40 dark:border-slate-700/50 dark:bg-slate-900/20"
                                />
                            );
                        }

                        const isToday =
                            new Date().getFullYear() === year &&
                            new Date().getMonth() + 1 === month &&
                            new Date().getDate() === cell.day;
                        const hasBirthdays = cell.entries.length > 0;

                        return (
                            <div
                                key={cell.day}
                                className={`h-24 border-r border-t p-2 transition-colors ${
                                    hasBirthdays
                                        ? "border-pink-100 bg-pink-50/80 hover:bg-pink-100/60 dark:border-pink-900/40 dark:bg-pink-900/20 dark:hover:bg-pink-900/30"
                                        : "border-slate-100 hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-slate-800/40"
                                } ${isToday ? "ring-1 ring-inset ring-primary-400/60" : ""}`}
                            >
                                <div
                                    className={`text-xs font-semibold ${
                                        hasBirthdays
                                            ? "text-pink-700 dark:text-pink-300"
                                            : "text-slate-700 dark:text-slate-200"
                                    }`}
                                >
                                    {cell.day}
                                </div>
                                {hasBirthdays && (
                                    <span className="mt-1 inline-flex rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-semibold text-pink-700 dark:bg-pink-900/50 dark:text-pink-200">
                                        {cell.entries.length} birthday
                                        {cell.entries.length > 1 ? "s" : ""}
                                    </span>
                                )}
                                {cell.entries.slice(0, 2).map((employee) => (
                                    <p
                                        key={employee.id}
                                        className="mt-1 truncate rounded-lg bg-white/80 px-2 py-0.5 text-[10px] font-medium text-pink-800 dark:bg-slate-900/50 dark:text-pink-200"
                                        title={formatBirthdayLabel(
                                            employee.birthday,
                                        )}
                                    >
                                        {employee.name}
                                    </p>
                                ))}
                                {cell.entries.length > 2 && (
                                    <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                                        +{cell.entries.length - 2} more
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
