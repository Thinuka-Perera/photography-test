import ConfirmModal from "@/Components/ConfirmModal";
import EmployeeBirthdayCalendar from "@/Components/Employees/EmployeeBirthdayCalendar";
import Modal from "@/Components/Modal";
import MainLayout from "@/Layouts/MainLayout";
import { Head, router, useForm } from "@inertiajs/react";
import {
    BadgeCheck,
    Cake,
    CalendarDays,
    PlusCircle,
    Search,
    Trash2,
    UserMinus,
    Users2,
    PencilLine,
} from "lucide-react";
import { useEffect, useState } from "react";

const blankForm = {
    name: "",
    email: "",
    phone: "",
    role: "",
    default_commission_pct: "",
    status: "active",
    notes: "",
    address: "",
    parent_phone: "",
    real_location: "",
    epf_number: "",
    birthday: "",
    basic_salary: "",
    overtime_rate: "",
};

function toDateInputValue(value) {
    if (!value) {
        return "";
    }

    return String(value).slice(0, 10);
}

function formatBirthdayLabel(value) {
    if (!value) {
        return "—";
    }

    const date = new Date(`${toDateInputValue(value)}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export default function Index({
    employees,
    stats = {},
    filters = {},
    birthdayReminders = [],
    birthdayCalendar,
    systemRoles = [],
}) {
    const [search, setSearch] = useState(filters.search ?? "");
    const [showBirthdayCalendar, setShowBirthdayCalendar] = useState(
        Boolean(filters.show_calendar),
    );
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [showFormModal, setShowFormModal] = useState(false);
    const [employeePendingDelete, setEmployeePendingDelete] = useState(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm(blankForm);

    useEffect(() => {
        setShowBirthdayCalendar(Boolean(filters.show_calendar));
    }, [filters.show_calendar]);

    const openCreateModal = () => {
        setEditingEmployee(null);
        reset();
        setData(blankForm);
        clearErrors();
        setShowFormModal(true);
    };

    const openEditModal = (employee) => {
        setEditingEmployee(employee);
        clearErrors();
        setData({
            name: employee.name ?? "",
            email: employee.email ?? "",
            phone: employee.phone ?? "",
            role: employee.role ?? "",
            default_commission_pct: employee.default_commission_pct ?? "",
            status: employee.status ?? "active",
            notes: employee.notes ?? "",
            address: employee.address ?? "",
            parent_phone: employee.parent_phone ?? "",
            real_location: employee.real_location ?? "",
            epf_number: employee.epf_number ?? "",
            birthday: toDateInputValue(employee.birthday),
            basic_salary: employee.basic_salary ?? "",
            overtime_rate: employee.overtime_rate ?? "",
        });
        setShowFormModal(true);
    };

    const employeeIndexParams = (extra = {}) => ({
        search: search || undefined,
        show_calendar: showBirthdayCalendar ? 1 : undefined,
        calendar_year: filters.calendar_year,
        calendar_month: filters.calendar_month,
        ...extra,
    });

    const goToCalendarMonth = (calendarYear, calendarMonth) => {
        router.get(
            route("employees.index"),
            employeeIndexParams({
                show_calendar: 1,
                calendar_year: calendarYear,
                calendar_month: calendarMonth,
            }),
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const toggleBirthdayCalendar = () => {
        const next = !showBirthdayCalendar;
        setShowBirthdayCalendar(next);

        router.get(
            route("employees.index"),
            employeeIndexParams({
                show_calendar: next ? 1 : undefined,
            }),
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const closeFormModal = () => {
        setShowFormModal(false);
        setEditingEmployee(null);
        reset();
        clearErrors();
    };

    const submitForm = (event) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => closeFormModal(),
        };

        if (editingEmployee) {
            put(route("employees.update", editingEmployee.id), options);
            return;
        }

        post(route("employees.store"), options);
    };

    const submitSearch = (event) => {
        event.preventDefault();
        router.get(
            route("employees.index"),
            { search },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const clearSearch = () => {
        setSearch("");
        router.get(
            route("employees.index"),
            {},
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const confirmDelete = () => {
        if (!employeePendingDelete) {
            return;
        }

        router.delete(route("employees.destroy", employeePendingDelete.id), {
            preserveScroll: true,
            onFinish: () => setEmployeePendingDelete(null),
        });
    };

    const inputCls =
        "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500";

    return (
        <MainLayout pageTitle="Employees">
            <Head title="Employees" />

            <div className="space-y-6">
                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                                <Users2 className="h-3.5 w-3.5" />
                                Employee management
                            </div>
                            <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                                Manage staff profiles and status
                            </h1>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Track core employee details, roles, and availability
                                before running monthly payroll.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <form
                                onSubmit={submitSearch}
                                className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                            >
                                <Search className="h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search name, phone, or role"
                                    className="w-full min-w-[220px] border-0 bg-transparent p-0 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-0 dark:text-gray-200"
                                />
                                {filters.search ? (
                                    <button
                                        type="button"
                                        onClick={clearSearch}
                                        className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-slate-700 dark:hover:text-gray-200"
                                    >
                                        Clear
                                    </button>
                                ) : null}
                            </form>

                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-600"
                            >
                                <PlusCircle className="h-4 w-4" />
                                Add employee
                            </button>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <StatCard
                        label="Total employees"
                        value={stats.total ?? 0}
                        icon={Users2}
                    />
                    <StatCard
                        label="Active employees"
                        value={stats.active ?? 0}
                        icon={BadgeCheck}
                    />
                    <StatCard
                        label="Inactive employees"
                        value={stats.inactive ?? 0}
                        icon={UserMinus}
                    />
                </section>

                {birthdayReminders.length > 0 && (
                    <section className="rounded-2xl border border-pink-200 bg-pink-50/80 p-4 dark:border-pink-900/40 dark:bg-pink-900/20">
                        <div className="flex items-start gap-3">
                            <Cake className="mt-0.5 h-5 w-5 shrink-0 text-pink-600 dark:text-pink-300" />
                            <div>
                                <p className="text-sm font-semibold text-pink-900 dark:text-pink-100">
                                    Birthday reminders
                                </p>
                                <ul className="mt-2 space-y-1 text-sm text-pink-800 dark:text-pink-200">
                                    {birthdayReminders.map((reminder) => (
                                        <li key={reminder.id}>
                                            {reminder.message}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </section>
                )}

                <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Employee birthdays
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Monthly calendar (weddings page style)
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={toggleBirthdayCalendar}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700/40"
                        >
                            <CalendarDays className="h-4 w-4" />
                            {showBirthdayCalendar
                                ? "Hide calendar"
                                : "Employee birthdays"}
                        </button>
                    </div>

                    {showBirthdayCalendar && birthdayCalendar && (
                        <div className="mt-4">
                            <EmployeeBirthdayCalendar
                                calendar={birthdayCalendar}
                                onClose={() => {
                                    setShowBirthdayCalendar(false);
                                    router.get(
                                        route("employees.index"),
                                        employeeIndexParams({
                                            show_calendar: undefined,
                                        }),
                                        {
                                            preserveState: true,
                                            preserveScroll: true,
                                            replace: true,
                                        },
                                    );
                                }}
                                onMonthChange={goToCalendarMonth}
                            />
                        </div>
                    )}
                </section>

                <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="border-b border-gray-100 px-6 py-4 dark:border-slate-700">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Employees
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {employees.total
                                    ? `Showing ${employees.from}-${employees.to} of ${employees.total} employees`
                                    : "No employees saved yet"}
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-900/50 dark:text-gray-400">
                                <tr>
                                    <th className="px-6 py-4">Employee</th>
                                    <th className="px-6 py-4">Birthday</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {employees.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="5"
                                            className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                                        >
                                            Add your first employee to begin tracking
                                            attendance and payroll.
                                        </td>
                                    </tr>
                                ) : (
                                    employees.data.map((employee) => (
                                        <tr
                                            key={employee.id}
                                            className="hover:bg-gray-50/80 dark:hover:bg-slate-900/40"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900 dark:text-white">
                                                    {employee.name}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {employee.email || "No email"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {formatBirthdayLabel(employee.birthday)}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {employee.role || "—"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${employee.status === "active"
                                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                                        : "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300"
                                                        }`}
                                                >
                                                    {employee.status === "active"
                                                        ? "Active"
                                                        : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() =>
                                                            openEditModal(employee)
                                                        }
                                                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                                                    >
                                                        <PencilLine className="h-3.5 w-3.5" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setEmployeePendingDelete(
                                                                employee,
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

                    {employees.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 text-sm text-gray-500 dark:border-slate-700">
                            <span>
                                Page {employees.current_page} of {employees.last_page}
                            </span>
                            <div className="flex gap-2">
                                {employees.prev_page_url && (
                                    <button
                                        onClick={() =>
                                            router.get(employees.prev_page_url)
                                        }
                                        className="rounded-lg border border-gray-200 px-4 py-2 hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700"
                                    >
                                        Previous
                                    </button>
                                )}
                                {employees.next_page_url && (
                                    <button
                                        onClick={() =>
                                            router.get(employees.next_page_url)
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
                <form onSubmit={submitForm} className="p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {editingEmployee
                                    ? "Edit employee"
                                    : "Add new employee"}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {editingEmployee
                                    ? "Update employee details and salary defaults."
                                    : "Create a new employee record for attendance and payroll."}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={closeFormModal}
                            className="rounded-xl px-3 py-2 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-slate-700"
                        >
                            Close
                        </button>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-6">
                        <div className="md:col-span-3">
                            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Full name *
                            </label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData("name", e.target.value)}
                                className={inputCls}
                                placeholder="Employee name"
                            />
                            {errors.name && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.name}
                                </p>
                            )}
                        </div>
                        <div className="md:col-span-3">
                            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Role *
                            </label>
                            <select
                                value={data.role}
                                onChange={(e) => setData("role", e.target.value)}
                                className={inputCls}
                            >
                                <option value="">Select role...</option>
                                {systemRoles.map((r) => (
                                    <option key={r.slug} value={r.slug}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                            {errors.role && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.role}
                                </p>
                            )}
                        </div>
                        {(data.role === 'editor' || data.role?.toLowerCase().includes('dealer')) && (
                            <div className="md:col-span-6">
                                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Default Commission %
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={data.default_commission_pct}
                                    onChange={(e) => setData("default_commission_pct", e.target.value)}
                                    className={inputCls}
                                    placeholder="5.00"
                                />
                                {errors.default_commission_pct && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {errors.default_commission_pct}
                                    </p>
                                )}
                            </div>
                        )}
                        <div className="md:col-span-3">
                            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Email
                            </label>
                            <input
                                type="email"
                                value={data.email}
                                onChange={(e) => setData("email", e.target.value)}
                                className={inputCls}
                                placeholder="name@email.com"
                            />
                            {errors.email && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.email}
                                </p>
                            )}
                        </div>
                        <div className="md:col-span-3">
                            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Phone
                            </label>
                            <input
                                type="text"
                                value={data.phone}
                                onChange={(e) => setData("phone", e.target.value)}
                                className={inputCls}
                                placeholder="0771234567"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Birthday
                            </label>
                            <input
                                type="date"
                                value={data.birthday}
                                onChange={(e) => setData("birthday", e.target.value)}
                                className={inputCls}
                            />
                            {errors.birthday && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.birthday}
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Status *
                            </label>
                            <select
                                value={data.status}
                                onChange={(e) => setData("status", e.target.value)}
                                className={inputCls}
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                EPF Number
                            </label>
                            <input
                                type="text"
                                value={data.epf_number}
                                onChange={(e) => setData("epf_number", e.target.value)}
                                className={inputCls}
                                placeholder="EPF-12345"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Parent Phone
                            </label>
                            <input
                                type="text"
                                value={data.parent_phone}
                                onChange={(e) => setData("parent_phone", e.target.value)}
                                className={inputCls}
                                placeholder="Emergency"
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Address
                            </label>
                            <input
                                type="text"
                                value={data.address}
                                onChange={(e) => setData("address", e.target.value)}
                                className={inputCls}
                                placeholder="Home address"
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Real Location
                            </label>
                            <input
                                type="text"
                                value={data.real_location}
                                onChange={(e) => setData("real_location", e.target.value)}
                                className={inputCls}
                                placeholder="Current location"
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Basic Salary (LKR)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={data.basic_salary}
                                onChange={(e) => setData("basic_salary", e.target.value)}
                                className={inputCls}
                                placeholder="e.g. 50000.00"
                            />
                            {errors.basic_salary && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.basic_salary}
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-3">
                            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                OT Rate per Hour (LKR)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={data.overtime_rate}
                                onChange={(e) => setData("overtime_rate", e.target.value)}
                                className={inputCls}
                                placeholder="e.g. 150.00"
                            />
                            {errors.overtime_rate && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.overtime_rate}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-3">
                        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Notes
                        </label>
                        <textarea
                            rows="1"
                            value={data.notes}
                            onChange={(e) => setData("notes", e.target.value)}
                            className={`${inputCls} min-h-12`}
                            placeholder="Optional notes…"
                        />
                    </div>

                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={closeFormModal}
                            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {processing
                                ? "Saving..."
                                : editingEmployee
                                    ? "Update employee"
                                    : "Create employee"}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={!!employeePendingDelete}
                onClose={() => setEmployeePendingDelete(null)}
                onConfirm={confirmDelete}
                title="Delete employee?"
                message="This employee will be removed from the system. Any linked attendance or salary records must be removed first."
            />
        </MainLayout>
    );
}

function StatCard({ icon: Icon, label, value }) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300">
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {label}
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {value}
                    </p>
                </div>
            </div>
        </div>
    );
}
