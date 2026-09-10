import MainLayout from "@/Layouts/MainLayout";
import ActiveShopBanner from "@/Modules/Shops/Components/ActiveShopBanner";
import { Head, useForm } from "@inertiajs/react";
import {
    Edit2,
    FolderTree,
    Layers,
    Plus,
    Save,
    Tag,
    Trash2,
    X,
} from "lucide-react";
import { useState } from "react";
import ConfirmModal from "@/Components/ConfirmModal";

// ─────────────────────────────────────────────
// Categories Page — Full CRUD for product categories
//
// Categories control which Inventory view a product appears in:
//   - 'frame'   → Frame Grid View (Size + Grade filter)
//   - 'general' → General Stock List (Ink, Paper, etc.)
//
// Props from CategoryController::index():
//   categories: Array of { id, name, type, products_count }
// ─────────────────────────────────────────────

// Type badge styles
const typeBadge = {
    frame: {
        label: "Frame",
        cls: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
        icon: Layers,
    },
    general: {
        label: "General Stock",
        cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        icon: Tag,
    },
};

// ─────────────────────────────────────────────
// CategoryForm — inline form for create or edit
// ─────────────────────────────────────────────
function CategoryForm({ editingCategory, onCancel }) {
    const isEdit = !!editingCategory;

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: editingCategory?.name ?? "",
        type: editingCategory?.type ?? "general",
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEdit) {
            // PUT /categories/{id} — update existing category
            put(route("categories.update", editingCategory.id), {
                onSuccess: () => onCancel(),
            });
        } else {
            // POST /categories — create new category
            post(route("categories.store"), {
                onSuccess: () => reset(),
            });
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5"
        >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                {isEdit ? "Edit Category" : "New Category"}
            </h3>

            <div className="flex flex-col sm:flex-row gap-3">
                {/* Name input */}
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Category name (e.g. Photo Frames)"
                        value={data.name}
                        onChange={(e) => setData("name", e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#03AED2] focus:border-transparent placeholder:text-gray-400"
                        required
                    />
                    {errors.name && (
                        <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                    )}
                </div>

                {/* Type selector */}
                <div>
                    <select
                        value={data.type}
                        onChange={(e) => setData("type", e.target.value)}
                        className="w-full sm:w-44 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#03AED2] focus:border-transparent"
                    >
                        <option value="general">General Stock</option>
                        <option value="frame">Frame</option>
                    </select>
                    {errors.type && (
                        <p className="mt-1 text-xs text-red-500">{errors.type}</p>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={processing}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#03AED2] text-white font-medium hover:bg-[#029ab9] transition-colors disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {isEdit ? "Update" : "Add"}
                    </button>
                    {isEdit && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            <X className="w-4 h-4" />
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </form>
    );
}

// ─────────────────────────────────────────────
// Main Categories Page
// ─────────────────────────────────────────────
export default function Categories({ categories = [] }) {
    // Track which category is being edited (null = create mode)
    const [editingCategory, setEditingCategory] = useState(null);
    const [deleteError, setDeleteError]         = useState(null);
    const [deleteModal, setDeleteModal]         = useState({ isOpen: false, category: null });

    // useForm for delete (to get processing state and errors)
    const { delete: destroy, processing: deleting } = useForm();

    const handleDelete = (category) => {
        setDeleteError(null);
        setDeleteModal({ isOpen: true, category });
    };

    const confirmDelete = () => {
        if (!deleteModal.category) return;
        destroy(route("categories.destroy", deleteModal.category.id), {
            onSuccess: () => setDeleteModal({ isOpen: false, category: null }),
            onError: (errs) => {
                setDeleteError(errs.delete ?? "Delete failed.");
                setDeleteModal({ isOpen: false, category: null });
            },
        });
    };

    const frameCount   = categories.filter((c) => c.type === "frame").length;
    const generalCount = categories.filter((c) => c.type === "general").length;

    return (
        <MainLayout pageTitle="Categories">
            <Head title="Category Management" />

            <div className="space-y-6">
                <ActiveShopBanner />

                {/* ── Header ── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            Category Management
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Manage product categories — controls the Inventory view type.
                        </p>
                    </div>
                </div>

                {/* ── Stats ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-[#03AED2]/10 flex items-center justify-center">
                            <FolderTree className="w-5 h-5 text-[#03AED2]" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{categories.length}</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                            <Layers className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Frame</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{frameCount}</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                            <Tag className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">General Stock</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{generalCount}</p>
                        </div>
                    </div>
                </div>

                {/* ── Error from delete guard ── */}
                {deleteError && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                        <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {deleteError}
                    </div>
                )}

                {/* ── Create Form (always visible at top) ── */}
                {!editingCategory && (
                    <CategoryForm editingCategory={null} onCancel={() => {}} />
                )}

                {/* ── Edit Form (replaces create form) ── */}
                {editingCategory && (
                    <CategoryForm
                        editingCategory={editingCategory}
                        onCancel={() => setEditingCategory(null)}
                    />
                )}

                {/* ── Category Table ── */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                    {categories.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <FolderTree className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                            <p>No categories yet. Add one above.</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-slate-700/40">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">#</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Products</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {categories.map((cat, idx) => {
                                    const badge = typeBadge[cat.type] ?? typeBadge.general;
                                    const BadgeIcon = badge.icon;
                                    const isBeingEdited = editingCategory?.id === cat.id;

                                    return (
                                        <tr
                                            key={cat.id}
                                            className={`transition-colors ${
                                                isBeingEdited
                                                    ? "bg-[#03AED2]/5 dark:bg-[#03AED2]/5"
                                                    : "hover:bg-gray-50 dark:hover:bg-slate-700/30"
                                            }`}
                                        >
                                            {/* Index */}
                                            <td className="px-6 py-4 text-sm text-gray-400">{idx + 1}</td>

                                            {/* Name */}
                                            <td className="px-6 py-4">
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {cat.name}
                                                </span>
                                            </td>

                                            {/* Type badge */}
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${badge.cls}`}>
                                                    <BadgeIcon className="w-3 h-3" />
                                                    {badge.label}
                                                </span>
                                            </td>

                                            {/* Product count */}
                                            <td className="px-6 py-4 text-right">
                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 dark:bg-slate-700 text-sm font-bold text-gray-700 dark:text-gray-200">
                                                    {cat.products_count}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() =>
                                                            setEditingCategory(
                                                                isBeingEdited ? null : cat
                                                            )
                                                        }
                                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-[#03AED2] transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(cat)}
                                                        disabled={deleting}
                                                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, category: null })}
                onConfirm={confirmDelete}
                title="Delete Category"
                message={
                    deleteModal.category?.products_count > 0
                        ? `WARNING: "${deleteModal.category?.name}" has ${deleteModal.category?.products_count} product(s). Deleting this category will PERMANENTLY delete all these products and their inventory history. Are you sure?`
                        : `Are you sure you want to delete "${deleteModal.category?.name}"? This action cannot be undone.`
                }
                confirmText="Delete Everything"
                processing={deleting}
            />
        </MainLayout>
    );
}
