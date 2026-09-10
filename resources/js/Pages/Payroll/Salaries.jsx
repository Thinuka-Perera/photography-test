import ConfirmModal from "@/Components/ConfirmModal";
import Modal from "@/Components/Modal";
import MainLayout from "@/Layouts/MainLayout";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import {
    CalendarDays,
    PlusCircle,
    WalletCards,
    PencilLine,
    Trash2,
    Users2,
    ReceiptText,
    CheckCircle,
    FileDown,
    Share2,
    AlertCircle,
    ArrowRight,
    ChevronUp,
    ChevronDown
} from "lucide-react";
import { useMemo, useState } from "react";
import { generateSalaryPDF, generateBulkSalaryReport, sharePDFOnWhatsApp } from "@/utils/pdfGenerator";

const currentMonth = new Date().toISOString().slice(0, 7);
const todayDate = new Date().toISOString().slice(0, 10);

const blankForm = {
    employee_id: "",
    month: currentMonth,
    basic_salary: "",
    attendance_allowance: "",
    overtime_rate: "150",
    notes: "",
};

const blankLedgerForm = {
    entry_date: todayDate,
    type: "allowance",
    title: "",
    amount: "",
    notes: "",
};

const formatCurrency = (value) =>
    new Intl.NumberFormat("en-LK", {
        style: "currency",
        currency: "LKR",
        maximumFractionDigits: 2,
    }).format(Number(value || 0));

const formatHours = (value) =>
    Number(value || 0).toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

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

const toDateInput = (value) => (value ? value.slice(0, 10) : "");

export default function Salaries({ month = currentMonth, rows = [], totals = {} }) {
    const { auth, shopSettings } = usePage().props;

    const canCreate = Boolean(
        auth?.access?.is_super_admin ||
        auth?.access?.page_lookup?.['salaries.create'] ||
        auth?.access?.page_lookup?.['salaries']
    );
    const canEdit = Boolean(
        auth?.access?.is_super_admin ||
        auth?.access?.page_lookup?.['salaries.edit'] ||
        auth?.access?.page_lookup?.['salaries']
    );
    const canDelete = Boolean(
        auth?.access?.is_super_admin ||
        auth?.access?.page_lookup?.['salaries.delete'] ||
        auth?.access?.page_lookup?.['salaries']
    );

    const [selectedMonth, setSelectedMonth] = useState(month ?? currentMonth);
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingProfile, setEditingProfile] = useState(null);
    const [profilePendingDelete, setProfilePendingDelete] = useState(null);
    const [ledgerEmployeeId, setLedgerEmployeeId] = useState(null);
    const [ledgerProfileId, setLedgerProfileId] = useState(null);
    const [ledgerEditingEntry, setLedgerEditingEntry] = useState(null);
    const [ledgerPendingDelete, setLedgerPendingDelete] = useState(null);
    const [profilePendingPay, setProfilePendingPay] = useState(null);
    const [expandedSections, setExpandedSections] = useState({
        commission: true,
        allowance: true,
        deduction: true
    });
    const [activeLedgerFormType, setActiveLedgerFormType] = useState(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm(blankForm);

    const {
        data: ledgerData,
        setData: setLedgerData,
        post: postLedger,
        put: putLedger,
        processing: ledgerProcessing,
        errors: ledgerErrors,
        reset: resetLedger,
        clearErrors: clearLedgerErrors,
    } = useForm(blankLedgerForm);

    const employeeOptions = useMemo(
        () => rows.map((row) => row.employee),
        [rows],
    );

    const ledgerEmployeeRow = useMemo(
        () => rows.find((row) => row.employee.id === ledgerEmployeeId),
        [rows, ledgerEmployeeId],
    );

    const ledgerMonthOptions = useMemo(() => {
        if (!ledgerEmployeeRow) {
            return [];
        }

        const byId = new Map();
        const candidates = [
            ...(ledgerEmployeeRow.history ?? []),
            ...(ledgerEmployeeRow.profile ? [ledgerEmployeeRow.profile] : []),
        ];

        for (const profile of candidates) {
            if (!profile?.id) continue;
            byId.set(String(profile.id), profile);
        }

        return Array.from(byId.values()).sort((a, b) =>
            String(b.month ?? '').localeCompare(String(a.month ?? '')),
        );
    }, [ledgerEmployeeRow]);

    const activeLedgerProfile =
        ledgerMonthOptions.find(
            (profile) => String(profile.id) === String(ledgerProfileId),
        ) ??
        ledgerEmployeeRow?.profile ??
        null;

    const ledgerEntries = activeLedgerProfile?.ledger_entries ?? [];
    const ledgerAttendance = ledgerEmployeeRow?.attendance ?? [];
    const ledgerLocked = Boolean(activeLedgerProfile?.paid_at);
    const activeLedgerMonth = activeLedgerProfile?.month
        ? String(activeLedgerProfile.month).slice(0, 7)
        : selectedMonth;
    const showAttendanceForActiveLedgerMonth = activeLedgerMonth === selectedMonth;
    const commissionLedgerEntries = ledgerEntries.filter(
        (entry) => entry.type === "allowance" && /commission/i.test(entry.title ?? ""),
    );
    const manualAllowanceEntries = ledgerEntries.filter(
        (entry) => entry.type === "allowance" && !/commission/i.test(entry.title ?? ""),
    );
    const deductionEntries = ledgerEntries.filter((entry) => entry.type === "deduction");
    const commissionTotal = commissionLedgerEntries.reduce(
        (sum, entry) => sum + Number(entry.amount ?? 0),
        0,
    );
    const manualAllowanceTotal = manualAllowanceEntries.reduce(
        (sum, entry) => sum + Number(entry.amount ?? 0),
        0,
    );
    const deductionTotal = deductionEntries.reduce(
        (sum, entry) => sum + Number(entry.amount ?? 0),
        0,
    );
    const netLedgerImpact = commissionTotal + manualAllowanceTotal - deductionTotal;

    const activeEmployee = employeeOptions.find(x => String(x.id) === String(data.employee_id));
    const isDealer = !!(activeEmployee?.role?.toLowerCase().includes('dealer') || activeEmployee?.job_role?.toLowerCase().includes('dealer'));

    const openCreateModal = (employee = null) => {
        setEditingProfile(null);
        reset();
        const isEmpDealer = !!(employee?.role?.toLowerCase().includes('dealer') || employee?.job_role?.toLowerCase().includes('dealer'));
        setData({
            ...blankForm,
            month: selectedMonth,
            employee_id: employee?.id ?? "",
            basic_salary: isEmpDealer ? "0" : (employee?.basic_salary ?? ""),
            attendance_allowance: isEmpDealer ? "0" : (employee?.attendance_allowance ?? ""),
            overtime_rate: isEmpDealer ? "0" : (employee?.overtime_rate ?? "150"),
        });
        clearErrors();
        setShowFormModal(true);
    };

    const openEditModal = (row) => {
        setEditingProfile(row.profile);
        clearErrors();
        const isEmpDealer = !!(row.employee?.role?.toLowerCase().includes('dealer') || row.employee?.job_role?.toLowerCase().includes('dealer'));
        setData({
            employee_id: row.employee.id,
            month: selectedMonth,
            basic_salary: isEmpDealer ? "0" : (row.profile.basic_salary ?? ""),
            attendance_allowance: isEmpDealer ? "0" : (row.profile.attendance_allowance ?? ""),
            overtime_rate: isEmpDealer ? "0" : (row.profile.overtime_rate ?? "150"),
            notes: row.profile.notes ?? "",
        });
        setShowFormModal(true);
    };

    const closeFormModal = () => {
        setShowFormModal(false);
        setEditingProfile(null);
        reset();
        clearErrors();
    };

    const openLedgerModal = (row) => {
        if (!row.profile) {
            return;
        }

        const profileMonth = row.profile.month
            ? String(row.profile.month).slice(0, 7)
            : selectedMonth;

        setLedgerEmployeeId(row.employee.id);
        setLedgerProfileId(row.profile.id);
        setLedgerEditingEntry(null);
        resetLedger();
        setLedgerData({
            ...blankLedgerForm,
            entry_date: todayDate,
        });
        clearLedgerErrors();
    };

    const closeLedgerModal = () => {
        setLedgerEmployeeId(null);
        setLedgerProfileId(null);
        setLedgerEditingEntry(null);
        setActiveLedgerFormType(null);
        resetLedger();
        clearLedgerErrors();
    };

    const submitForm = (event) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => closeFormModal(),
        };

        if (editingProfile) {
            put(route("payroll.salaries.update", editingProfile.id), options);
            return;
        }

        post(route("payroll.salaries.store"), options);
    };

    const applyFilters = (event) => {
        event.preventDefault();
        router.get(
            route("payroll.salaries.index"),
            { month: selectedMonth },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const confirmDelete = () => {
        if (!profilePendingDelete) {
            return;
        }

        router.delete(route("payroll.salaries.destroy", profilePendingDelete.id), {
            preserveScroll: true,
            onFinish: () => setProfilePendingDelete(null),
        });
    };

    const confirmPay = () => {
        if (!profilePendingPay) {
            return;
        }

        router.post(
            route("payroll.salaries.pay", profilePendingPay.profile.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setProfilePendingPay(null),
            },
        );
    };

    const submitLedgerForm = (event) => {
        event.preventDefault();

        if (!activeLedgerProfile || ledgerLocked) {
            return;
        }

        const options = {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                resetLedger();
                setLedgerEditingEntry(null);
                setLedgerData({
                    ...blankLedgerForm,
                    entry_date: todayDate,
                });
            },
        };

        if (ledgerEditingEntry) {
            putLedger(
                route("payroll.ledger.update", ledgerEditingEntry.id),
                options,
            );
            return;
        }

        postLedger(
            route("payroll.ledger.store", activeLedgerProfile.id),
            options,
        );
    };

    const openLedgerEdit = (entry) => {
        setLedgerEditingEntry(entry);
        setLedgerData({
            entry_date: toDateInput(entry.entry_date),
            type: entry.type ?? "allowance",
            title: entry.title ?? "",
            amount: entry.amount ?? "",
            notes: entry.notes ?? "",
        });
        clearLedgerErrors();

        let secType = entry.type;
        if (entry.type === "allowance" && /commission/i.test(entry.title ?? "")) {
            secType = "commission";
        }
        setActiveLedgerFormType(secType);
        setExpandedSections(prev => ({ ...prev, [secType]: true }));
    };

    const confirmLedgerDelete = () => {
        if (!ledgerPendingDelete) {
            return;
        }

        router.delete(
            route("payroll.ledger.destroy", ledgerPendingDelete.id),
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setLedgerPendingDelete(null),
            },
        );
    };

    const renderLedgerSection = (sectionKey, sectionTitle, entries, typeBadgeClass, totalAmount, emptyMessage, defaultTitlePrefix = "") => {
        const isExpanded = expandedSections[sectionKey];
        const isFormActive = activeLedgerFormType === sectionKey;

        return (
            <div className="overflow-hidden mb-6 rounded-2xl border border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between bg-gray-50 px-4 py-3 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                            {sectionTitle} <span className="text-gray-500 font-normal">({entries.length})</span>
                        </h4>
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                            {formatCurrency(totalAmount)}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!ledgerLocked && canEdit && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (!isExpanded) {
                                        setExpandedSections(prev => ({ ...prev, [sectionKey]: true }));
                                    }
                                    setLedgerEditingEntry(null);
                                    clearLedgerErrors();
                                    setLedgerData({
                                        ...blankLedgerForm,
                                        type: sectionKey === 'deduction' ? 'deduction' : 'allowance',
                                        title: defaultTitlePrefix,
                                        entry_date: todayDate,
                                    });
                                    setActiveLedgerFormType(sectionKey);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/50"
                            >
                                <PlusCircle className="h-3.5 w-3.5" />
                                New
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setExpandedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }))}
                            className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg dark:hover:bg-slate-700 transition"
                        >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-slate-700">
                        {isFormActive && !ledgerLocked && canEdit && (
                            <div className="p-4 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
                                <form onSubmit={submitLedgerForm} className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                            {ledgerEditingEntry ? "Edit entry" : `Add ${sectionTitle.toLowerCase()}`}
                                        </h5>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveLedgerFormType(null);
                                                setLedgerEditingEntry(null);
                                                clearLedgerErrors();
                                            }}
                                            className="text-xs font-semibold text-gray-500 transition hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-200">Date *</label>
                                            <input type="date" value={ledgerData.entry_date} onChange={e => setLedgerData("entry_date", e.target.value)} className={`${inputCls} !py-2 !text-xs`} />
                                            {ledgerErrors.entry_date && <p className="mt-1 text-[11px] text-red-500">{ledgerErrors.entry_date}</p>}
                                        </div>
                                        <div className="hidden">
                                            <select value={ledgerData.type} onChange={e => setLedgerData("type", e.target.value)} className={inputCls}>
                                                <option value="allowance">Allowance</option>
                                                <option value="deduction">Deduction</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-200">Amount (LKR) *</label>
                                            <input type="number" min="0" step="0.01" value={ledgerData.amount} onChange={e => setLedgerData("amount", e.target.value)} className={`${inputCls} !py-2 !text-xs`} />
                                            {ledgerErrors.amount && <p className="mt-1 text-[11px] text-red-500">{ledgerErrors.amount}</p>}
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-200">Title *</label>
                                            <input type="text" value={ledgerData.title} onChange={e => setLedgerData("title", e.target.value)} className={`${inputCls} !py-2 !text-xs`} placeholder={`e.g. ${sectionTitle}`} />
                                            {ledgerErrors.title && <p className="mt-1 text-[11px] text-red-500">{ledgerErrors.title}</p>}
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-200">Notes</label>
                                            <textarea rows="1" value={ledgerData.notes} onChange={e => setLedgerData("notes", e.target.value)} className={`${inputCls} !py-2 !text-xs min-h-[48px]`} placeholder="Optional" />
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button type="submit" disabled={ledgerProcessing} className="rounded-xl bg-primary-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60">
                                            {ledgerProcessing ? "Saving..." : ledgerEditingEntry ? "Update" : "Add"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="max-h-60 overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white text-xs uppercase text-gray-400 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
                                    <tr>
                                        <th className="px-4 py-2.5 font-medium">Date</th>
                                        <th className="px-4 py-2.5 font-medium">Title</th>
                                        <th className="px-4 py-2.5 font-medium">Amount</th>
                                        <th className="px-4 py-2.5 font-medium">Notes</th>
                                        <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                    {entries.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                                                {emptyMessage}
                                            </td>
                                        </tr>
                                    ) : (
                                        entries.map((entry) => (
                                            <tr key={entry.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-900/40">
                                                <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{toDateInput(entry.entry_date)}</td>
                                                <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-200">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`inline-block w-2 h-2 rounded-full ${typeBadgeClass}`}></span>
                                                        {entry.title}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-xs font-medium text-gray-900 dark:text-white">{formatCurrency(entry.amount)}</td>
                                                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">{entry.notes || "—"}</td>
                                                <td className="px-4 py-3 text-right">
                                                    {ledgerLocked ? (
                                                        <span className="text-xs text-gray-400 dark:text-gray-500">Locked</span>
                                                    ) : (
                                                        <div className="flex justify-end gap-1.5">
                                                            {canEdit && (
                                                                <button onClick={() => openLedgerEdit(entry)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition dark:hover:bg-slate-700 dark:hover:text-gray-200">
                                                                    <PencilLine className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                            {canDelete && (
                                                                <button onClick={() => setLedgerPendingDelete(entry)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition dark:hover:bg-red-900/20">
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                            {!canEdit && !canDelete && (
                                                                <span className="text-xs text-gray-400 dark:text-gray-500">View Only</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const inputCls =
        "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500";

    return (
        <MainLayout pageTitle="Salaries">
            <Head title="Salaries" />

            <div className="space-y-6">
                {/* ── Tab Navigation (Admin only) ──────────────────────────*/}
                <div className="flex items-center gap-4 border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
                    <a
                        href={route("payroll.salaries.index")}
                        className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white border-b-2 border-primary-500 whitespace-nowrap"
                    >
                        Salary Profiles
                    </a>
                    {["super_admin", "admin"].includes(auth?.user?.role?.slug) && (
                        <a
                            href={route("payroll.editor-commissions.index")}
                            className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 border-b-2 border-transparent hover:text-gray-900 dark:hover:text-white whitespace-nowrap"
                        >
                            Editor Commissions
                        </a>
                    )}
                </div>

                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                                <WalletCards className="h-3.5 w-3.5" />
                                Payroll summary
                            </div>
                            <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                                Monthly salary profiles and total pay
                            </h1>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Attendance allowance is based on 200 hours/month,
                                OT is paid per hour, and leave encashment/deductions
                                are calculated against basic salary. Use the ledger
                                to add monthly allowances or deductions.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <form
                                onSubmit={applyFilters}
                                className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                            >
                                <CalendarDays className="h-4 w-4 text-gray-400" />
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(event) =>
                                        setSelectedMonth(event.target.value)
                                    }
                                    className="min-w-[140px] border-0 bg-transparent p-0 text-sm text-gray-700 focus:outline-none focus:ring-0 dark:text-gray-200"
                                />
                                <button
                                    type="submit"
                                    className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-100 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                                >
                                    Apply
                                </button>
                            </form>

                            <button
                                type="button"
                                onClick={async () => {
                                    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                                    const [y, m] = selectedMonth.split("-");
                                    const doc = await generateBulkSalaryReport({
                                        rows,
                                        month: monthNames[parseInt(m) - 1],
                                        year: y,
                                        shopSettings: shopSettings
                                    });
                                    doc.save(`Salary_Report_${selectedMonth}.pdf`);
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200"
                            >
                                <FileDown className="h-4 w-4" />
                                Export Bulk
                            </button>

                            {canCreate && (
                                <button
                                    type="button"
                                    onClick={() => openCreateModal()}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-600"
                                >
                                    <PlusCircle className="h-4 w-4" />
                                    Add salary profile
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Total gross pay"
                        value={formatCurrency(totals.gross_salary ?? 0)}
                        icon={ReceiptText}
                    />
                    <StatCard
                        label="Total net pay"
                        value={formatCurrency(totals.net_salary ?? 0)}
                        icon={WalletCards}
                    />
                    <StatCard
                        label="Overtime pay"
                        value={formatCurrency(totals.overtime_pay ?? 0)}
                        icon={Users2}
                    />
                    <StatCard
                        label="Total deductions"
                        value={formatCurrency(totals.total_deductions ?? 0)}
                        icon={CalendarDays}
                    />
                </section>

                <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="border-b border-gray-100 px-6 py-4 dark:border-slate-700">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Salary profiles
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Month: {month}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-900/50 dark:text-gray-400">
                                <tr>
                                    <th className="px-5 py-4">Employee</th>
                                    <th className="px-5 py-4">Basic Salary</th>
                                    <th className="px-5 py-4">OT (Hours / Amt)</th>
                                    <th className="px-5 py-4">Leaves (Used / Rem)</th>
                                    <th className="px-5 py-4">Leave Impact (Bonus / Ded)</th>
                                    <th className="px-5 py-4">Ledger (Allow/Ded)</th>
                                    <th className="px-5 py-4">Commission</th>
                                    <th className="px-5 py-4 text-right">Net Pay</th>
                                    <th className="px-5 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {rows.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="10"
                                            className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                                        >
                                            No employees found. Add employees first
                                            to create salary profiles.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row) => {
                                        return (
                                            <tr
                                                key={row.employee.id}
                                                className="hover:bg-gray-50/80 dark:hover:bg-slate-900/40 transition-colors"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="font-bold text-gray-900 dark:text-white leading-tight">
                                                        {row.employee.name}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                                            {row.employee.role || "Staff"}
                                                        </span>
                                                        {row.profile?.paid_at ? (
                                                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 uppercase">
                                                                <CheckCircle className="h-2.5 w-2.5" /> Paid
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 uppercase">
                                                                Pending
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                                        {formatCurrency(row.summary.basic_salary)}
                                                    </div>
                                                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                                        + {formatCurrency(row.summary.attendance_allowance_earned)} (Atten.)
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                                        {(row.summary.overtime_hours || 0).toFixed(2)} Hrs
                                                    </div>
                                                    <div className="text-[11px] font-medium text-primary-600 dark:text-primary-400">
                                                        {formatCurrency(row.summary.overtime_pay)}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                                        Used: {row.summary.leave_days || 0}
                                                    </div>
                                                    <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                                        Remaining: {row.summary.remaining_leave_count ?? 0}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="text-xs text-emerald-600 font-bold">
                                                        Bonus: +{formatCurrency(row.summary.leave_bonus ?? row.summary.leave_encashment)}
                                                    </div>
                                                    <div className="text-xs text-red-500 font-bold mt-0.5">
                                                        Deduct: -{formatCurrency(row.summary.leave_deduction)}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-emerald-600 font-medium">+{formatCurrency(row.summary.ledger_allowance)}</span>
                                                        <span className="text-xs text-red-500 font-medium">-{formatCurrency(row.summary.ledger_deduction)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                                        {formatCurrency(row.summary.commission_amount ?? row.commission_paid ?? 0)}
                                                    </div>
                                                    {(row.employee?.role === 'editor' || row.employee?.role?.toLowerCase().includes('dealer') || row.employee?.job_role?.toLowerCase().includes('dealer')) && (
                                                        <div className="text-[10px] text-amber-500 font-bold mt-0.5">
                                                            Pending: {formatCurrency(row.commission_pending)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="text-base font-black text-gray-900 dark:text-white">
                                                        {formatCurrency(row.summary.net_salary)}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        {row.profile && (
                                                            <button
                                                                onClick={() => openLedgerModal(row)}
                                                                className="p-1.5 rounded-lg border border-primary-100 text-primary-600 hover:bg-primary-500 hover:text-white transition-all dark:border-primary-900 dark:text-primary-400"
                                                                title="Ledger"
                                                            >
                                                                <ReceiptText className="h-4 w-4" />
                                                            </button>
                                                        )}

                                                        {row.profile && !row.profile.paid_at && canEdit && (
                                                            <button
                                                                onClick={() => setProfilePendingPay(row)}
                                                                className="p-1.5 rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white transition-all dark:bg-emerald-900/20 dark:border-emerald-800"
                                                                title="Pay"
                                                            >
                                                                <CheckCircle className="h-4 w-4" />
                                                            </button>
                                                        )}

                                                        {row.profile && (
                                                            <>
                                                                <button
                                                                    onClick={async () => {
                                                                        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                                                                        const [y, m] = selectedMonth.split("-");
                                                                        const commissions = (row.profile?.ledger_entries || []).filter(e => e.type === "allowance" && /commission/i.test(e.title || ""));
                                                                        const commission_total = commissions.reduce((sum, e) => sum + Number(e.amount || 0), 0);
                                                                        const other_allowances = Math.max(0, Number(row.summary.ledger_allowance || 0) - commission_total);
                                                                        const docDetails = {
                                                                            basic_salary: row.summary.basic_salary,
                                                                            attendance_allowance: row.summary.attendance_allowance_earned,
                                                                            overtime_pay: row.summary.overtime_pay,
                                                                            overtime_hours: row.summary.overtime_hours,
                                                                            leave_days: row.summary.leave_days,
                                                                            remaining_leave_count: row.summary.remaining_leave_count,
                                                                            leave_bonus: row.summary.leave_bonus,
                                                                            leave_deduction_amount: row.summary.leave_deduction,
                                                                            commission_total: commission_total,
                                                                            other_allowances: other_allowances,
                                                                            total_allowances: row.summary.ledger_allowance,
                                                                            total_deductions: row.summary.total_deductions ?? row.summary.ledger_deduction,
                                                                            net_salary: row.summary.net_salary,
                                                                            is_paid: !!row.profile.paid_at
                                                                        };
                                                                        const doc = await generateSalaryPDF({
                                                                            employee: row.employee,
                                                                            details: docDetails,
                                                                            month: monthNames[parseInt(m) - 1],
                                                                            year: y,
                                                                            shopSettings: shopSettings
                                                                        });
                                                                        doc.save(`Salary_Slip_${row.employee.name}_${selectedMonth}.pdf`);
                                                                    }}
                                                                    className="p-1.5 rounded-lg border border-gray-100 text-gray-500 hover:bg-gray-800 hover:text-white transition-all dark:border-slate-700 dark:text-gray-400"
                                                                    title="PDF"
                                                                >
                                                                    <FileDown className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                                                                        const [y, m] = selectedMonth.split("-");
                                                                        const commissions = (row.profile?.ledger_entries || []).filter(e => e.type === "allowance" && /commission/i.test(e.title || ""));
                                                                        const commission_total = commissions.reduce((sum, e) => sum + Number(e.amount || 0), 0);
                                                                        const other_allowances = Math.max(0, Number(row.summary.ledger_allowance || 0) - commission_total);
                                                                        const docDetails = {
                                                                            basic_salary: row.summary.basic_salary,
                                                                            attendance_allowance: row.summary.attendance_allowance_earned,
                                                                            overtime_pay: row.summary.overtime_pay,
                                                                            overtime_hours: row.summary.overtime_hours,
                                                                            leave_days: row.summary.leave_days,
                                                                            remaining_leave_count: row.summary.remaining_leave_count,
                                                                            leave_bonus: row.summary.leave_bonus,
                                                                            leave_deduction_amount: row.summary.leave_deduction,
                                                                            commission_total: commission_total,
                                                                            other_allowances: other_allowances,
                                                                            total_allowances: row.summary.ledger_allowance,
                                                                            total_deductions: row.summary.total_deductions ?? row.summary.ledger_deduction,
                                                                            net_salary: row.summary.net_salary,
                                                                            is_paid: !!row.profile.paid_at
                                                                        };
                                                                        const doc = await generateSalaryPDF({
                                                                            employee: row.employee,
                                                                            details: docDetails,
                                                                            month: monthNames[parseInt(m) - 1],
                                                                            year: y,
                                                                            shopSettings: shopSettings
                                                                        });
                                                                        const msg = `Hi ${row.employee.name}, here is your salary slip for ${monthNames[parseInt(m) - 1]} ${y}. Net Salary: LKR ${row.summary.net_salary.toLocaleString()}`;
                                                                        sharePDFOnWhatsApp(doc, `Salary_Slip_${row.employee.name}.pdf`, row.employee.phone || "", msg);
                                                                    }}
                                                                    className="p-1.5 rounded-lg border border-green-100 bg-green-50 text-green-700 hover:bg-green-500 hover:text-white transition-all dark:bg-green-900/20 dark:border-green-900"
                                                                    title="WhatsApp"
                                                                >
                                                                    <Share2 className="h-4 w-4" />
                                                                </button>
                                                            </>
                                                        )}

                                                        {row.profile ? (
                                                            !row.profile.paid_at && (
                                                                <>
                                                                    {canEdit && (
                                                                        <button
                                                                            onClick={() => openEditModal(row)}
                                                                            className="p-1.5 rounded-lg border border-gray-100 text-gray-500 hover:bg-gray-100 dark:border-slate-700"
                                                                            title="Edit"
                                                                        >
                                                                            <PencilLine className="h-4 w-4" />
                                                                        </button>
                                                                    )}
                                                                    {canDelete && (
                                                                        <button
                                                                            onClick={() => setProfilePendingDelete(row.profile)}
                                                                            className="p-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-500 hover:text-white transition-all dark:border-red-900/40"
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )
                                                        ) : (
                                                            canCreate && (
                                                                <button
                                                                    onClick={() => openCreateModal(row.employee)}
                                                                    className="flex items-center gap-1 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-600 transition-all"
                                                                >
                                                                    <PlusCircle className="h-3.5 w-3.5" /> Setup
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <Modal show={showFormModal} onClose={closeFormModal} maxWidth="2xl">
                <form onSubmit={submitForm} className="p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {editingProfile
                                    ? "Edit salary profile"
                                    : "Create salary profile"}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Monthly profile for transport allowances, other
                                allowances, and deductions.
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

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                                Employee *
                            </label>
                            <select
                                value={data.employee_id}
                                onChange={(e) => {
                                    const empId = e.target.value;
                                    const emp = employeeOptions.find(x => String(x.id) === String(empId));
                                    const isEmpDealer = !!(emp?.role?.toLowerCase().includes('dealer') || emp?.job_role?.toLowerCase().includes('dealer'));
                                    setData({
                                        ...data,
                                        employee_id: empId,
                                        basic_salary: isEmpDealer ? "0" : (emp?.basic_salary ?? data.basic_salary ?? ""),
                                        attendance_allowance: isEmpDealer ? "0" : (emp?.attendance_allowance ?? data.attendance_allowance ?? ""),
                                        overtime_rate: isEmpDealer ? "0" : (emp?.overtime_rate ?? data.overtime_rate ?? "150"),
                                    });
                                }}
                                className={inputCls}
                                disabled={!!editingProfile}
                            >
                                <option value="">Select employee</option>
                                {employeeOptions.map((employee) => (
                                    <option key={employee.id} value={employee.id}>
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
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                                Month *
                            </label>
                            <input
                                type="month"
                                value={data.month}
                                onChange={(e) => setData("month", e.target.value)}
                                className={inputCls}
                                disabled={!!editingProfile}
                            />
                            {errors.month && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.month}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                                Basic salary (LKR) *
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={isDealer ? "0" : data.basic_salary}
                                onChange={(e) =>
                                    setData("basic_salary", e.target.value)
                                }
                                className={inputCls}
                                disabled={isDealer}
                            />
                            {errors.basic_salary && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.basic_salary}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                                Attendance allowance (LKR) *
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={isDealer ? "0" : data.attendance_allowance}
                                onChange={(e) =>
                                    setData(
                                        "attendance_allowance",
                                        e.target.value,
                                    )
                                }
                                className={inputCls}
                                disabled={isDealer}
                            />
                            {errors.attendance_allowance && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.attendance_allowance}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                                OT rate per hour (LKR) *
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={isDealer ? "0" : data.overtime_rate}
                                onChange={(e) =>
                                    setData("overtime_rate", e.target.value)
                                }
                                className={inputCls}
                                disabled={isDealer}
                            />
                            {errors.overtime_rate && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.overtime_rate}
                                </p>
                            )}
                        </div>
                        {isDealer && (
                            <div className="md:col-span-2 p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                                <strong>Note:</strong> This employee is a Dealer. Basic salary, attendance allowance, and overtime rate are disabled and set to 0. Dealers are compensated via commissions only.
                            </div>
                        )}
                    </div>

                    <div className="mt-4">
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                            Notes
                        </label>
                        <textarea
                            rows="3"
                            value={data.notes}
                            onChange={(e) => setData("notes", e.target.value)}
                            className={`${inputCls} min-h-28`}
                            placeholder="Optional payroll notes for this month"
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
                                : editingProfile
                                    ? "Update profile"
                                    : "Create profile"}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal show={!!ledgerProfileId} onClose={closeLedgerModal} maxWidth="6xl">
                <div className="max-h-[88vh] overflow-y-auto p-6 space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Ledger — {ledgerEmployeeRow?.employee?.name ?? "Employee"}
                                </h3>
                                {activeLedgerProfile?.paid_at && (
                                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                        Paid
                                    </span>
                                )}
                            </div>

                            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Month
                                </p>
                                <select
                                    value={activeLedgerProfile?.id ?? ""}
                                    onChange={(e) => {
                                        const nextId = e.target.value;
                                        const nextProfile = ledgerMonthOptions.find(
                                            (profile) =>
                                                String(profile.id) === String(nextId),
                                        );
                                        const nextMonth = nextProfile?.month
                                            ? String(nextProfile.month).slice(0, 7)
                                            : selectedMonth;

                                        setLedgerProfileId(nextId);
                                        setLedgerEditingEntry(null);
                                        resetLedger();
                                        setLedgerData({
                                            ...blankLedgerForm,
                                            entry_date: todayDate,
                                        });
                                        clearLedgerErrors();
                                    }}
                                    className={`${inputCls} !py-2 sm:max-w-[220px]`}
                                >
                                    {ledgerMonthOptions.map((profile) => (
                                        <option
                                            key={profile.id}
                                            value={profile.id}
                                        >
                                            {String(profile.month).slice(0, 7)}
                                            {profile.paid_at ? " — paid" : ""}
                                        </option>
                                    ))}
                                </select>
                                {!showAttendanceForActiveLedgerMonth && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Attendance summary is shown only for the currently selected payroll month.
                                    </p>
                                )}
                            </div>

                            {ledgerLocked && (
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                    This month is paid, so the ledger is read-only.
                                </p>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={closeLedgerModal}
                            className="rounded-xl px-3 py-2 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-slate-700"
                        >
                            Close
                        </button>
                    </div>

                    {showAttendanceForActiveLedgerMonth && ledgerEmployeeRow && (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-gray-200">
                            <div className="grid gap-3 md:grid-cols-4">
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        Worked hours
                                    </div>
                                    <div className="mt-1 font-semibold">
                                        {formatDurationMinutes(
                                            ledgerEmployeeRow.summary.worked_minutes ??
                                            Math.round(
                                                Number(
                                                    ledgerEmployeeRow.summary
                                                        .worked_hours ?? 0,
                                                ) * 60,
                                            ),
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        OT hours / pay
                                    </div>
                                    <div className="mt-1 font-semibold">
                                        {formatDurationMinutes(
                                            ledgerEmployeeRow.summary.overtime_minutes ??
                                            Math.round(
                                                Number(
                                                    ledgerEmployeeRow.summary
                                                        .overtime_hours ?? 0,
                                                ) * 60,
                                            ),
                                        )}{" "}
                                        · {formatCurrency(ledgerEmployeeRow.summary.overtime_pay)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        Attendance allowance
                                    </div>
                                    <div className="mt-1 font-semibold">
                                        {formatCurrency(ledgerEmployeeRow.summary.attendance_allowance_earned)}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Base {formatCurrency(ledgerEmployeeRow.summary.attendance_allowance_base)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        Leave impact
                                    </div>
                                    <div className="mt-1 font-semibold">
                                        -{formatCurrency(ledgerEmployeeRow.summary.leave_deduction)} / +{formatCurrency(ledgerEmployeeRow.summary.leave_encashment)}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Leaves {ledgerEmployeeRow.summary.leave_days}
                                    </div>
                                </div>
                            </div>

                            {ledgerAttendance.length > 0 && (
                                <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                                    <div className="border-b border-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-slate-700 dark:text-gray-400">
                                        Attendance (this month)
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-50 text-[11px] uppercase text-gray-500 dark:bg-slate-900/50 dark:text-gray-400">
                                                <tr>
                                                    <th className="px-3 py-2">Date</th>
                                                    <th className="px-3 py-2">Status</th>
                                                    <th className="px-3 py-2">In</th>
                                                    <th className="px-3 py-2">Out</th>
                                                    <th className="px-3 py-2">Hours</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                                {ledgerAttendance
                                                    .slice()
                                                    .sort((a, b) =>
                                                        String(a.work_date).localeCompare(
                                                            String(b.work_date),
                                                        ),
                                                    )
                                                    .map((att) => (
                                                        <tr key={att.id}>
                                                            <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                                                                {toDateInput(att.work_date)}
                                                            </td>
                                                            <td className="px-3 py-2">
                                                                <span
                                                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${att.status === "present"
                                                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                                                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                                                        }`}
                                                                >
                                                                    {att.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                                                                {att.check_in_time ?? "—"}
                                                            </td>
                                                            <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                                                                {att.check_out_time ?? "—"}
                                                            </td>
                                                            <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                                                                {formatDurationMinutes(
                                                                    att.worked_minutes ??
                                                                    Math.round(
                                                                        Number(
                                                                            att.worked_hours ??
                                                                            0,
                                                                        ) * 60,
                                                                    ),
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Commission & Ledger Breakdown
                        </div>
                        <div className="grid gap-3 md:grid-cols-4">
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Commission entries</div>
                                <div className="mt-1 text-sm font-semibold text-violet-600 dark:text-violet-400">
                                    {commissionLedgerEntries.length} entries
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatCurrency(commissionTotal)}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Other allowances</div>
                                <div className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                    {manualAllowanceEntries.length} entries
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatCurrency(manualAllowanceTotal)}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Deductions</div>
                                <div className="mt-1 text-sm font-semibold text-red-600 dark:text-red-400">
                                    {deductionEntries.length} entries
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatCurrency(deductionTotal)}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Net ledger impact</div>
                                <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                                    {formatCurrency(netLedgerImpact)}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Commission + allowances - deductions
                                </div>
                            </div>
                        </div>
                    </div>

                    {renderLedgerSection('commission', 'Commissions', commissionLedgerEntries, 'bg-violet-500', commissionTotal, 'No commission entries.', 'Commission - ')}
                    {renderLedgerSection('allowance', 'Other Allowances', manualAllowanceEntries, 'bg-green-500', manualAllowanceTotal, 'No other allowance entries.')}
                    {renderLedgerSection('deduction', 'Deductions', deductionEntries, 'bg-red-500', deductionTotal, 'No deduction entries.')}
                    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700">
                        <div className="max-h-80 overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-900/50 dark:text-gray-400">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Title</th>
                                        <th className="px-4 py-3">Amount</th>
                                        <th className="px-4 py-3">Notes</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {ledgerEntries.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan="6"
                                                className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                                            >
                                                No ledger entries yet. Add allowances or
                                                deductions for this month.
                                            </td>
                                        </tr>
                                    ) : (
                                        ledgerEntries.map((entry) => (
                                            (() => {
                                                const isCommissionEntry =
                                                    entry.type === "allowance" &&
                                                    /commission/i.test(entry.title ?? "");
                                                const typeBadgeClass = isCommissionEntry
                                                    ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                                                    : entry.type === "allowance"
                                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                                        : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300";
                                                const typeLabel = isCommissionEntry
                                                    ? "Commission"
                                                    : entry.type === "allowance"
                                                        ? "Allowance"
                                                        : "Deduction";

                                                return (
                                                    <tr
                                                        key={entry.id}
                                                        className="hover:bg-gray-50/80 dark:hover:bg-slate-900/40"
                                                    >
                                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                            {toDateInput(entry.entry_date)}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span
                                                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${typeBadgeClass}`}
                                                            >
                                                                {typeLabel}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                                                            {entry.title}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                            {formatCurrency(entry.amount)}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                                            {entry.notes || "—"}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            {ledgerLocked ? (
                                                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                                                    Locked
                                                                </span>
                                                            ) : (
                                                                <div className="flex justify-end gap-2">
                                                                    <button
                                                                        onClick={() =>
                                                                            openLedgerEdit(entry)
                                                                        }
                                                                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                                                                    >
                                                                        <PencilLine className="h-3.5 w-3.5" />
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            setLedgerPendingDelete(
                                                                                entry,
                                                                            )
                                                                        }
                                                                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-900/20"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })()
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {ledgerLocked ? (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-gray-200">
                            This month is marked as paid, so you can’t add/edit ledger items. Create the next month’s salary profile to continue.
                        </div>
                    ) : (
                        <form onSubmit={submitLedgerForm} className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    {ledgerEditingEntry ? "Edit entry" : "Add ledger entry"}
                                </h4>
                                {ledgerEditingEntry && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLedgerEditingEntry(null);
                                            setLedgerData({
                                                ...blankLedgerForm,
                                                entry_date: todayDate,
                                            });
                                            clearLedgerErrors();
                                        }}
                                        className="text-xs font-semibold text-gray-500 transition hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                                    >
                                        Cancel edit
                                    </button>
                                )}
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                                        Entry date *
                                    </label>
                                    <input
                                        type="date"
                                        value={ledgerData.entry_date}
                                        onChange={(e) =>
                                            setLedgerData("entry_date", e.target.value)
                                        }
                                        className={inputCls}
                                    />
                                    {ledgerErrors.entry_date && (
                                        <p className="mt-1 text-xs text-red-500">
                                            {ledgerErrors.entry_date}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                                        Type *
                                    </label>
                                    <select
                                        value={ledgerData.type}
                                        onChange={(e) =>
                                            setLedgerData("type", e.target.value)
                                        }
                                        className={inputCls}
                                    >
                                        <option value="allowance">Allowance</option>
                                        <option value="deduction">Deduction</option>
                                    </select>
                                    {ledgerErrors.type && (
                                        <p className="mt-1 text-xs text-red-500">
                                            {ledgerErrors.type}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={ledgerData.title}
                                        onChange={(e) =>
                                            setLedgerData("title", e.target.value)
                                        }
                                        className={inputCls}
                                        placeholder="Transport allowance, late deduction"
                                    />
                                    {ledgerErrors.title && (
                                        <p className="mt-1 text-xs text-red-500">
                                            {ledgerErrors.title}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                                        Amount (LKR) *
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={ledgerData.amount}
                                        onChange={(e) =>
                                            setLedgerData("amount", e.target.value)
                                        }
                                        className={inputCls}
                                    />
                                    {ledgerErrors.amount && (
                                        <p className="mt-1 text-xs text-red-500">
                                            {ledgerErrors.amount}
                                        </p>
                                    )}
                                </div>
                                <div className="md:col-span-2">
                                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                                        Notes
                                    </label>
                                    <textarea
                                        rows="2"
                                        value={ledgerData.notes}
                                        onChange={(e) =>
                                            setLedgerData("notes", e.target.value)
                                        }
                                        className={`${inputCls} min-h-24`}
                                        placeholder="Optional notes"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={closeLedgerModal}
                                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700"
                                >
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    disabled={ledgerProcessing}
                                    className="rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {ledgerProcessing
                                        ? "Saving..."
                                        : ledgerEditingEntry
                                            ? "Update entry"
                                            : "Add entry"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </Modal>

            <ConfirmModal
                isOpen={!!profilePendingDelete}
                onClose={() => setProfilePendingDelete(null)}
                onConfirm={confirmDelete}
                title="Delete salary profile?"
                message="This profile will be removed for the selected month. Payroll totals will update immediately."
            />

            <Modal show={!!profilePendingPay} onClose={() => setProfilePendingPay(null)} maxWidth="sm">
                <div className="p-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Mark salary as paid?</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        This will lock the ledger for this month (no more edits). You can still view it anytime in history.
                    </p>

                    {profilePendingPay?.employee?.role === 'editor' && (
                        <div className="mb-5 p-4 rounded-xl bg-violet-50 border border-violet-100 dark:bg-violet-900/10 dark:border-violet-900/30">
                            <h4 className="font-semibold text-violet-800 dark:text-violet-300 flex items-center gap-2 mb-1">
                                <AlertCircle className="w-4 h-4" />
                                Editor Commissions Check
                            </h4>
                            <p className="text-xs text-violet-600 dark:text-violet-400 mb-3">
                                Have you verified all commissions for this editor? Once paid, you cannot add any more commissions to this month's salary.
                            </p>
                            <a
                                href={route("payroll.editor-commissions.index")}
                                target="_blank"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-700 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-300 transition-colors"
                            >
                                Review Commissions <ArrowRight className="w-3 h-3" />
                            </a>
                        </div>
                    )}

                    <div className="flex gap-3 justify-end mt-6">
                        <button
                            type="button"
                            onClick={() => setProfilePendingPay(null)}
                            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={confirmPay}
                            className="px-4 py-2.5 rounded-xl bg-primary-600 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition-all dark:bg-primary-500 dark:hover:bg-primary-600"
                        >
                            Yes, Mark as Paid
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={!!ledgerPendingDelete}
                onClose={() => setLedgerPendingDelete(null)}
                onConfirm={confirmLedgerDelete}
                title="Delete ledger entry?"
                message="This allowance or deduction will be removed from the payroll ledger."
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
