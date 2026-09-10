import ConfirmModal from "@/Components/ConfirmModal";
import Modal from "@/Components/Modal";
import MainLayout from "@/Layouts/MainLayout";
import { Head, Link, router, useForm } from "@inertiajs/react";
import {
    Mail,
    MapPin,
    PencilLine,
    Phone,
    PlusCircle,
    Search,
    Trash2,
    UserRound,
    WalletCards,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const blankForm = {
    name: "",
    customer_type: "amateur",
    phone: "",
    email: "",
    address: "",
    notes: "",
};

export default function Index({ customers, stats = {}, filters = {} }) {
    const [search, setSearch] = useState(filters.search ?? "");
    const firstSearchRender = useRef(true);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [showFormModal, setShowFormModal] = useState(false);
    const [customerPendingDelete, setCustomerPendingDelete] = useState(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm(blankForm);

    const openCreateModal = () => {
        setEditingCustomer(null);
        reset();
        clearErrors();
        setShowFormModal(true);
    };

    const openEditModal = (customer) => {
        setEditingCustomer(customer);
        clearErrors();
        setData({
            name: customer.name ?? "",
            customer_type: customer.customer_type ?? "amateur",
            phone: customer.phone ?? "",
            email: customer.email ?? "",
            address: customer.address ?? "",
            notes: customer.notes ?? "",
        });
        setShowFormModal(true);
    };

    const closeFormModal = () => {
        setShowFormModal(false);
        setEditingCustomer(null);
        reset();
        clearErrors();
    };

    const submitForm = (event) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => closeFormModal(),
        };

        if (editingCustomer) {
            put(route("customers.update", editingCustomer.id), options);
            return;
        }

        post(route("customers.store"), options);
    };

    useEffect(() => {
        if (firstSearchRender.current) {
            firstSearchRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            router.get(
                route("customers.index"),
                search.trim() ? { search } : {},
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 250);

        return () => clearTimeout(timer);
    }, [search]);

    const clearSearch = () => {
        setSearch("");
        router.get(
            route("customers.index"),
            {},
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const confirmDelete = () => {
        if (!customerPendingDelete) {
            return;
        }

        router.delete(route("customers.destroy", customerPendingDelete.id), {
            preserveScroll: true,
            onFinish: () => setCustomerPendingDelete(null),
        });
    };

    return (
        <MainLayout pageTitle="Customers">
            <Head title="Customers" />

            <div className="space-y-6">
                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                                <UserRound className="h-3.5 w-3.5" />
                                Customer records
                            </div>
                            <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                                Build and manage your customer list
                            </h1>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Store contact details, keep repeat clients organized,
                                and protect customer records that are already linked to
                                invoices or sales.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                                <Search className="h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search by name, phone, or email"
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
                            </div>

                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-600"
                            >
                                <PlusCircle className="h-4 w-4" />
                                Add customer
                            </button>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Total customers"
                        value={stats.total_customers ?? 0}
                        icon={UserRound}
                    />
                    <StatCard
                        label="With phone"
                        value={stats.with_phone ?? 0}
                        icon={Phone}
                    />
                    <StatCard
                        label="With email"
                        value={stats.with_email ?? 0}
                        icon={Mail}
                    />
                    <StatCard
                        label="Linked records"
                        value={stats.linked_records ?? 0}
                        icon={WalletCards}
                    />
                </section>

                <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="border-b border-gray-100 px-6 py-4 dark:border-slate-700">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Customers
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {customers.total
                                        ? `Showing ${customers.from}-${customers.to} of ${customers.total} customers`
                                        : "No customers saved yet"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="block lg:hidden">
                        {customers.data.length === 0 ? (
                            <EmptyState onCreate={openCreateModal} />
                        ) : (
                            <div className="space-y-4 p-4">
                                {customers.data.map((customer) => (
                                    <CustomerCard
                                        key={customer.id}
                                        customer={customer}
                                        onEdit={openEditModal}
                                        onDelete={setCustomerPendingDelete}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="hidden overflow-x-auto lg:block">
                        {customers.data.length === 0 ? (
                            <EmptyState onCreate={openCreateModal} />
                        ) : (
                            <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
                                <thead className="bg-gray-50/80 dark:bg-slate-900/60">
                                    <tr>
                                        <TableHeading>Customer</TableHeading>
                                        <TableHeading>Contact</TableHeading>
                                        <TableHeading>Address</TableHeading>
                                        <TableHeading>Usage</TableHeading>
                                        <TableHeading align="right">Actions</TableHeading>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {customers.data.map((customer) => (
                                        <tr key={customer.id}>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    <Link
                                                        href={route("customers.show", customer.id)}
                                                        className="hover:text-primary-600 dark:hover:text-primary-300"
                                                    >
                                                        {customer.name}
                                                    </Link>
                                                </div>
                                                <div className="mt-2">
                                                    <TypeBadge type={customer.customer_type} />
                                                </div>
                                                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                    {customer.notes || "No notes added"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                <InfoLine
                                                    icon={Phone}
                                                    value={customer.phone || "No phone"}
                                                />
                                                <InfoLine
                                                    icon={Mail}
                                                    value={customer.email || "No email"}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                <InfoLine
                                                    icon={MapPin}
                                                    value={customer.address || "No address"}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    <UsageBadge
                                                        label={`${customer.invoices_count} invoices`}
                                                        href={route("finance.invoices.index", { search: customer.name })}
                                                    />
                                                    <UsageBadge
                                                        label={`${customer.sales_count} sales`}
                                                        href={route("studio.sales.index", { search: customer.name })}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <ActionButton
                                                        label="Edit"
                                                        icon={PencilLine}
                                                        onClick={() => openEditModal(customer)}
                                                    />
                                                    <ActionButton
                                                        label="Delete"
                                                        icon={Trash2}
                                                        tone="danger"
                                                        onClick={() =>
                                                            setCustomerPendingDelete(customer)
                                                        }
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {customers.last_page > 1 ? (
                        <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
                            <p className="text-xs text-gray-400">
                                Page {customers.current_page} of {customers.last_page}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {customers.links.map((link) => (
                                    <button
                                        key={`${link.label}-${link.url ?? "no-url"}-${link.active ? "active" : "inactive"}`}
                                        type="button"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url)}
                                        className={`rounded-xl px-3 py-2 text-sm transition ${link.active
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
                    ) : null}
                </section>
            </div>

            <Modal show={showFormModal} maxWidth="2xl" onClose={closeFormModal}>
                <form onSubmit={submitForm} className="p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                {editingCustomer ? "Edit customer" : "Add customer"}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Capture the contact details your team needs for
                                quotations, billing, and follow-ups.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={closeFormModal}
                            className="rounded-xl px-3 py-2 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                        >
                            Close
                        </button>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <Field label="Customer name" error={errors.name} required>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(event) => setData("name", event.target.value)}
                                className={inputClasses}
                                placeholder="Nadeesha Perera"
                            />
                        </Field>

                        <Field label="Customer type" error={errors.customer_type} required>
                            <select
                                value={data.customer_type}
                                onChange={(event) => setData("customer_type", event.target.value)}
                                className={inputClasses}
                            >
                                <option value="amateur">Amateur</option>
                                <option value="professional">Professional</option>
                            </select>
                        </Field>

                        <Field label="Phone" error={errors.phone}>
                            <input
                                type="text"
                                value={data.phone}
                                onChange={(event) => setData("phone", event.target.value)}
                                className={inputClasses}
                                placeholder="0771234567"
                            />
                        </Field>

                        <Field label="Email" error={errors.email}>
                            <input
                                type="email"
                                value={data.email}
                                onChange={(event) => setData("email", event.target.value)}
                                className={inputClasses}
                                placeholder="customer@example.com"
                            />
                        </Field>

                        <Field label="Address" error={errors.address}>
                            <input
                                type="text"
                                value={data.address}
                                onChange={(event) => setData("address", event.target.value)}
                                className={inputClasses}
                                placeholder="Colombo"
                            />
                        </Field>
                    </div>

                    <div className="mt-4">
                        <Field label="Notes" error={errors.notes}>
                            <textarea
                                value={data.notes}
                                onChange={(event) => setData("notes", event.target.value)}
                                className={`${inputClasses} min-h-28`}
                                placeholder="Preferred contact times, special requests, or client background"
                            />
                        </Field>
                    </div>

                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={closeFormModal}
                            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {processing
                                ? editingCustomer
                                    ? "Saving..."
                                    : "Creating..."
                                : editingCustomer
                                    ? "Save changes"
                                    : "Create customer"}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={Boolean(customerPendingDelete)}
                onClose={() => setCustomerPendingDelete(null)}
                onConfirm={confirmDelete}
                title="Delete customer"
                message={
                    customerPendingDelete
                        ? `Delete ${customerPendingDelete.name}? Customers linked to invoices or sales will be protected automatically.`
                        : "Delete this customer?"
                }
                confirmText="Delete customer"
            />
        </MainLayout>
    );
}

function StatCard({ icon: Icon, label, value }) {
    return (
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                        {value}
                    </p>
                </div>
                <div className="rounded-2xl bg-primary-50 p-3 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300">
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </div>
    );
}

function CustomerCard({ customer, onEdit, onDelete }) {
    return (
        <div className="rounded-2xl border border-gray-200 p-4 dark:border-slate-700">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        <Link
                            href={route("customers.show", customer.id)}
                            className="hover:text-primary-600 dark:hover:text-primary-300"
                        >
                            {customer.name}
                        </Link>
                    </h3>
                    <div className="mt-2">
                        <TypeBadge type={customer.customer_type} />
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {customer.notes || "No notes added"}
                    </p>
                </div>
                <div className="flex gap-2">
                    <ActionButton
                        label="Edit"
                        icon={PencilLine}
                        onClick={() => onEdit(customer)}
                    />
                    <ActionButton
                        label="Delete"
                        icon={Trash2}
                        tone="danger"
                        onClick={() => onDelete(customer)}
                    />
                </div>
            </div>

            <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <InfoLine icon={Phone} value={customer.phone || "No phone"} />
                <InfoLine icon={Mail} value={customer.email || "No email"} />
                <InfoLine icon={MapPin} value={customer.address || "No address"} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                <UsageBadge
                    label={`${customer.invoices_count} invoices`}
                    href={route("finance.invoices.index", { search: customer.name })}
                />
                <UsageBadge
                    label={`${customer.sales_count} sales`}
                    href={route("studio.sales.index", { search: customer.name })}
                />
            </div>
        </div>
    );
}

function EmptyState({ onCreate }) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="rounded-3xl bg-gray-100 p-4 text-gray-500 dark:bg-slate-700 dark:text-slate-300">
                <UserRound className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                No customers yet
            </h3>
            <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
                Start with your first customer record so the team can keep contact
                details and repeat business organized in one place.
            </p>
            <button
                type="button"
                onClick={onCreate}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-600"
            >
                <PlusCircle className="h-4 w-4" />
                Add first customer
            </button>
        </div>
    );
}

function TableHeading({ children, align = "left" }) {
    return (
        <th
            className={`px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 ${align === "right" ? "text-right" : "text-left"
                }`}
        >
            {children}
        </th>
    );
}

function ActionButton({ icon: Icon, label, tone = "default", onClick }) {
    const classes =
        tone === "danger"
            ? "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-900/20"
            : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700";

    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${classes}`}
        >
            <Icon className="h-4 w-4" />
            {label}
        </button>
    );
}

function UsageBadge({ label, href }) {
    if (href) {
        return (
            <Link
                href={href}
                className="inline-flex rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-750 dark:bg-primary-900/20 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors duration-150 cursor-pointer"
            >
                {label}
            </Link>
        );
    }
    return (
        <span className="inline-flex rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
            {label}
        </span>
    );
}

function TypeBadge({ type }) {
    const normalized = String(type || "amateur").toLowerCase() === "professional" ? "professional" : "amateur";

    const classes =
        normalized === "professional"
            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
            : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";

    return (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${classes}`}>
            {normalized === "professional" ? "Professional" : "Amateur"}
        </span>
    );
}

function InfoLine({ icon: Icon, value }) {
    return (
        <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-gray-400" />
            <span>{value}</span>
        </div>
    );
}

function Field({ children, label, error, required = false }) {
    return (
        <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {label}
                {required ? " *" : ""}
            </span>
            <div className="mt-2">{children}</div>
            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </label>
    );
}

const inputClasses =
    "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500";
