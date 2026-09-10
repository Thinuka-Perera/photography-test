import ConfirmModal from "@/Components/ConfirmModal";
import Modal from "@/Components/Modal";
import MainLayout from "@/Layouts/MainLayout";
import { Head, router, useForm } from "@inertiajs/react";
import {
    Lock,
    PencilLine,
    PlusCircle,
    Search,
    Shield,
    Trash2,
    Users2,
} from "lucide-react";
import { useState } from "react";

const blankForm = {
    name: "",
    email: "",
    role_id: "",
    password: "",
    password_confirmation: "",
    shop_ids: [],
};

const roleBadgeStyles = {
    super_admin:
        "bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-800",
    admin: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-800",
    manager:
        "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-800",
    inventory_officer:
        "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800",
    cashier:
        "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:ring-violet-800",
};

function StatTile({ label, value, icon: Icon, tone = "primary" }) {
    const tones = {
        primary:
            "bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300",
        slate:
            "bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200",
        emerald:
            "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
        amber:
            "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
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
export default function Index({
    users,
    roles,
    stats,
    currentUserId,
    canAssignSuperAdmin,
    shops,
}) {
    const [search, setSearch] = useState("");
    const [editingUser, setEditingUser] = useState(null);
    const [showFormModal, setShowFormModal] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm(blankForm);

    const filteredUsers = users.filter(user => {
        const keyword = search.trim().toLowerCase();

        if (!keyword) {
            return true;
        }

        return [user.name, user.email, user.role?.name]
            .filter(Boolean)
            .some(value => value.toLowerCase().includes(keyword));
    });

    const adminRoleSlugs = ["super_admin", "admin"];
    const selectedRole = roles.find(
        r => String(r.id) === String(data.role_id),
    );
    const requiresShopAssignment =
        selectedRole && !adminRoleSlugs.includes(selectedRole.slug);
    const shopSelectionCount = (data.shop_ids ?? []).filter(
        id => id !== null && id !== "",
    ).length;

    const openCreateModal = () => {
        setEditingUser(null);
        setData({
            ...blankForm,
            role_id: roles[0]?.id ?? "",
        });
        clearErrors();
        setShowFormModal(true);
    };

    const openEditModal = user => {
        if (!user.is_manageable) {
            return;
        }

        setEditingUser(user);
        setData({
            name: user.name ?? "",
            email: user.email ?? "",
            role_id: user.role?.id ?? "",
            password: "",
            password_confirmation: "",
            shop_ids: (user.shop_ids ?? []).map(id => Number(id)),
        });
        clearErrors();
        setShowFormModal(true);
    };

    const closeFormModal = () => {
        setShowFormModal(false);
        setEditingUser(null);
        reset();
        clearErrors();
    };

    const submitForm = event => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => closeFormModal(),
        };

        if (editingUser) {
            put(route("users.update", editingUser.id), options);
            return;
        }

        post(route("users.store"), options);
    };

    const confirmDelete = () => {
        if (!pendingDelete) {
            return;
        }

        router.delete(route("users.destroy", pendingDelete.id), {
            preserveScroll: true,
            onFinish: () => setPendingDelete(null),
        });
    };

    const inputCls =
        "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500";

    return (
        <MainLayout pageTitle="User Management">
            <Head title="User Management" />

            <div className="space-y-6">
                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                                <Shield className="h-3.5 w-3.5" />
                                Admin workspace
                            </div>
                            <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                                Manage users and assign roles
                            </h1>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Super admins and admins can create accounts,
                                set roles, and keep access under control from
                                one place.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                                <Search className="h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={event =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search users or roles"
                                    className="w-full min-w-[220px] border-0 bg-transparent p-0 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-0 dark:text-gray-200"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-600"
                            >
                                <PlusCircle className="h-4 w-4" />
                                Add user
                            </button>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatTile
                        label="Total users"
                        value={stats.total}
                        icon={Users2}
                        tone="primary"
                    />
                    <StatTile
                        label="Admin accounts"
                        value={stats.admins}
                        icon={Shield}
                        tone="amber"
                    />
                    <StatTile
                        label="Staff accounts"
                        value={stats.staff}
                        icon={Users2}
                        tone="emerald"
                    />
                    <StatTile
                        label="Available roles"
                        value={stats.roles}
                        icon={Lock}
                        tone="slate"
                    />
                </section>

                <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="border-b border-gray-100 px-6 py-4 dark:border-slate-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Team accounts
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {filteredUsers.length} user
                            {filteredUsers.length === 1 ? "" : "s"} shown
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-900/50 dark:text-gray-400">
                                <tr>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Joined</th>
                                    <th className="px-6 py-4 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="4"
                                            className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                                        >
                                            No users matched your search.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map(user => (
                                        <tr
                                            key={user.id}
                                            className="hover:bg-gray-50/80 dark:hover:bg-slate-900/40"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900 dark:text-white">
                                                    {user.name}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {user.email}
                                                </div>
                                                {user.id === currentUserId ? (
                                                    <div className="mt-2 inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                                                        Current session
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                                                        roleBadgeStyles[
                                                            user.role?.slug
                                                        ] ??
                                                        "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-slate-600"
                                                    }`}
                                                >
                                                    {user.role?.name ??
                                                        "Unassigned"}
                                                </span>
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {user.shop_ids?.map((id) => {
                                                        const shop = shops.find(
                                                            s =>
                                                                Number(s.id) ===
                                                                Number(id),
                                                        );
                                                        return shop ? (
                                                            <span
                                                                key={id}
                                                                className="rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-slate-700 dark:text-slate-300"
                                                            >
                                                                {shop.name}
                                                            </span>
                                                        ) : null;
                                                    })}
                                                    {(!user.shop_ids || user.shop_ids.length === 0) && (
                                                        <span className="text-[10px] text-red-400 italic">
                                                            No shops assigned
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                {user.created_at ?? "—"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEditModal(user)
                                                        }
                                                        disabled={
                                                            !user.is_manageable
                                                        }
                                                        className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-700"
                                                    >
                                                        <PencilLine className="h-3.5 w-3.5" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setPendingDelete(
                                                                user,
                                                            )
                                                        }
                                                        disabled={
                                                            !user.is_manageable ||
                                                            user.id ===
                                                                currentUserId
                                                        }
                                                        className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-900/20"
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
                </section>
            </div>

            <Modal show={showFormModal} maxWidth="2xl" onClose={closeFormModal}>
                <form onSubmit={submitForm} className="p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingUser ? "Edit user" : "Create user"}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {editingUser
                                    ? "Update the account details and assigned role."
                                    : "Add a new team member and decide what they can access."}
                            </p>
                        </div>
                        {canAssignSuperAdmin ? (
                            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                                Super Admin can assign any role
                            </div>
                        ) : (
                            <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                                Super Admin role is restricted
                            </div>
                        )}
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Full name
                            </label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={event =>
                                    setData("name", event.target.value)
                                }
                                className={inputCls}
                                required
                            />
                            {errors.name ? (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.name}
                                </p>
                            ) : null}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Email address
                            </label>
                            <input
                                type="email"
                                value={data.email}
                                onChange={event =>
                                    setData("email", event.target.value)
                                }
                                className={inputCls}
                                required
                            />
                            {errors.email ? (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.email}
                                </p>
                            ) : null}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Role
                            </label>
                            <select
                                value={data.role_id}
                                onChange={event =>
                                    setData("role_id", event.target.value)
                                }
                                className={inputCls}
                                required
                            >
                                <option value="">Select role</option>
                                {roles.map(role => (
                                    <option key={role.id} value={role.id}>
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                            {errors.role_id ? (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.role_id}
                                </p>
                            ) : null}
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-300">
                            Role permissions are managed from the separate{" "}
                            <span className="font-semibold">Role Access</span>{" "}
                            page. This screen is for account assignment and
                            maintenance.
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                {editingUser
                                    ? "New password"
                                    : "Password"}
                            </label>
                            <input
                                type="password"
                                value={data.password}
                                onChange={event =>
                                    setData("password", event.target.value)
                                }
                                className={inputCls}
                                required={!editingUser}
                            />
                            {errors.password ? (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.password}
                                </p>
                            ) : (
                                <p className="mt-1 text-xs text-gray-400">
                                    {editingUser
                                        ? "Leave blank to keep the current password."
                                        : "Set a secure password for first login."}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Confirm password
                            </label>
                            <input
                                type="password"
                                value={data.password_confirmation}
                                onChange={event =>
                                    setData(
                                        "password_confirmation",
                                        event.target.value,
                                    )
                                }
                                className={inputCls}
                                required={!editingUser}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Authorized Shops
                            </label>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {shops.map((shop) => {
                                    const sid = Number(shop.id);
                                    const checked = data.shop_ids
                                        .map(Number)
                                        .includes(sid);

                                    return (
                                    <label
                                        key={shop.id}
                                        className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/50 dark:hover:bg-slate-900"
                                    >
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded-lg border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800"
                                            checked={checked}
                                            onChange={(e) => {
                                                const isChecked = e.target.checked;
                                                const ids = data.shop_ids
                                                    .map(Number)
                                                    .filter(n => !Number.isNaN(n));
                                                if (isChecked) {
                                                    if (!ids.includes(sid)) {
                                                        ids.push(sid);
                                                    }
                                                } else {
                                                    const idx = ids.indexOf(sid);
                                                    if (idx > -1) ids.splice(idx, 1);
                                                }
                                                setData("shop_ids", ids);
                                            }}
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                            {shop.name}
                                        </span>
                                    </label>
                                    );
                                })}
                            </div>
                            {errors.shop_ids ? (
                                <p className="mt-1 text-xs text-red-500">{errors.shop_ids}</p>
                            ) : null}
                            {requiresShopAssignment && shopSelectionCount === 0 ? (
                                <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-900/25 dark:text-amber-200">
                                    This role must have at least one shop ticked. Without it, login and shop pages will not work for this user.
                                </p>
                            ) : null}
                            {requiresShopAssignment && shopSelectionCount === 1 ? (
                                <p className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-900/25 dark:text-blue-200">
                                    Only one shop is selected — that user will always stay in this shop (no switching). This is correct if they should only work at one location.
                                </p>
                            ) : null}
                            {requiresShopAssignment && shopSelectionCount > 1 ? (
                                <p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-200">
                                    Multiple shops — they can switch using the sidebar Active shop control. They cannot open shops that are not ticked here.
                                </p>
                            ) : null}
                            {selectedRole && adminRoleSlugs.includes(selectedRole.slug) ? (
                                <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
                                    {selectedRole.slug === "super_admin"
                                        ? "Super Admin can access every shop; shop checkboxes are optional."
                                        : "Admin accounts can access all shops for management; shop checkboxes are optional."}
                                </p>
                            ) : null}
                            <p className="mt-2 text-xs text-gray-400 italic">
                                Users can only switch between and view data for their authorized shops.
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={closeFormModal}
                            className="rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-2xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-60"
                        >
                            {processing
                                ? "Saving..."
                                : editingUser
                                  ? "Update user"
                                  : "Create user"}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={Boolean(pendingDelete)}
                onClose={() => setPendingDelete(null)}
                onConfirm={confirmDelete}
                title="Delete user"
                message={
                    pendingDelete
                        ? `Delete ${pendingDelete.name}'s account? This removes their access immediately.`
                        : "Delete this user?"
                }
                confirmText="Delete user"
            />
        </MainLayout>
    );
}
