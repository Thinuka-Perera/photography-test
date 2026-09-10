import ConfirmModal from "@/Components/ConfirmModal";
import Modal from "@/Components/Modal";
import MainLayout from "@/Layouts/MainLayout";
import { Head, router, useForm } from "@inertiajs/react";
import {
    AlertCircle,
    CalendarDays,
    Clock,
    PlusCircle,
    Search,
    Trash2,
    Users2,
    PencilLine,
    ClipboardCheck,
    Timer,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import {
    formatDateOnly,
    formatDateTime,
    formatTimeOnly,
    toDateInputValue,
} from "@/utils/format";
import { useEffect, useMemo, useState } from "react";

const today = new Date().toISOString().slice(0, 10);
const currentMonth = new Date().toISOString().slice(0, 7);
const LEAVES_PER_PAGE = 3;

const blankForm = {
    employee_id: "",
    work_date: today,
    status: "present",
    is_late: false,
    check_in_time: "",
    check_out_time: "",
    notes: "",
};

const RECORD_FILTERS = [
    { value: "all", label: "All" },
    { value: "present", label: "Present" },
    { value: "leave", label: "Leave" },
    { value: "late", label: "Late" },
];

const isCheckInLate = (checkInTime, lateAfter = "09:00") => {
    if (!checkInTime) {
        return false;
    }

    return checkInTime.slice(0, 5) > lateAfter.slice(0, 5);
};

/** Human-readable duration (avoids "10.83 hrs" being read as 10h 83m). */
const formatDurationMinutes = (minutes) => {
    const total = Math.max(0, Math.floor(Number(minutes) || 0));
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h === 0) {
        return `${m}m`;
    }
    if (m === 0) {
        return `${h}h`;
    }
    return `${h}h ${m}m`;
};

const lateDurationLabel = (attendance) => {
    if (attendance.status !== "present") {
        return null;
    }

    const isLate = Boolean(
        attendance.is_late ?? attendance.is_late_computed,
    );
    const minutes = Math.max(0, Math.floor(Number(attendance.late_minutes) || 0));

    if (!isLate || minutes <= 0) {
        return null;
    }

    return formatDurationMinutes(minutes);
};

const wasRecordUpdated = (attendance) => {
    if (!attendance?.created_at || !attendance?.updated_at) {
        return false;
    }

    return (
        new Date(attendance.updated_at).getTime() -
            new Date(attendance.created_at).getTime() >
        1000
    );
};

function UpdatedHighlight({ updatedAt }) {
    if (!updatedAt) {
        return null;
    }

    return (
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-sky-100 px-2 py-1 text-[11px] font-semibold text-sky-900 shadow-sm ring-2 ring-sky-200/80 dark:border-sky-600 dark:bg-sky-950/70 dark:text-sky-100 dark:ring-sky-500/40">
            <span className="uppercase tracking-wide text-[10px] text-sky-700 dark:text-sky-300">
                Updated
            </span>
            <span>{formatDateTime(updatedAt)}</span>
        </span>
    );
}

/** HH:mm for time inputs */
const formatTimeInputValue = (value) => {
    if (!value) {
        return "";
    }

    const match = String(value).match(/(\d{2}):(\d{2})/);

    return match ? `${match[1]}:${match[2]}` : "";
};

export default function Index({
    attendances,
    employees = [],
    stats = {},
    filters = {},
    leave_records = [],
    role_shift_settings = [],
    late_after = "09:00",
}) {
    const [month, setMonth] = useState(filters.month ?? currentMonth);
    const [employeeFilter, setEmployeeFilter] = useState(
        filters.employee_id ?? "",
    );
    const [recordFilter, setRecordFilter] = useState(
        filters.record_filter ?? "all",
    );
    const [editingAttendance, setEditingAttendance] = useState(null);
    const [showFormModal, setShowFormModal] = useState(false);
    const [attendancePendingDelete, setAttendancePendingDelete] =
        useState(null);
    const [isLeaveListExpanded, setIsLeaveListExpanded] = useState(true);
    const [currentLeavePage, setCurrentLeavePage] = useState(1);

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm(blankForm);

    const selectedEmployee = useMemo(
        () => employees.find((emp) => emp.id === Number(employeeFilter)),
        [employees, employeeFilter],
    );

    const shiftByRole = useMemo(
        () =>
            Object.fromEntries(
                role_shift_settings.map((row) => [row.role, row.start_time]),
            ),
        [role_shift_settings],
    );

    const shiftStartForEmployee = (employeeId) => {
        const emp = employees.find((e) => e.id === Number(employeeId));
        if (emp?.role && shiftByRole[emp.role]) {
            return shiftByRole[emp.role];
        }

        return late_after;
    };

    const formShiftStart = shiftStartForEmployee(data.employee_id);

    const leavePageCount = Math.max(
        1,
        Math.ceil(leave_records.length / LEAVES_PER_PAGE),
    );

    const paginatedLeaveRecords = useMemo(() => {
        const start = (currentLeavePage - 1) * LEAVES_PER_PAGE;

        return leave_records.slice(start, start + LEAVES_PER_PAGE);
    }, [leave_records, currentLeavePage]);

    useEffect(() => {
        setCurrentLeavePage(1);
    }, [leave_records, month, employeeFilter]);

    useEffect(() => {
        if (currentLeavePage > leavePageCount) {
            setCurrentLeavePage(leavePageCount);
        }
    }, [currentLeavePage, leavePageCount]);

    const openCreateModal = () => {
        setEditingAttendance(null);
        reset();
        setData({
            ...blankForm,
            employee_id: employeeFilter || "",
            work_date: today,
        });
        clearErrors();
        setShowFormModal(true);
    };

    const openEditModal = (attendance) => {
        setEditingAttendance(attendance);
        clearErrors();
        setData({
            employee_id: attendance.employee_id ?? "",
            work_date: toDateInputValue(attendance.work_date) || today,
            status: attendance.status ?? "present",
            is_late: Boolean(
                attendance.is_late ?? attendance.is_late_computed,
            ),
            check_in_time: formatTimeInputValue(attendance.check_in_time),
            check_out_time: formatTimeInputValue(attendance.check_out_time),
            notes: attendance.notes ?? "",
        });
        setShowFormModal(true);
    };

    const closeFormModal = () => {
        setShowFormModal(false);
        setEditingAttendance(null);
        reset();
        clearErrors();
    };

    const submitForm = (event) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => closeFormModal(),
        };

        if (editingAttendance) {
            put(route("attendance.update", editingAttendance.id), options);
            return;
        }

        post(route("attendance.store"), options);
    };

    const navigateFilters = (overrides = {}) => {
        const nextMonth = overrides.month ?? month;
        const nextEmployee =
            overrides.employee_id !== undefined
                ? overrides.employee_id
                : employeeFilter;
        const nextRecordFilter =
            overrides.record_filter !== undefined
                ? overrides.record_filter
                : recordFilter;

        router.get(
            route("attendance.index"),
            {
                month: nextMonth,
                employee_id: nextEmployee || undefined,
                record_filter:
                    nextRecordFilter && nextRecordFilter !== "all"
                        ? nextRecordFilter
                        : undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const applyFilters = (event) => {
        event.preventDefault();
        navigateFilters();
    };

    const setRecordFilterAndApply = (value) => {
        setRecordFilter(value);
        navigateFilters({ record_filter: value });
    };

    const clearFilters = () => {
        setMonth(currentMonth);
        setEmployeeFilter("");
        setRecordFilter("all");
        router.get(
            route("attendance.index"),
            { month: currentMonth },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const confirmDelete = () => {
        if (!attendancePendingDelete) {
            return;
        }

        router.delete(route("attendance.destroy", attendancePendingDelete.id), {
            preserveScroll: true,
            onFinish: () => setAttendancePendingDelete(null),
        });
    };

    const inputCls =
        "w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-300";

    return (
        <MainLayout pageTitle="Attendance">
            <Head title="Attendance" />

            <div className="space-y-6">
                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                                <ClipboardCheck className="h-3.5 w-3.5" />
                                Attendance tracking
                            </div>
                            <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                                Record daily check-in and check-out times
                            </h1>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Capture working hours and leave days per employee to
                                power accurate payroll calculations.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <form
                                onSubmit={applyFilters}
                                className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                            >
                                <CalendarDays className="h-4 w-4 text-gray-400" />
                                <input
                                    type="month"
                                    value={month}
                                    onChange={(event) =>
                                        setMonth(event.target.value)
                                    }
                                    className="min-w-[140px] border-0 bg-transparent p-0 text-sm text-gray-700 focus:outline-none focus:ring-0 dark:text-gray-200"
                                />
                                <select
                                    value={employeeFilter}
                                    onChange={(event) =>
                                        setEmployeeFilter(event.target.value)
                                    }
                                    className="min-w-[180px] border-0 bg-transparent p-0 text-sm text-gray-700 focus:outline-none focus:ring-0 dark:text-gray-200 dark:bg-slate-900"
                                >
                                    <option value="" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">All employees</option>
                                    {employees.map((employee) => (
                                        <option key={employee.id} value={employee.id} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">
                                            {employee.name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="submit"
                                    className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-100 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                                >
                                    <Search className="h-3.5 w-3.5" />
                                    Filter
                                </button>
                                {(filters.employee_id || filters.month) && (
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-slate-700 dark:hover:text-gray-200"
                                    >
                                        Clear
                                    </button>
                                )}
                            </form>

                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-600"
                            >
                                <PlusCircle className="h-4 w-4" />
                                Add attendance
                            </button>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                    <StatCard
                        label="Total records"
                        value={stats.total_records ?? 0}
                        icon={ClipboardCheck}
                    />
                    <StatCard
                        label="Present days"
                        value={stats.present_days ?? 0}
                        icon={Users2}
                        onClick={() => setRecordFilterAndApply("present")}
                        active={recordFilter === "present"}
                    />
                    <StatCard
                        label="Leave days"
                        value={stats.leave_days ?? 0}
                        icon={CalendarDays}
                        onClick={() => setRecordFilterAndApply("leave")}
                        active={recordFilter === "leave"}
                        hint={
                            stats.allowed_leaves != null
                                ? `${stats.remaining_leaves ?? 0} remaining of ${stats.allowed_leaves}`
                                : null
                        }
                    />
                    <StatCard
                        label="Late days"
                        value={stats.late_days ?? 0}
                        icon={AlertCircle}
                        onClick={() => setRecordFilterAndApply("late")}
                        active={recordFilter === "late"}
                        hint="Per role shift start"
                    />
                    <StatCard
                        label="Total late hours"
                        value={formatDurationMinutes(stats.total_late_minutes ?? 0)}
                        icon={Timer}
                        accent="late"
                        hint={
                            selectedEmployee
                                ? `${selectedEmployee.name} · ${month}`
                                : `All staff · ${month}`
                        }
                    />
                    <StatCard
                        label="Total hours"
                        value={formatDurationMinutes(
                            stats.total_minutes ??
                                Math.round(Number(stats.total_hours ?? 0) * 60),
                        )}
                        icon={Clock}
                    />
                </section>

                <section className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Show
                    </span>
                    {RECORD_FILTERS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setRecordFilterAndApply(option.value)}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                recordFilter === option.value
                                    ? "bg-primary-500 text-white"
                                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700"
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </section>

                {(recordFilter === "leave" || leave_records.length > 0) && (
                    <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 dark:border-amber-900/40 dark:bg-amber-900/20">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                                    Leave summary — {month}
                                </h3>
                                <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/90">
                                    {stats.leave_days ?? 0} day
                                    {(stats.leave_days ?? 0) === 1 ? "" : "s"} taken
                                    {stats.allowed_leaves != null && (
                                        <>
                                            {" "}
                                            · {stats.remaining_leaves ?? 0} remaining
                                            (allowance {stats.allowed_leaves})
                                            {(stats.exceeded_leaves ?? 0) > 0 && (
                                                <span className="font-semibold text-red-600 dark:text-red-400">
                                                    {" "}
                                                    · {stats.exceeded_leaves} over limit
                                                </span>
                                            )}
                                        </>
                                    )}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 self-start">
                                {leave_records.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsLeaveListExpanded((open) => !open)
                                        }
                                        className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-amber-900/40"
                                        aria-expanded={isLeaveListExpanded}
                                    >
                                        {isLeaveListExpanded ? (
                                            <>
                                                <ChevronUp className="h-3.5 w-3.5" />
                                                Hide leaves
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="h-3.5 w-3.5" />
                                                Show leaves
                                            </>
                                        )}
                                    </button>
                                )}
                                {recordFilter !== "leave" && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setRecordFilterAndApply("leave")
                                        }
                                        className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-amber-900/40"
                                    >
                                        View leave days only
                                    </button>
                                )}
                            </div>
                        </div>
                        {leave_records.length > 0 ? (
                            isLeaveListExpanded && (
                                <>
                                    <ul className="mt-4 divide-y divide-amber-200/80 rounded-xl border border-amber-200/80 bg-white/70 dark:divide-amber-900/50 dark:border-amber-900/50 dark:bg-slate-900/40">
                                        {paginatedLeaveRecords.map((leave) => (
                                    <li
                                        key={leave.id}
                                        className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm ${
                                            wasRecordUpdated(leave)
                                                ? "bg-sky-50/80 dark:bg-sky-950/30"
                                                : ""
                                        }`}
                                    >
                                        <div>
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {formatDateOnly(leave.work_date, {
                                                    weekday: undefined,
                                                })}
                                            </span>
                                            {!selectedEmployee && leave.employee_name && (
                                                <span className="ml-2 text-gray-500 dark:text-gray-400">
                                                    · {leave.employee_name}
                                                </span>
                                            )}
                                            {leave.created_at && (
                                                <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                                                    Saved {formatDateTime(leave.created_at)}
                                                </p>
                                            )}
                                            {wasRecordUpdated(leave) && (
                                                <UpdatedHighlight updatedAt={leave.updated_at} />
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {leave.notes || "No reason noted"}
                                        </span>
                                    </li>
                                        ))}
                                    </ul>
                                    {leave_records.length > LEAVES_PER_PAGE && (
                                        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-amber-200/80 bg-white/70 px-4 py-3 text-sm text-amber-900/90 dark:border-amber-900/50 dark:bg-slate-900/40 dark:text-amber-200/90 sm:flex-row sm:items-center sm:justify-between">
                                            <span className="text-xs">
                                                Page {currentLeavePage} of{" "}
                                                {leavePageCount}
                                            </span>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    disabled={
                                                        currentLeavePage <= 1
                                                    }
                                                    onClick={() =>
                                                        setCurrentLeavePage(
                                                            (page) =>
                                                                Math.max(
                                                                    1,
                                                                    page - 1,
                                                                ),
                                                        )
                                                    }
                                                    className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/40"
                                                >
                                                    Previous
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={
                                                        currentLeavePage >=
                                                        leavePageCount
                                                    }
                                                    onClick={() =>
                                                        setCurrentLeavePage(
                                                            (page) =>
                                                                Math.min(
                                                                    leavePageCount,
                                                                    page + 1,
                                                                ),
                                                        )
                                                    }
                                                    className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/40"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )
                        ) : (
                            <p className="mt-3 text-sm text-amber-800/80 dark:text-amber-300/80">
                                No leave days recorded for this period.
                            </p>
                        )}
                    </section>
                )}

                <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="border-b border-gray-100 px-6 py-4 dark:border-slate-700">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Attendance records
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {selectedEmployee
                                        ? `${selectedEmployee.name} · ${month}`
                                        : `Month: ${month}`}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-900/50 dark:text-gray-400">
                                <tr>
                                    <th className="px-6 py-4">Work date</th>
                                    <th className="px-6 py-4">Saved at</th>
                                    <th className="px-6 py-4">Employee</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Late</th>
                                    <th className="px-6 py-4">Check-in</th>
                                    <th className="px-6 py-4">Check-out</th>
                                    <th className="px-6 py-4">Hours</th>
                                    <th className="px-6 py-4">Notes</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {attendances.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="10"
                                            className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                                        >
                                            No attendance records found for this
                                            period.
                                        </td>
                                    </tr>
                                ) : (
                                    attendances.data.map((attendance) => (
                                        <tr
                                            key={attendance.id}
                                            className={
                                                wasRecordUpdated(attendance)
                                                    ? "bg-sky-50/70 hover:bg-sky-100/80 dark:bg-sky-950/25 dark:hover:bg-sky-900/35"
                                                    : "hover:bg-gray-50/80 dark:hover:bg-slate-900/40"
                                            }
                                        >
                                            <td className="px-6 py-4 text-gray-700 dark:text-gray-200">
                                                <div className="font-medium">
                                                    {formatDateOnly(attendance.work_date, {
                                                        weekday: undefined,
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                <div className="font-medium text-gray-800 dark:text-gray-100">
                                                    {attendance.created_at
                                                        ? formatDateTime(attendance.created_at)
                                                        : "—"}
                                                </div>
                                                {wasRecordUpdated(attendance) && (
                                                    <UpdatedHighlight
                                                        updatedAt={attendance.updated_at}
                                                    />
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {attendance.employee?.name ?? "—"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                        attendance.status === "present"
                                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                                    }`}
                                                >
                                                    {attendance.status === "present"
                                                        ? "Present"
                                                        : "Leave"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {(() => {
                                                    const label =
                                                        lateDurationLabel(attendance);

                                                    if (!label) {
                                                        return (
                                                            <span className="text-xs text-gray-400">
                                                                —
                                                            </span>
                                                        );
                                                    }

                                                    return (
                                                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                                            {label}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {formatTimeOnly(attendance.check_in_time)}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {formatTimeOnly(attendance.check_out_time)}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {formatDurationMinutes(attendance.worked_minutes)}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                {attendance.notes || "—"}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() =>
                                                            openEditModal(attendance)
                                                        }
                                                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                                                    >
                                                        <PencilLine className="h-3.5 w-3.5" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setAttendancePendingDelete(
                                                                attendance,
                                                            )
                                                        }
                                                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-900/20"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {attendances.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 text-sm text-gray-500 dark:border-slate-700">
                            <span>
                                Page {attendances.current_page} of{" "}
                                {attendances.last_page}
                            </span>
                            <div className="flex gap-2">
                                {attendances.prev_page_url && (
                                    <button
                                        onClick={() =>
                                            router.get(attendances.prev_page_url)
                                        }
                                        className="rounded-lg border border-gray-200 px-4 py-2 hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700"
                                    >
                                        Previous
                                    </button>
                                )}
                                {attendances.next_page_url && (
                                    <button
                                        onClick={() =>
                                            router.get(attendances.next_page_url)
                                        }
                                        className="rounded-lg border border-gray-200 px-4 py-2 hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700"
                                    >
                                        Next
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            </div>

            <Modal show={showFormModal} onClose={closeFormModal} maxWidth="2xl">
                <form onSubmit={submitForm} className="p-6 space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {editingAttendance
                                    ? "Edit attendance"
                                    : "Add attendance"}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Record daily check-in and check-out times or mark
                                a leave day.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={closeFormModal}
                            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
                        >
                            Close
                        </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Employee *
                            </label>
                            <select
                                value={data.employee_id}
                                onChange={(e) => {
                                    const employeeId = e.target.value;
                                    setData("employee_id", employeeId);
                                    if (data.check_in_time) {
                                        setData(
                                            "is_late",
                                            isCheckInLate(
                                                data.check_in_time,
                                                shiftStartForEmployee(employeeId),
                                            ),
                                        );
                                    }
                                }}
                                className={inputCls}
                            >
                                <option value="" className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white">Select employee</option>
                                {employees.map((employee) => (
                                    <option key={employee.id} value={employee.id} className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                                        {employee.name}
                                    </option>
                                ))}
                            </select>
                            {errors.employee_id && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.employee_id}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Work date *
                            </label>
                            <input
                                type="date"
                                value={data.work_date}
                                onChange={(e) => setData("work_date", e.target.value)}
                                className={inputCls}
                            />
                            {errors.work_date && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.work_date}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Status *
                            </label>
                            <select
                                value={data.status}
                                onChange={(e) => setData("status", e.target.value)}
                                className={inputCls}
                            >
                                <option value="present" className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white">Present</option>
                                <option value="leave" className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white">Leave</option>
                            </select>
                        </div>
                        {data.status === "present" && (
                            <>
                                <div className="md:col-span-2">
                                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 dark:border-slate-600 dark:bg-slate-900/50 dark:text-gray-200">
                                        <input
                                            type="checkbox"
                                            checked={data.is_late}
                                            onChange={(e) =>
                                                setData("is_late", e.target.checked)
                                            }
                                            className="rounded border-gray-300 text-primary-500 focus:ring-primary-300"
                                        />
                                        Mark as late
                                        <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                                            (auto if check-in after{" "}
                                            {formShiftStart} for role)
                                        </span>
                                    </label>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        Check-in time *
                                    </label>
                                    <input
                                        type="time"
                                        value={data.check_in_time}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setData("check_in_time", value);
                                            setData(
                                                "is_late",
                                                isCheckInLate(
                                                    value,
                                                    shiftStartForEmployee(
                                                        data.employee_id,
                                                    ),
                                                ),
                                            );
                                        }}
                                        className={inputCls}
                                    />
                                    {errors.check_in_time && (
                                        <p className="mt-1 text-xs text-red-500">
                                            {errors.check_in_time}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        Check-out time *
                                    </label>
                                    <input
                                        type="time"
                                        value={data.check_out_time}
                                        onChange={(e) =>
                                            setData(
                                                "check_out_time",
                                                e.target.value,
                                            )
                                        }
                                        className={inputCls}
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        If checkout is earlier than check-in (e.g. night shift past
                                        midnight), hours are counted to the next calendar day.
                                    </p>
                                    {errors.check_out_time && (
                                        <p className="mt-1 text-xs text-red-500">
                                            {errors.check_out_time}
                                        </p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Notes
                        </label>
                        <textarea
                            rows="3"
                            value={data.notes}
                            onChange={(e) => setData("notes", e.target.value)}
                            className={inputCls}
                            placeholder="Optional notes or leave reason"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={closeFormModal}
                            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-60"
                        >
                            {processing
                                ? "Saving..."
                                : editingAttendance
                                  ? "Update attendance"
                                  : "Save attendance"}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={!!attendancePendingDelete}
                onClose={() => setAttendancePendingDelete(null)}
                onConfirm={confirmDelete}
                title="Delete attendance?"
                message="This attendance entry will be removed. Payroll calculations will update immediately."
            />
        </MainLayout>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    hint,
    onClick,
    active = false,
    accent = "primary",
}) {
    const Wrapper = onClick ? "button" : "div";
    const iconClass =
        accent === "late"
            ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300"
            : "bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300";

    return (
        <Wrapper
            type={onClick ? "button" : undefined}
            onClick={onClick}
            className={`w-full rounded-2xl border bg-white p-5 text-left shadow-sm transition dark:bg-slate-800 ${
                active
                    ? "border-primary-400 ring-2 ring-primary-200 dark:border-primary-600 dark:ring-primary-900/40"
                    : "border-gray-200 dark:border-slate-700"
            } ${onClick ? "hover:border-primary-300 dark:hover:border-primary-700" : ""}`}
        >
            <div className="flex items-center gap-3">
                <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
                >
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {label}
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {value}
                    </p>
                    {hint && (
                        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                            {hint}
                        </p>
                    )}
                </div>
            </div>
        </Wrapper>
    );
}
