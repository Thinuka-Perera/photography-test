/**
 * Shops/Index Page
 * ----------------------------------------------------------------------------
 * Landing + management page for the multi-shop layer. Renders one card per
 * registered shop and lets the user:
 *
 *   - See which shop is currently active
 *   - Switch the active shop with a single click on the card body
 *   - Recognise the system-default shop (badge)
 *
 * Admins (role.is_admin / is_super_admin) additionally get full CRUD:
 *
 *   - "+ New shop" button in the page header → create modal
 *   - Pencil icon on each card → edit modal (slug, name, address, phone,
 *     active flag, optional "make default" promotion)
 *   - Trash icon on each card → confirm-delete dialog
 *
 * The four shop-aware modules (Central Inventory, Stock Tracking,
 * Purchase History, Categories) all hard-redirect here when no shop is
 * resolvable — making this page the single source of truth for shop
 * selection and lifecycle.
 *
 * IMPORTANT — Provider scoping:
 *   `useActiveShop()` only works inside the <ShopProvider> mounted by
 *   MainLayout. The page-level <ShopsIndex> component is a child of
 *   Inertia's <App> but a *parent* of MainLayout, so it cannot call the
 *   hook directly. We therefore split this page into:
 *     - ShopsIndex  — top-level component, renders MainLayout
 *     - ShopGrid    — inner component, rendered as a child of MainLayout,
 *                     and free to call useActiveShop() because at that
 *                     depth the provider is already mounted.
 * ----------------------------------------------------------------------------
 */
import MainLayout from "@/Layouts/MainLayout";
import useActiveShop from "@/hooks/useActiveShop";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import {
    AlertTriangle,
    Building2,
    CheckCircle2,
    MapPin,
    Pencil,
    Phone,
    Plus,
    Star,
    Trash2,
    X,
} from "lucide-react";
import { useState } from "react";

/**
 * Slide-in modal form for creating or editing a shop.
 *
 * Mode "create" uses POST /shops; mode "edit" uses PUT /shops/{slug}.
 * The form mirrors the server-side validation rules in
 * App\Modules\Shops\Http\Controllers\ShopController.
 *
 * @param {{
 *   mode: 'create' | 'edit',
 *   shop?: { slug: string, name: string, address?: string|null,
 *            phone?: string|null, is_active?: boolean,
 *            is_default?: boolean },
 *   onClose: () => void,
 * }} props
 * @returns {JSX.Element}
 */
function ShopFormModal({ mode, shop, onClose }) {
    const isEdit = mode === "edit";

    const { data, setData, post, put, processing, errors, reset } = useForm({
        slug: shop?.slug ?? "",
        name: shop?.name ?? "",
        bill_prefix: shop?.bill_prefix ?? "BILL",
        address: shop?.address ?? "",
        phone: shop?.phone ?? "",
        is_active: shop?.is_active ?? true,
        is_default: false, // promotion is opt-in per submission
    });

    const submit = e => {
        e.preventDefault();
        const opts = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        };
        if (isEdit) {
            put(route("shops.update", shop.slug), opts);
        } else {
            post(route("shops.store"), opts);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {isEdit ? "Edit shop" : "Create new shop"}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={submit} className="px-6 py-5 space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                            Shop name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={e => setData("name", e.target.value)}
                            placeholder="Floor 02 Branch"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            autoFocus
                        />
                        {errors.name && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.name}
                            </p>
                        )}
                    </div>

                    {/* Slug */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                            URL slug <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.slug}
                            onChange={e =>
                                setData(
                                    "slug",
                                    e.target.value
                                        .toLowerCase()
                                        .replace(/[^a-z0-9-_]/g, "-")
                                )
                            }
                            placeholder="floor-02"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-[11px] text-gray-400">
                            Used in URLs (e.g. <code>?shop={data.slug || "main"}</code>). Letters, numbers, dashes, underscores only.
                        </p>
                        {errors.slug && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.slug}
                            </p>
                        )}
                    </div>

                    {/* Bill Prefix */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                            Bill Prefix <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.bill_prefix}
                            onChange={e =>
                                setData(
                                    "bill_prefix",
                                    e.target.value
                                        .toUpperCase()
                                        .replace(/[^A-Z0-9-_]/g, "")
                                )
                            }
                            placeholder="BILL"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-[11px] text-gray-400">
                            Used for invoice numbering (e.g. <code>{data.bill_prefix || "BILL"}-20260512-0006</code>).
                        </p>
                        {errors.bill_prefix && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.bill_prefix}
                            </p>
                        )}
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                            Address
                        </label>
                        <input
                            type="text"
                            value={data.address ?? ""}
                            onChange={e => setData("address", e.target.value)}
                            placeholder="No. 12, Galle Road, Colombo 03"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        {errors.address && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.address}
                            </p>
                        )}
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                            Phone
                        </label>
                        <input
                            type="text"
                            value={data.phone ?? ""}
                            onChange={e => setData("phone", e.target.value)}
                            placeholder="+94 11 234 5678"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        {errors.phone && (
                            <p className="mt-1 text-xs text-red-500">
                                {errors.phone}
                            </p>
                        )}
                    </div>

                    {/* Toggles */}
                    <div className="space-y-2 pt-1">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={!!data.is_active}
                                onChange={e =>
                                    setData("is_active", e.target.checked)
                                }
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                Active{" "}
                                <span className="text-gray-400 text-xs">
                                    (visible in switcher)
                                </span>
                            </span>
                        </label>

                        {/* "Make default" — only useful for non-default shops in edit mode,
                            and for new shops always. The backend will demote the previous
                            default in a single transaction. */}
                        {(!isEdit || !shop?.is_default) && (
                            <label className="flex items-center gap-2.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!!data.is_default}
                                    onChange={e =>
                                        setData("is_default", e.target.checked)
                                    }
                                    className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    Make default{" "}
                                    <span className="text-gray-400 text-xs">
                                        (used when no shop is selected)
                                    </span>
                                </span>
                            </label>
                        )}

                        {isEdit && shop?.is_default && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                <Star className="inline w-3 h-3 mr-1" />
                                This is the current default shop. Promote
                                another shop to demote this one.
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-60"
                        >
                            {processing
                                ? "Saving..."
                                : isEdit
                                  ? "Save changes"
                                  : "Create shop"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/**
 * Confirm-delete dialog. The DELETE request is fired only after the user
 * explicitly confirms, and the server still refuses to remove the default
 * shop or the last remaining shop (ShopController::destroy).
 *
 * @param {{
 *   shop: { slug: string, name: string },
 *   onCancel: () => void,
 * }} props
 * @returns {JSX.Element}
 */
function ConfirmDeleteModal({ shop, onCancel }) {
    const [busy, setBusy] = useState(false);

    const submit = () => {
        setBusy(true);
        router.delete(route("shops.destroy", shop.slug), {
            preserveScroll: true,
            onFinish: () => setBusy(false),
            onSuccess: () => onCancel(),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            Delete shop?
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Are you sure you want to delete{" "}
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                                {shop.name}
                            </span>
                            ? Inventory and stock records linked to this shop
                            will lose their scope. This action cannot be
                            undone.
                        </p>
                    </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={busy}
                        className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60"
                    >
                        {busy ? "Deleting..." : "Delete shop"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Inner component: rendered INSIDE MainLayout (so inside ShopProvider) and
 * therefore free to call useActiveShop().
 *
 * @param {{ shops: Array<{
 *   id: number, slug: string, name: string,
 *   address: string|null, phone: string|null,
 *   is_default: boolean, is_active: boolean,
 * }> }} props
 * @returns {JSX.Element}
 */
function ShopGrid({ shops }) {
    const { activeShop, switchShop } = useActiveShop();
    const { auth, flash, errors } = usePage().props;
    const canManage = !!(
        auth?.access?.is_admin || auth?.access?.is_super_admin
    );

    // null | { mode: 'create' } | { mode: 'edit', shop } | { mode: 'delete', shop }
    const [modal, setModal] = useState(null);

    return (
        <div className="space-y-6">
            {/* Flash messages (success/error from CRUD endpoints) */}
            {flash?.success ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                    {flash.success}
                </div>
            ) : null}
            {flash?.error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                    {flash.error}
                </div>
            ) : null}
            {errors?.shop ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                    {errors.shop}
                </div>
            ) : null}

            {/* Page header */}
            <section className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-600 dark:text-primary-300">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700 dark:text-primary-300">
                            Multi-shop layer
                        </p>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Choose a shop
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Inventory, Stock Tracking, Purchase History, and
                            Categories are scoped to the shop you pick.
                            Switching takes effect immediately.
                        </p>
                    </div>
                </div>

                {canManage && (
                    <button
                        type="button"
                        onClick={() => setModal({ mode: "create" })}
                        className="inline-flex items-center gap-2 self-start rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-600 md:self-auto"
                    >
                        <Plus className="h-4 w-4" />
                        New shop
                    </button>
                )}
            </section>

            {/* Shop cards */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shops.map(shop => {
                    const isActive =
                        activeShop != null &&
                        Number(activeShop.id) === Number(shop.id);

                    return (
                        <div
                            key={shop.slug}
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                                !isActive && switchShop(shop.slug)
                            }
                            onKeyDown={e => {
                                if (
                                    !isActive &&
                                    (e.key === "Enter" || e.key === " ")
                                ) {
                                    e.preventDefault();
                                    switchShop(shop.slug);
                                }
                            }}
                            className={`group relative cursor-pointer rounded-3xl border bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-300 dark:bg-slate-800 ${
                                isActive
                                    ? "border-primary-500 ring-2 ring-primary-200 dark:ring-primary-900/40"
                                    : "border-gray-200 dark:border-slate-700"
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-600 dark:text-primary-300">
                                    <Building2 className="h-5 w-5" />
                                </div>

                                <div className="flex items-center gap-2">
                                    {shop.is_default ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                            <Star className="h-3 w-3" />
                                            Default
                                        </span>
                                    ) : null}

                                    {/* Admin actions — stop propagation so they
                                        don't trigger the parent "switch" handler. */}
                                    {canManage && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    setModal({
                                                        mode: "edit",
                                                        shop,
                                                    });
                                                }}
                                                title="Edit shop"
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    setModal({
                                                        mode: "delete",
                                                        shop,
                                                    });
                                                }}
                                                title={
                                                    shop.is_default
                                                        ? "Cannot delete the default shop"
                                                        : "Delete shop"
                                                }
                                                disabled={shop.is_default}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <h2 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">
                                {shop.name}
                            </h2>
                            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
                                {shop.slug}
                            </p>

                            <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                {shop.address ? (
                                    <p className="flex items-start gap-2">
                                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                                        <span>{shop.address}</span>
                                    </p>
                                ) : null}
                                {shop.phone ? (
                                    <p className="flex items-start gap-2">
                                        <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                                        <span>{shop.phone}</span>
                                    </p>
                                ) : null}
                            </div>

                            <div className="mt-5 flex items-center justify-between">
                                {isActive ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Active
                                    </span>
                                ) : (
                                    <span className="text-xs font-semibold text-primary-600 group-hover:underline dark:text-primary-300">
                                        Click to switch
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </section>

            {/* Modals */}
            {modal?.mode === "create" && (
                <ShopFormModal
                    mode="create"
                    onClose={() => setModal(null)}
                />
            )}
            {modal?.mode === "edit" && (
                <ShopFormModal
                    mode="edit"
                    shop={modal.shop}
                    onClose={() => setModal(null)}
                />
            )}
            {modal?.mode === "delete" && (
                <ConfirmDeleteModal
                    shop={modal.shop}
                    onCancel={() => setModal(null)}
                />
            )}
        </div>
    );
}

/**
 * Top-level page component. Pure shell — never reads context, so it is
 * safe to mount above ShopProvider.
 *
 * @param {{ shops: Array<object> }} props
 * @returns {JSX.Element}
 */
export default function ShopsIndex({ shops }) {
    return (
        <MainLayout pageTitle="Shops">
            <Head title="Shops" />
            <ShopGrid shops={shops} />
        </MainLayout>
    );
}
