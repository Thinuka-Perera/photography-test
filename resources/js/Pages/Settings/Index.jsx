import MainLayout from "@/Layouts/MainLayout";
import ConfirmModal from "@/Components/ConfirmModal";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import {
    AlertCircle, Bell, CheckCircle, Clock, Database, DollarSign, FolderTree, Layers,
    MessageCircle, Package, PencilLine, Plus, Printer, Receipt,
    Settings, Shield, Sparkles, Store, Trash2, Users2, X,
} from "lucide-react";
import { useEffect, useState } from "react";

const MAX_LOGO_BYTES = 8 * 1024 * 1024;

function formatSettingsErrors(errors) {
    if (!errors || typeof errors !== "object") {
        return "Unable to save settings. Please try again.";
    }

    const values = Object.values(errors).flat();

    return values[0] ?? "Unable to save settings. Please try again.";
}

function handleLogoFileSelect(file, setData, setToast, inputEl) {
    if (!file) {
        setData("shop_logo", null);

        return;
    }

    const allowed = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
    ];

    if (!allowed.includes(file.type) && !file.name.toLowerCase().endsWith(".svg")) {
        if (inputEl) {
            inputEl.value = "";
        }
        setData("shop_logo", null);
        setToast({
            msg: "Invalid format. Use JPEG, PNG, GIF, WebP, or SVG.",
            type: "error",
        });

        return;
    }

    if (file.size > MAX_LOGO_BYTES) {
        if (inputEl) {
            inputEl.value = "";
        }
        setData("shop_logo", null);
        setToast({
            msg: "File size exceeds the 8MB limit.",
            type: "error",
        });

        return;
    }

    setData("shop_logo", file);
}

function Toast({ message, type = "success", onClose }) {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, []);
    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold text-white"
            style={{ background: type === "success" ? "#10b981" : "#ef4444" }}>
            {type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message}</span>
            <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
    );
}

/** SQLite / legacy rows may return 0/1; treat only true/1 as enabled. */
function isCommissionExcluded(value) {
    return value === true || value === 1;
}

function Toggle({ checked, onChange }) {
    return (
        <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-500" />
        </label>
    );
}

function SectionCard({ icon: Icon, iconCls, title, description, active, onClick }) {
    return (
        <button type="button" onClick={onClick}
            className={`bg-white dark:bg-slate-800 rounded-2xl p-6 border transition-all text-left group ${active ? "border-primary-400 shadow-lg shadow-primary-500/10 dark:border-primary-600" : "border-gray-100 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-lg"}`}>
            <div className={`w-12 h-12 rounded-xl ${iconCls} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </button>
    );
}

function BillCategoryForm({ editingCategory, onSaved, onCancel }) {
    const isEdit = !!editingCategory;
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: editingCategory?.name ?? "",
        default_description: editingCategory?.default_description ?? "",
        no_commission: isCommissionExcluded(editingCategory?.no_commission),
        is_active: editingCategory?.is_active ?? true,
    });

    const handleSubmit = () => {
        if (processing) {
            return;
        }

        if (isEdit) {
            put(route("settings.bill-categories.update", editingCategory.id), {
                preserveScroll: true,
                onSuccess: onSaved,
            });
            return;
        }

        post(route("settings.bill-categories.store"), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onSaved?.();
            },
        });
    };

    const handleKeyDown = (e) => {
        if (e.key !== "Enter") {
            return;
        }

        e.preventDefault();
        handleSubmit();
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{isEdit ? "Edit POS Item Type" : "New POS Item Type"}</h3>
                    <p className="text-xs text-gray-400 mt-1">Define the item type name and default description used in Studio POS.</p>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isEdit ? "bg-amber-100 dark:bg-amber-900/20" : "bg-primary-100 dark:bg-primary-900/20"}`}>
                    <FolderTree className={`w-5 h-5 ${isEdit ? "text-amber-500" : "text-primary-500"}`} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Item Type Name</label>
                    <input
                        type="text"
                        value={data.name}
                        onChange={(e) => setData("name", e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-300"
                        placeholder="Passport Photos"
                    />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Default Description</label>
                    <input
                        type="text"
                        value={data.default_description}
                        onChange={(e) => setData("default_description", e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-300"
                        placeholder="Passport photo set"
                    />
                    {errors.default_description && <p className="text-xs text-red-500 mt-1">{errors.default_description}</p>}
                </div>

                <div className="md:col-span-2 space-y-3">
                    <div className="rounded-xl border border-gray-200 dark:border-slate-600 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">No Commission</p>
                                <p className="text-xs text-gray-400">Exclude from editor commissions</p>
                            </div>
                            <Toggle checked={data.no_commission} onChange={(value) => setData("no_commission", value)} />
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 dark:border-slate-600 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Active</p>
                                <p className="text-xs text-gray-400">Show this category in pickers</p>
                            </div>
                            <Toggle checked={data.is_active} onChange={(value) => setData("is_active", value)} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-3">
                {isEdit && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={processing}
                    className="px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    {processing ? "Saving…" : isEdit ? "Update Item Type" : "Create Item Type"}
                </button>
            </div>
        </div>
    );
}

function BillCategoryManager({ billCategories = [] }) {
    const [editingCategory, setEditingCategory] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, category: null });
    const [deleteError, setDeleteError] = useState(null);
    const { delete: destroy, processing: deleting } = useForm();

    const activeCount = billCategories.filter((category) => category.is_active).length;
    const commissionFreeCount = billCategories.filter((category) => isCommissionExcluded(category.no_commission)).length;

    const openDeleteModal = (category) => {
        setDeleteError(null);
        setDeleteModal({ isOpen: true, category });
    };

    const confirmDelete = () => {
        if (!deleteModal.category) return;

        destroy(route("settings.bill-categories.destroy", deleteModal.category.id), {
            preserveScroll: true,
            onSuccess: () => setDeleteModal({ isOpen: false, category: null }),
            onError: (errs) => {
                setDeleteError(errs.delete ?? "Delete failed.");
                setDeleteModal({ isOpen: false, category: null });
            },
        });
    };

    // Reload page after save to fetch updated list
    const handleSaved = () => {
        setEditingCategory(null);
        router.reload({
            only: ["itemTypes", "flash"],
            preserveScroll: true,
            preserveState: true,
        });
    };

    return (
        <div className="space-y-6">
            <BillCategoryForm
                key={editingCategory?.id ?? "bill-category-create"}
                editingCategory={editingCategory}
                onCancel={() => setEditingCategory(null)}
                onSaved={handleSaved}
            />

            {deleteError && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {deleteError}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Total Item Types</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{billCategories.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Active</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{activeCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Commission-Free</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{commissionFreeCount}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                {billCategories.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <FolderTree className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                        <p>No POS item types yet. Create your first one above.</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-slate-700/40">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Commission</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {billCategories.map((category) => (
                                <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-gray-900 dark:text-white">{category.name}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${isCommissionExcluded(category.no_commission) ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300"}`}>
                                            {isCommissionExcluded(category.no_commission) ? "Excluded from commission" : "Counts toward commission"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${category.is_active ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400" : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300"}`}>
                                            {category.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button type="button" onClick={() => setEditingCategory(category)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 transition-colors inline-flex items-center gap-1.5">
                                                <PencilLine className="w-3.5 h-3.5" />
                                                Edit
                                            </button>
                                            <button type="button" onClick={() => openDeleteModal(category)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 transition-colors inline-flex items-center gap-1.5">
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, category: null })}
                onConfirm={confirmDelete}
                title="Delete bill category?"
                message={deleteModal.category ? `Delete \"${deleteModal.category.name}\" from bill categories?` : "Delete this bill category?"}
                confirmText={deleting ? "Deleting…" : "Delete"}
                processing={deleting}
            />
        </div>
    );
}

function RoleShiftSettingsManager({ roleShiftSettings = [], canManage = false }) {
    const { data, setData, post, processing, errors } = useForm({
        shifts: roleShiftSettings.map((row) => ({
            role: row.role,
            start_time: row.start_time?.slice?.(0, 5) ?? row.start_time ?? "09:00",
            end_time: row.end_time?.slice?.(0, 5) ?? row.end_time ?? "17:00",
        })),
    });

    useEffect(() => {
        setData(
            "shifts",
            roleShiftSettings.map((row) => ({
                role: row.role,
                start_time: row.start_time?.slice?.(0, 5) ?? row.start_time ?? "09:00",
                end_time: row.end_time?.slice?.(0, 5) ?? row.end_time ?? "17:00",
            })),
        );
    }, [roleShiftSettings]);

    const handleSave = () => {
        post(route("settings.role-shifts.update"), {
            preserveScroll: true,
        });
    };

    const updateShiftTime = (index, field, value) => {
        const next = [...data.shifts];
        next[index] = { ...next[index], [field]: value };
        setData("shifts", next);
    };

    if (!canManage) {
        return (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                Shift & role settings are only available to Admin and Super Admin users.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
                    <Clock className="h-5 w-5 text-red-600 dark:text-red-300" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                        Shift & Role Settings
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Configure shift start times per employee role. Attendance lateness is calculated from these times.
                    </p>
                </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Shift Start Times by Employee Role
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    View and update the expected start time for each employee role.
                </p>

                <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-slate-700">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-900/50 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Start Time</th>
                                <th className="px-6 py-4">End Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {data.shifts.map((shift, index) => {
                                const label =
                                    roleShiftSettings.find((r) => r.role === shift.role)
                                        ?.label ?? shift.role;

                                return (
                                    <tr
                                        key={shift.role}
                                        className="bg-white dark:bg-slate-800"
                                    >
                                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                                            {label}
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="time"
                                                value={shift.start_time}
                                                onChange={(e) =>
                                                    updateShiftTime(index, 'start_time', e.target.value)
                                                }
                                                className="w-full max-w-[10rem] rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                                            />
                                            {errors[`shifts.${index}.start_time`] && (
                                                <p className="mt-1 text-xs text-red-500">
                                                    {errors[`shifts.${index}.start_time`]}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                type="time"
                                                value={shift.end_time}
                                                onChange={(e) =>
                                                    updateShiftTime(index, 'end_time', e.target.value)
                                                }
                                                className="w-full max-w-[10rem] rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                                            />
                                            {errors[`shifts.${index}.end_time`] && (
                                                <p className="mt-1 text-xs text-red-500">
                                                    {errors[`shifts.${index}.end_time`]}
                                                </p>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {errors.shifts && (
                <p className="text-xs text-red-500">{errors.shifts}</p>
            )}

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={processing}
                    className="rounded-xl bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 disabled:opacity-50"
                >
                    {processing ? "Saving…" : "Save Settings"}
                </button>
            </div>
        </div>
    );
}

export default function Index({ settings = {}, itemTypes = [], roleShiftSettings = [] }) {
    const { flash, shopSettings, auth } = usePage().props;
    const canManageRoleShifts =
        Boolean(auth?.access?.is_admin || auth?.access?.is_super_admin);
    const [toast, setToast] = useState(null);
    const [activeSection, setActive] = useState("shop");

    useEffect(() => {
        if (flash?.message) setToast({ msg: flash.message, type: "success" });
        if (flash?.success) setToast({ msg: flash.success, type: "success" });
        if (flash?.error) setToast({ msg: flash.error, type: "error" });
    }, [flash]);

    const { data, setData, post, processing, errors } = useForm({
        shop_name: settings.shop_name ?? "Photography Shop",
        bill_prefix: settings.bill_prefix ?? "BILL",
        bill_next_number: settings.bill_next_number ?? 1,
        shop_address: settings.shop_address ?? "",
        shop_phone: settings.shop_phone ?? "",
        shop_email: settings.shop_email ?? "",
        shop_logo: null,   // ✅ ADD THIS
        tax_rate: settings.tax_rate ?? "0",
        currency: settings.currency ?? "LKR",
        invoice_prefix: settings.invoice_prefix ?? "INV",
        invoice_paper_size: settings.invoice_paper_size ?? "A4",
        invoice_template: settings.invoice_template ?? "default",
        invoice_note: settings.invoice_note ?? "Thank you for your business!",
        invoice_terms: settings.invoice_terms ?? "",
        invoice_payment_info: settings.invoice_payment_info ?? "",
        auto_send_pdf: settings.auto_send_pdf === "1" || settings.auto_send_pdf === true,
        low_stock_alert: settings.low_stock_alert === "1" || settings.low_stock_alert === true,
        invoice_approval: settings.invoice_approval === "1" || settings.invoice_approval === true,

        // Branding
        shop_tagline: settings.shop_tagline ?? "",
        shop_website: settings.shop_website ?? "",
        shop_facebook: settings.shop_facebook ?? "",
        shop_instagram: settings.shop_instagram ?? "",
        shop_whatsapp: settings.shop_whatsapp ?? "",
        shop_hotline: settings.shop_hotline ?? "",
        shop_footer_text: settings.shop_footer_text ?? "Professional Photography & Cinematography Services",
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        post(route("settings.update"), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setData("shop_logo", null);
            },
            onError: (pageErrors) => {
                setToast({
                    msg: formatSettingsErrors(pageErrors),
                    type: "error",
                });
            },
        });
    };

    const sections = [
        { id: "shop", title: "Shop Details", description: "Name, address, contact info", icon: Store, iconCls: "bg-blue-100 dark:bg-blue-900/30 text-blue-500" },
        { id: "invoice", title: "Invoice Templates", description: "Prefix, paper size, formats", icon: Receipt, iconCls: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500" },
        { id: "branding", title: "Branding & Package", description: "Logo, tagline, social links", icon: Sparkles, iconCls: "bg-purple-100 dark:bg-purple-900/30 text-purple-500" },
        { id: "tax", title: "Tax Configuration", description: "Set tax rate and currency", icon: DollarSign, iconCls: "bg-amber-100 dark:bg-amber-900/30 text-amber-500" },
        { id: "bill-categories", title: "POS Item Types", description: "Item defaults for Studio POS", icon: FolderTree, iconCls: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500" },
        ...(canManageRoleShifts
            ? [
                {
                    id: "role-shifts",
                    title: "Shift & Role Settings",
                    description: "Shift schedules by employee role",
                    icon: Clock,
                    iconCls: "bg-red-100 dark:bg-red-900/30 text-red-500",
                },
            ]
            : []),
        { id: "whatsapp", title: "WhatsApp", description: "Auto-send PDFs on delivery", icon: MessageCircle, iconCls: "bg-green-100 dark:bg-green-900/30 text-green-500" },
        { id: "inventory", title: "Inventory Alerts", description: "Low stock notification thresholds", icon: Package, iconCls: "bg-orange-100 dark:bg-orange-900/30 text-orange-500" },
        // { id: "team",      title: "Team Access",       description: "Roles and permissions",              icon: Users2,        iconCls: "bg-violet-100 dark:bg-violet-900/30 text-violet-500" },
        // { id: "security",  title: "Security",          description: "Password and security settings",     icon: Shield,        iconCls: "bg-red-100 dark:bg-red-900/30 text-red-500" },
        // { id: "database",  title: "Database",          description: "Backup and restore data",            icon: Database,      iconCls: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500" },
    ];

    const inputCls = "w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-300";
    const labelCls = "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide";

    return (
        <MainLayout pageTitle="Settings">
            <Head title="Settings" />
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Configure the photography shop workflow and integrations</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {sections.map((s) => (
                    <SectionCard key={s.id} {...s} active={activeSection === s.id} onClick={() => setActive(s.id)} />
                ))}
            </div>

            <form onSubmit={handleSubmit}>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 mb-6">

                    {/* ── Shop Details ── */}
                    {activeSection === "shop" && (
                        <div className="space-y-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30"><Store className="w-5 h-5 text-blue-500" /></div>
                                <div><h3 className="font-bold text-gray-900 dark:text-white">Shop Details</h3><p className="text-xs text-gray-400">Basic information about your photography shop</p></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Shop Name</label>
                                    <input type="text" value={data.shop_name} onChange={(e) => setData("shop_name", e.target.value)} className={inputCls} placeholder="Photography Shop" />
                                    {errors.shop_name && <p className="text-xs text-red-500 mt-1">{errors.shop_name}</p>}
                                </div>
                                <div>
                                    <label className={labelCls}>Bill ID Prefix</label>
                                    <input
                                        type="text"
                                        value={data.bill_prefix}
                                        onChange={(e) => setData("bill_prefix", e.target.value.toUpperCase().replace(/[^A-Z0-9-_]/g, ""))}
                                        className={inputCls}
                                        placeholder="BILL"
                                    />
                                    {errors.bill_prefix && <p className="text-xs text-red-500 mt-1">{errors.bill_prefix}</p>}
                                    <p className="text-xs text-gray-400 mt-1">Used for POS invoices and bills (e.g. <code>{data.bill_prefix ? data.bill_prefix + "-0087" : "0087"}</code>). Leave blank to use only sequential numbers.</p>
                                </div>
                                <div>
                                    <label className={labelCls}>Next Bill Serial Number</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={data.bill_next_number}
                                        onChange={(e) => setData("bill_next_number", parseInt(e.target.value) || 1)}
                                        className={inputCls}
                                        placeholder="1"
                                    />
                                    {errors.bill_next_number && <p className="text-xs text-red-500 mt-1">{errors.bill_next_number}</p>}
                                    <p className="text-xs text-gray-400 mt-1">The next sequential number to assign (e.g. set to 87 to generate 0087 next).</p>
                                </div>
                                <div>
                                    <label className={labelCls}>Shop Logo</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                            handleLogoFileSelect(
                                                e.target.files?.[0],
                                                setData,
                                                setToast,
                                                e.target,
                                            )
                                        }
                                        className={inputCls}
                                    />
                                    {errors.shop_logo && <p className="text-xs text-red-500 mt-1">{errors.shop_logo}</p>}
                                    {shopSettings?.shop_logo_url && (
                                        <div className="mt-2 flex items-center gap-3">
                                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-white aspect-square dark:border-slate-600">
                                                <img
                                                    src={shopSettings.shop_logo_url}
                                                    alt="Shop Logo"
                                                    className="block h-full w-full object-cover"
                                                />
                                            </div>
                                            <p className="text-xs text-green-600 dark:text-green-400">Logo saved — upload new to replace</p>
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, max 8MB. Used on invoices and sidebar.</p>
                                </div>
                                <div>
                                    <label className={labelCls}>Phone</label>
                                    <input type="text" value={data.shop_phone} onChange={(e) => setData("shop_phone", e.target.value)} className={inputCls} placeholder="+94 77 123 4567" />
                                </div>
                                <div>
                                    <label className={labelCls}>Email</label>
                                    <input type="email" value={data.shop_email} onChange={(e) => setData("shop_email", e.target.value)} className={inputCls} placeholder="info@photoshop.lk" />
                                    {errors.shop_email && <p className="text-xs text-red-500 mt-1">{errors.shop_email}</p>}
                                </div>
                                <div>
                                    <label className={labelCls}>Hotline Number (Thermal Receipt)</label>
                                    <input type="text" value={data.shop_hotline} onChange={(e) => setData("shop_hotline", e.target.value)} className={inputCls} placeholder="+94 11 234 5678" />
                                    {errors.shop_hotline && <p className="text-xs text-red-500 mt-1">{errors.shop_hotline}</p>}
                                </div>
                                <div>
                                    <label className={labelCls}>WhatsApp Number (Thermal Receipt)</label>
                                    <input type="text" value={data.shop_whatsapp} onChange={(e) => setData("shop_whatsapp", e.target.value)} className={inputCls} placeholder="+94 77 123 4567" />
                                    {errors.shop_whatsapp && <p className="text-xs text-red-500 mt-1">{errors.shop_whatsapp}</p>}
                                </div>
                                <div className="md:col-span-2">
                                    <label className={labelCls}>Shop Address</label>
                                    <textarea
                                        value={data.shop_address}
                                        onChange={(e) => setData("shop_address", e.target.value)}
                                        rows={2}
                                        className={`${inputCls} resize-none`}
                                        placeholder="289/7B Sepalika Uyana, Waterala, Padukka"
                                    />
                                    {errors.shop_address && <p className="text-xs text-red-500 mt-1">{errors.shop_address}</p>}
                                    <p className="text-xs text-gray-400 mt-1">Used on invoices, receipts, and package proposals.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Branding & Templates ── */}
                    {activeSection === "branding" && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30"><Sparkles className="w-5 h-5 text-purple-500" /></div>
                                <div><h3 className="font-bold text-gray-900 dark:text-white">Branding & Package Settings</h3><p className="text-xs text-gray-400">Manage your business identity across all documents</p></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelCls}>Company Logo</label>
                                        <div className="mt-1 flex items-center gap-4">
                                            {shopSettings?.shop_logo_url ? (
                                                <div className="relative group">
                                                    <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-gray-100 bg-white aspect-square dark:border-slate-700">
                                                        <img
                                                            src={shopSettings.shop_logo_url}
                                                            alt="Logo"
                                                            className="block h-full w-full object-cover"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            router.delete(
                                                                route(
                                                                    "settings.logo.delete",
                                                                ),
                                                                {
                                                                    preserveScroll: true,
                                                                    onError: (
                                                                        pageErrors,
                                                                    ) => {
                                                                        setToast(
                                                                            {
                                                                                msg: formatSettingsErrors(
                                                                                    pageErrors,
                                                                                ),
                                                                                type: "error",
                                                                            },
                                                                        );
                                                                    },
                                                                },
                                                            )
                                                        }
                                                        className="absolute -top-2 -right-2 p-1.5 rounded-full bg-red-500 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-gray-200 bg-gray-50 aspect-square dark:border-slate-700 dark:bg-slate-900/50 text-gray-400"><Store className="w-6 h-6" /></div>
                                            )}
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,.svg"
                                                    onChange={(e) =>
                                                        handleLogoFileSelect(
                                                            e.target.files?.[0],
                                                            setData,
                                                            setToast,
                                                            e.target,
                                                        )
                                                    }
                                                    className={inputCls}
                                                />
                                                {errors.shop_logo && (
                                                    <p className="mt-1 text-xs text-red-500">
                                                        {errors.shop_logo}
                                                    </p>
                                                )}
                                                <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tight">
                                                    Best: Square PNG, Transparent (200x200px) · Max 8MB
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Business Tagline</label>
                                        <input type="text" value={data.shop_tagline} onChange={(e) => setData("shop_tagline", e.target.value)} className={inputCls} placeholder="e.g. Moments in Time..." />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Website URL</label>
                                        <input type="text" value={data.shop_website} onChange={(e) => setData("shop_website", e.target.value)} className={inputCls} placeholder="www.yourstudio.lk" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className={labelCls}>Facebook Handle</label>
                                        <input type="text" value={data.shop_facebook} onChange={(e) => setData("shop_facebook", e.target.value)} className={inputCls} placeholder="facebook.com/yourpage" />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Instagram Handle</label>
                                        <input type="text" value={data.shop_instagram} onChange={(e) => setData("shop_instagram", e.target.value)} className={inputCls} placeholder="@your.studio" />
                                    </div>
                                    <div>
                                        <label className={labelCls}>WhatsApp Business Number</label>
                                        <input type="text" value={data.shop_whatsapp} onChange={(e) => setData("shop_whatsapp", e.target.value)} className={inputCls} placeholder="+94 77 123 4567" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
                                <label className={labelCls}>Global Footer Message (Package Template)</label>
                                <textarea
                                    value={data.shop_footer_text}
                                    onChange={(e) => setData("shop_footer_text", e.target.value)}
                                    rows={3}
                                    className={`${inputCls} resize-none`}
                                    placeholder="Thank you for your interest! We look forward to capturing your special moments."
                                />
                                <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tight">Appears at the bottom of all package proposals</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 flex items-start gap-3">
                                <Sparkles className="w-4 h-4 text-purple-500 mt-0.5" />
                                <div className="text-xs text-purple-700 dark:text-purple-300">
                                    <strong>Package Layout Updated:</strong> We've implemented the modern, client-focused package template. Change your logo or social links here to update them instantly across all proposals.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Invoice Templates ── */}
                    {activeSection === "invoice" && (
                        <div className="space-y-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30"><Receipt className="w-5 h-5 text-indigo-500" /></div>
                                <div><h3 className="font-bold text-gray-900 dark:text-white">Invoice Templates</h3><p className="text-xs text-gray-400">Customize how invoices look when printed</p></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Invoice Number Prefix</label>
                                    <input type="text" value={data.invoice_prefix} onChange={(e) => setData("invoice_prefix", e.target.value)} className={inputCls} placeholder="INV" />
                                    <p className="text-xs text-gray-400 mt-1">e.g. INV → INV-PH-0001</p>
                                </div>

                                {/* Paper size selector */}
                                <div>
                                    <label className={labelCls}>Print Paper Size</label>
                                    <div className="flex gap-3 mt-1">
                                        {["A4", "80mm"].map((size) => (
                                            <button key={size} type="button" onClick={() => setData("invoice_paper_size", size)}
                                                className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${data.invoice_paper_size === size ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400" : "border-gray-200 dark:border-slate-600 text-gray-500 hover:border-gray-300"}`}>
                                                {size === "A4" ? "📄 A4" : "🧾 80mm Thermal"}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1.5">
                                        {data.invoice_paper_size === "80mm" ? "Compact thermal receipt layout for POS printers" : "Full-page professional A4 invoice layout"}
                                    </p>
                                </div>
                            </div>

                            {/* Invoice Template Format Selector */}
                            <div>
                                <label className={labelCls}>Invoice Template Format</label>
                                <p className="text-xs text-gray-400 mb-3">Choose the visual style for your A4 invoices. This setting is per-shop.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setData("invoice_template", "default")}
                                        className={`relative p-5 rounded-2xl border-2 text-left transition-all ${data.invoice_template === "default"
                                            ? "border-primary-500 bg-primary-50/50 dark:bg-primary-900/10 shadow-lg shadow-primary-500/10"
                                            : "border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500"
                                            }`}
                                    >
                                        {data.invoice_template === "default" && (
                                            <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center">
                                                <CheckCircle className="w-4 h-4" />
                                            </span>
                                        )}
                                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
                                            <span className="text-lg">🏆</span>
                                        </div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">Studio Gold</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Current gold-accent invoice design with elegant typography and branding.</p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setData("invoice_template", "client_format")}
                                        className={`relative p-5 rounded-2xl border-2 text-left transition-all ${data.invoice_template === "client_format"
                                            ? "border-primary-500 bg-primary-50/50 dark:bg-primary-900/10 shadow-lg shadow-primary-500/10"
                                            : "border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500"
                                            }`}
                                    >
                                        {data.invoice_template === "client_format" && (
                                            <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center">
                                                <CheckCircle className="w-4 h-4" />
                                            </span>
                                        )}
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                                            <span className="text-lg">🎨</span>
                                        </div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">Client Format</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Professional blue-accent format. No transportation details section.</p>
                                    </button>
                                </div>
                            </div>

                            {/* Footer note */}
                            <div>
                                <label className={labelCls}>Invoice Footer Note</label>
                                <input type="text" value={data.invoice_note} onChange={(e) => setData("invoice_note", e.target.value)} className={inputCls} placeholder="Thank you for your business!" />
                                <p className="text-xs text-gray-400 mt-1">Appears below the items table on every printed invoice.</p>
                            </div>

                            <div>
                                <label className={labelCls}>Terms &amp; Conditions</label>
                                <textarea
                                    value={data.invoice_terms}
                                    onChange={(e) => setData("invoice_terms", e.target.value)}
                                    rows={3}
                                    className={`${inputCls} resize-none`}
                                    placeholder={"01 Year warranty\n3.0 / 32 GB\nDelivery within 7 days"}
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Appears on the printed invoice under "Terms & Conditions". One item per line.
                                </p>
                            </div>



                            <div>
                                <label className={labelCls}>Payment Info</label>
                                <textarea
                                    value={data.invoice_payment_info}
                                    onChange={(e) => setData("invoice_payment_info", e.target.value)}
                                    rows={4}
                                    className={`${inputCls} resize-none`}
                                    placeholder={"Account #: 120667422537\nA/C Name: Suneth Chamika\nBank: Sampath Bank"}
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Bank/account details shown on the invoice. One field per line.
                                </p>
                            </div>


                            {/* Preview note */}
                            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 flex items-start gap-3">
                                <Printer className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                                <div className="text-xs text-indigo-700 dark:text-indigo-300">
                                    <strong>Print preview:</strong> Click the printer icon on any invoice to see the full template. It reads these settings live — no need to refresh.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Tax Configuration ── */}
                    {activeSection === "tax" && (
                        <div className="space-y-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30"><DollarSign className="w-5 h-5 text-amber-500" /></div>
                                <div><h3 className="font-bold text-gray-900 dark:text-white">Tax Configuration</h3><p className="text-xs text-gray-400">Set default tax rate applied to invoices</p></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Default Tax Rate (%)</label>
                                    <input type="number" value={data.tax_rate} onChange={(e) => setData("tax_rate", e.target.value)} min="0" max="100" step="0.01" className={inputCls} placeholder="0" />
                                    <p className="text-xs text-gray-400 mt-1">e.g. 10 = 10% VAT. Set to 0 to disable tax.</p>
                                    {errors.tax_rate && <p className="text-xs text-red-500 mt-1">{errors.tax_rate}</p>}
                                </div>
                                <div>
                                    <label className={labelCls}>Currency</label>
                                    <select value={data.currency} onChange={(e) => setData("currency", e.target.value)} className={inputCls}>
                                        <option value="LKR">LKR — Sri Lankan Rupee</option>
                                        <option value="USD">USD — US Dollar</option>
                                        <option value="EUR">EUR — Euro</option>
                                        <option value="GBP">GBP — British Pound</option>
                                    </select>
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
                                <strong>Note:</strong> This is the default. You can override per-invoice when creating or editing.
                            </div>
                        </div>
                    )}

                    {activeSection === "bill-categories" && (
                        <BillCategoryManager billCategories={itemTypes} />
                    )}

                    {activeSection === "role-shifts" && (
                        <RoleShiftSettingsManager
                            roleShiftSettings={roleShiftSettings}
                            canManage={canManageRoleShifts}
                        />
                    )}

                    {/* ── WhatsApp ── */}
                    {activeSection === "whatsapp" && (
                        <div className="space-y-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30"><MessageCircle className="w-5 h-5 text-green-500" /></div>
                                <div><h3 className="font-bold text-gray-900 dark:text-white">WhatsApp Integration</h3><p className="text-xs text-gray-400">Configure message delivery for quotations and invoices</p></div>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-700">
                                <div><p className="font-medium text-gray-900 dark:text-white text-sm">Auto-send quotation PDF</p><p className="text-xs text-gray-500 dark:text-gray-400">Attach quotation files before WhatsApp delivery</p></div>
                                <Toggle checked={data.auto_send_pdf} onChange={(v) => setData("auto_send_pdf", v)} />
                            </div>
                        </div>
                    )}

                    {/* ── Inventory Alerts ── */}
                    {activeSection === "inventory" && (
                        <div className="space-y-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/30"><Package className="w-5 h-5 text-orange-500" /></div>
                                <div><h3 className="font-bold text-gray-900 dark:text-white">Inventory Alerts</h3><p className="text-xs text-gray-400">Configure low stock notifications</p></div>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-700">
                                <div><p className="font-medium text-gray-900 dark:text-white text-sm">Low stock alerts</p><p className="text-xs text-gray-500 dark:text-gray-400">Notify the team when inventory drops below threshold</p></div>
                                <Toggle checked={data.low_stock_alert} onChange={(v) => setData("low_stock_alert", v)} />
                            </div>
                        </div>
                    )}

                    {/* ── Placeholder sections ── */}
                    {/* {(activeSection === "team" || activeSection === "security" || activeSection === "database") && (
                        <div className="py-12 text-center">
                            <Settings className="w-12 h-12 text-gray-200 dark:text-slate-600 mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                {activeSection === "team" ? "Team Access & Roles" : activeSection === "security" ? "Security Settings" : "Database Backup & Restore"}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Available when Sandaru completes the user roles module.</p>
                        </div>
                    )} */}
                </div>

                {/* Quick Settings */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 mb-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-gray-400" /> Quick Settings
                    </h3>
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <div><p className="font-medium text-gray-900 dark:text-white text-sm">Auto-send quotation PDF</p><p className="text-xs text-gray-500 dark:text-gray-400">Attach quotation files before WhatsApp delivery</p></div>
                            <Toggle checked={data.auto_send_pdf} onChange={(v) => setData("auto_send_pdf", v)} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div><p className="font-medium text-gray-900 dark:text-white text-sm">Low stock alerts</p><p className="text-xs text-gray-500 dark:text-gray-400">Notify team when inventory drops below threshold</p></div>
                            <Toggle checked={data.low_stock_alert} onChange={(v) => setData("low_stock_alert", v)} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div><p className="font-medium text-gray-900 dark:text-white text-sm">Invoice approval check</p><p className="text-xs text-gray-500 dark:text-gray-400">Require manual review before sending edited invoices</p></div>
                            <Toggle checked={data.invoice_approval} onChange={(v) => setData("invoice_approval", v)} />
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white text-sm flex items-center gap-2"><Printer className="w-4 h-4 text-gray-400" /> Invoice Paper Size</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Current: <span className="font-semibold text-primary-500">{data.invoice_paper_size}</span></p>
                            </div>
                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 rounded-xl p-1">
                                {["A4", "80mm"].map((size) => (
                                    <button key={size} type="button" onClick={() => setData("invoice_paper_size", size)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${data.invoice_paper_size === size ? "bg-white dark:bg-slate-600 text-primary-600 dark:text-primary-400 shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {activeSection !== "role-shifts" && activeSection !== "bill-categories" && (
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400">Settings are saved to the database and apply immediately.</p>
                        <button type="submit" disabled={processing}
                            className="px-6 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 shadow-sm">
                            {processing ? "Saving…" : "Save Settings"}
                        </button>
                    </div>
                )}
            </form>
        </MainLayout>
    );
}