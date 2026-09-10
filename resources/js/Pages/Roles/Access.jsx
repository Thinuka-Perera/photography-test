import MainLayout from "@/Layouts/MainLayout";
import { Head, useForm } from "@inertiajs/react";
import { CheckSquare, Lock, Plus, Save, Shield, Trash2, Users2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function RoleCard({ role, active, onClick, onDelete }) {
    return (
        <div className="relative group">
            <button
                type="button"
                onClick={onClick}
                className={`w-full rounded-3xl border p-5 text-left transition ${active
                    ? "border-primary-400 bg-primary-50 shadow-sm dark:border-primary-600 dark:bg-primary-900/20"
                    : "border-gray-200 bg-white hover:border-primary-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-primary-700"
                    }`}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="pr-8">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {role.name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                            {role.description}
                        </p>
                    </div>
                    {role.locked ? (
                        <div className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-300">
                            Locked
                        </div>
                    ) : role.is_admin_role ? (
                        <div className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                            Admin
                        </div>
                    ) : null}
                </div>

                <div className="mt-4 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1.5">
                        <Users2 className="h-3.5 w-3.5" />
                        {role.user_count} user
                        {role.user_count === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <CheckSquare className="h-3.5 w-3.5" />
                        {role.permissions.length} pages
                    </span>
                </div>
            </button>

            {!role.locked && role.user_count === 0 && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(role);
                    }}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Delete Role"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}

export default function Access({
    roles,
    pages,
    adminRoleSlugs,
    adminOnlyPages,
}) {
    const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id ?? null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const selectedRole =
        roles.find(role => role.id === selectedRoleId) ?? roles[0] ?? null;

    const { data, setData, put, post, delete: destroy, processing, errors, clearErrors, reset } = useForm({
        permissions: selectedRole?.permissions ?? [],
        name: "",
        description: "",
    });

    useEffect(() => {
        setData("permissions", selectedRole?.permissions ?? []);
        clearErrors();
    }, [selectedRoleId, selectedRole?.permissions, setData, clearErrors]);

    const hasAccess = (pageKey, action) => {
        if (selectedRole?.locked) return true;
        if (data.permissions.includes('*')) return true;
        if (data.permissions.includes(pageKey)) return true;
        return data.permissions.includes(`${pageKey}.${action}`);
    };

    const togglePermission = (pageKey, action, availableActions) => {
        if (!selectedRole || selectedRole.locked) return;
        if (!adminRoleSlugs.includes(selectedRole.slug) && adminOnlyPages.includes(pageKey)) return;

        let newPermissions = [...data.permissions];

        if (newPermissions.includes(pageKey)) {
            newPermissions = newPermissions.filter(p => p !== pageKey);
            availableActions.forEach(a => {
                if (a !== action) newPermissions.push(`${pageKey}.${a}`);
            });
        } else {
            const perm = `${pageKey}.${action}`;
            if (newPermissions.includes(perm)) {
                newPermissions = newPermissions.filter(p => p !== perm);
                if (action === 'view') {
                    newPermissions = newPermissions.filter(p => !p.startsWith(`${pageKey}.`));
                }
            } else {
                newPermissions.push(perm);
                if (action !== 'view' && !newPermissions.includes(`${pageKey}.view`)) {
                    newPermissions.push(`${pageKey}.view`);
                }
            }
        }
        setData("permissions", newPermissions);
    };

    const toggleRow = (pageKey, availableActions, isAllChecked) => {
        if (!selectedRole || selectedRole.locked) return;
        if (!adminRoleSlugs.includes(selectedRole.slug) && adminOnlyPages.includes(pageKey)) return;

        let newPermissions = [...data.permissions].filter(p => p !== pageKey && !p.startsWith(`${pageKey}.`));
        if (!isAllChecked) {
            availableActions.forEach(a => newPermissions.push(`${pageKey}.${a}`));
        }
        setData("permissions", newPermissions);
    };

    const submit = event => {
        event.preventDefault();

        if (!selectedRole || selectedRole.locked) {
            return;
        }

        put(route("roles.access.update", selectedRole.id), {
            preserveScroll: true,
        });
    };

    const handleCreateRole = (e) => {
        e.preventDefault();
        post(route("roles.access.store"), {
            onSuccess: () => {
                setShowCreateModal(false);
                reset("name", "description");
            }
        });
    };

    const handleDeleteRole = (role) => {
        if (confirm(`Are you sure you want to delete the "${role.name}" role? This action cannot be undone.`)) {
            destroy(route("roles.access.destroy", role.id), {
                onSuccess: () => {
                    if (selectedRoleId === role.id) {
                        setSelectedRoleId(roles.find(r => r.id !== role.id)?.id ?? null);
                    }
                }
            });
        }
    };

    return (
        <MainLayout pageTitle="Role Access">
            <Head title="Role Access" />

            <div className="space-y-6">
                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                                <Shield className="h-3.5 w-3.5" />
                                Access control
                            </div>
                            <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                                Assign page access for each role
                            </h1>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Choose which parts of the system each role can
                                open. User management and role access stay
                                reserved for admin roles only.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
                            <span className="font-semibold">Reserved:</span>{" "}
                            Super Admin always has full access.
                        </div>
                    </div>
                </section>

                <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                    <section className="space-y-4">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">System Roles</h2>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors"
                                title="Add New Role"
                            >
                                <Plus className="h-5 w-5" />
                            </button>
                        </div>
                        {roles.map(role => (
                            <RoleCard
                                key={role.id}
                                role={role}
                                active={role.id === selectedRoleId}
                                onClick={() => setSelectedRoleId(role.id)}
                                onDelete={handleDeleteRole}
                            />
                        ))}
                    </section>

                    <form
                        onSubmit={submit}
                        className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                    >
                        {selectedRole ? (
                            <>
                                <div className="flex flex-col gap-4 border-b border-gray-100 pb-6 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                            {selectedRole.name}
                                        </h2>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            {selectedRole.description}
                                        </p>
                                        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                            {selectedRole.locked
                                                ? "All pages are enabled for this role."
                                                : `${data.permissions.length} pages selected`}
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={
                                            processing || selectedRole.locked
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Save className="h-4 w-4" />
                                        {processing
                                            ? "Saving..."
                                            : "Save access"}
                                    </button>
                                </div>

                                {selectedRole.locked ? (
                                    <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
                                        <div className="flex items-start gap-3">
                                            <Lock className="mt-0.5 h-5 w-5 flex-shrink-0" />
                                            <div>
                                                <p className="font-semibold">
                                                    Super Admin is fixed to full
                                                    system access.
                                                </p>
                                                <p className="mt-1">
                                                    This protects the system
                                                    from accidentally removing
                                                    the last full-access
                                                    account.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                {errors.permissions ? (
                                    <p className="mt-4 text-sm text-red-500">
                                        {errors.permissions}
                                    </p>
                                ) : null}

                                <div className="mt-6 space-y-6">
                                    {pages.map(section => (
                                        <section key={section.section}>
                                            <div className="mb-3">
                                                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                    {section.section}
                                                </h3>
                                            </div>

                                            <div className="overflow-x-auto rounded-3xl border border-gray-200 dark:border-slate-700">
                                                <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                                                    <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-400">
                                                        <tr>
                                                            <th scope="col" className="px-4 py-3 font-semibold w-1/3">Feature</th>
                                                            <th scope="col" className="px-4 py-3 font-semibold text-center w-12">View</th>
                                                            <th scope="col" className="px-4 py-3 font-semibold text-center w-12">Create</th>
                                                            <th scope="col" className="px-4 py-3 font-semibold text-center w-12">Edit</th>
                                                            <th scope="col" className="px-4 py-3 font-semibold text-center w-12">Delete</th>
                                                            <th scope="col" className="px-4 py-3 font-semibold text-center w-12">Export</th>
                                                            <th scope="col" className="px-4 py-3 font-semibold text-center w-16 border-l border-gray-200 dark:border-slate-700">All</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
                                                        {section.pages.map(page => {
                                                            const disabled = selectedRole.locked || (!adminRoleSlugs.includes(selectedRole.slug) && adminOnlyPages.includes(page.key));
                                                            const availableActions = page.available_actions || ['view', 'create', 'edit', 'delete'];

                                                            const isAllChecked = availableActions.every(a => hasAccess(page.key, a));

                                                            return (
                                                                <tr key={page.key} className={disabled ? 'opacity-60 bg-gray-50 dark:bg-slate-800/50' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50 transition'}>
                                                                    <td className="px-4 py-4">
                                                                        <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                                            {page.label}
                                                                            {!adminRoleSlugs.includes(selectedRole.slug) && adminOnlyPages.includes(page.key) ? (
                                                                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/10 dark:text-amber-300">
                                                                                    Admin Only
                                                                                </span>
                                                                            ) : null}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                                                                            {page.description}
                                                                        </div>
                                                                    </td>
                                                                    {['view', 'create', 'edit', 'delete', 'export'].map(action => {
                                                                        const isAvailable = availableActions.includes(action);
                                                                        const isChecked = hasAccess(page.key, action);
                                                                        return (
                                                                            <td key={action} className="px-4 py-4 text-center align-middle">
                                                                                {isAvailable ? (
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={disabled}
                                                                                        onClick={() => togglePermission(page.key, action, availableActions)}
                                                                                        className={`inline-flex h-5 w-5 items-center justify-center rounded border transition ${isChecked
                                                                                            ? 'border-primary-500 bg-primary-500 text-white'
                                                                                            : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-900 hover:border-primary-400'
                                                                                            } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                                                                    >
                                                                                        {isChecked && <CheckSquare className="h-3.5 w-3.5" />}
                                                                                    </button>
                                                                                ) : (
                                                                                    <span className="text-gray-300 dark:text-slate-600">-</span>
                                                                                )}
                                                                            </td>
                                                                        );
                                                                    })}
                                                                    <td className="px-4 py-4 text-center align-middle border-l border-gray-200 dark:border-slate-700">
                                                                        <button
                                                                            type="button"
                                                                            disabled={disabled}
                                                                            onClick={() => toggleRow(page.key, availableActions, isAllChecked)}
                                                                            className={`inline-flex h-5 w-5 items-center justify-center rounded border transition ${isAllChecked
                                                                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                                                                : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-900 hover:border-emerald-400'
                                                                                } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                                                            title="Select All"
                                                                        >
                                                                            {isAllChecked && <CheckSquare className="h-3.5 w-3.5" />}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </section>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                No roles available.
                            </div>
                        )}
                    </form>
                </div>
            </div>

            {/* Create Role Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl dark:bg-slate-800">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Role</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateRole} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Role Name</label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={e => setData("name", e.target.value)}
                                    className="w-full rounded-2xl border-gray-200 focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                                    placeholder="e.g. Editor, Supervisor"
                                    autoFocus
                                />
                                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                                <textarea
                                    value={data.description}
                                    onChange={e => setData("description", e.target.value)}
                                    className="w-full rounded-2xl border-gray-200 focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                                    placeholder="Brief description of this role's purpose..."
                                    rows={3}
                                />
                                {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-primary-600 rounded-2xl hover:bg-primary-700 transition-colors disabled:opacity-50"
                                >
                                    {processing ? "Creating..." : "Create Role"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}
