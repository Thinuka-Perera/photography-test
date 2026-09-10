import MainLayout from "@/Layouts/MainLayout";
import { Head, router, useForm } from "@inertiajs/react";
import { Layers3, PencilLine, Plus, PlusCircle, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { generateProfessionalPDF, sharePDFOnWhatsApp } from "@/utils/pdfGenerator";

const defaultDeliverables = [
    "Edited digital gallery",
    "Client download link",
];

const blankPackageForm = {
    name: "",
    category: "General",
    event_type: "General",
    services: [],
    deliverables: [],
    total_price: "",
    notes: "",
    status: "active",
    products: [],
};

function isPackageActive(status) {
    return status === "active";
}

function parseTotalPrice(value) {
    const parsed = parseFloat(String(value ?? "").trim());

    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-LK", {
        style: "currency",
        currency: "LKR",
        maximumFractionDigits: 0,
    }).format(Number(value || 0));
}

function normalizeServices(services = []) {
    return services.map((service) => {
        if (typeof service === "string") {
            return { name: service };
        }

        return { name: service?.name ?? "" };
    });
}

export default function Index({ packages = [], stats = {}, shopSettings = {}, products = [] }) {
    const [selectedPackageId, setSelectedPackageId] = useState(null);
    const [selectedPackages, setSelectedPackages] = useState([]);
    const [activeProductDropdownIndex, setActiveProductDropdownIndex] = useState(null);

    const { data, setData, post, put, processing, errors } = useForm({
        name: "",
        category: "General",
        event_type: "General",
        services: [],
        deliverables: [],
        total_price: "",
        notes: "Adjust travel and timeline based on client requirements.",
        status: "active",
        products: [],
    });

    const isActive = isPackageActive(data.status);
    const statusHelperText = isActive
        ? "Active - This package is visible and available for events."
        : "Draft - This package is hidden and cannot be selected.";

    const packagesByCategory = useMemo(() => {
        const grouped = {};

        packages.forEach((pkg) => {
            const category = pkg.category?.trim() || "Uncategorized";
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(pkg);
        });

        return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    }, [packages]);

    const filteredProducts = useMemo(() => {
        if (activeProductDropdownIndex === null) return [];
        const searchVal = data.products[activeProductDropdownIndex]?.custom_name?.toLowerCase() || "";
        return products.filter(p =>
            (p.product_name || "").toLowerCase().includes(searchVal) ||
            (p.sku || "").toLowerCase().includes(searchVal)
        );
    }, [products, data.products, activeProductDropdownIndex]);

    const updateService = (index, value) => {
        const next = [...data.services];
        next[index] = { name: value };
        setData("services", next);
    };

    const updateDeliverable = (index, value) => {
        const next = [...data.deliverables];
        next[index] = value;
        setData("deliverables", next);
    };

    const addProductToPackageOptions = () => {
        setData("products", [
            ...(data.products || []),
            { variant_id: null, custom_name: "", price: "", quantity: 1, is_optional: false }
        ]);
    };

    const updatePackageProduct = (index, fieldOrMap, value) => {
        const next = [...(data.products || [])];
        if (typeof fieldOrMap === 'object' && fieldOrMap !== null) {
            next[index] = { ...next[index], ...fieldOrMap };
        } else {
            next[index] = {
                ...next[index],
                [fieldOrMap]: fieldOrMap === 'variant_id' ? (value === null ? null : Number(value)) : (fieldOrMap === 'quantity' ? Number(value) : (fieldOrMap === 'is_optional' ? Boolean(value) : value))
            };
        }
        setData("products", next);
    };

    const removePackageProduct = (index) => {
        const next = (data.products || []).filter((_, idx) => idx !== index);
        setData("products", next);
    };

    const loadPackage = (pkg) => {
        setSelectedPackageId(pkg.id);
        setData({
            name: pkg.name ?? "",
            category: pkg.category ?? "",
            event_type: pkg.event_type ?? "",
            services: normalizeServices(pkg.services ?? []).length > 0
                ? normalizeServices(pkg.services)
                : [{ name: "" }],
            deliverables: (pkg.deliverables ?? []).length > 0 ? pkg.deliverables : [""],
            total_price: pkg.total_price != null && pkg.total_price !== ""
                ? String(pkg.total_price)
                : "",
            notes: pkg.notes ?? "",
            status: isPackageActive(pkg.status) ? "active" : "draft",
            products: (pkg.products ?? []).map(p => {
                const prd = products.find(x => x.id === p.variant_id);
                return {
                    ...p,
                    custom_name: p.custom_name || (prd ? `${prd.product_name} - ${prd.sku}` : ""),
                    price: p.price != null ? String(p.price) : (prd ? String(prd.price) : ""),
                };
            }),
        });
    };

    const createNewPackage = (category = "") => {
        setSelectedPackageId(null);
        setData({
            ...blankPackageForm,
            category: category || "",
            services: [{ name: "" }],
            deliverables: [""],
            products: [],
        });
    };

    const savePackage = () => {
        const payload = { ...data, total_price: parseTotalPrice(data.total_price) };

        if (selectedPackageId) {
            put(route("photography.packages.update", selectedPackageId), { data: payload });
            return;
        }

        post(route("photography.packages.store"), {
            data: payload,
            onSuccess: () => createNewPackage(),
        });
    };

    const deletePackage = (id) => {
        router.delete(route("photography.packages.destroy", id), {
            onSuccess: () => {
                if (selectedPackageId === id) {
                    createNewPackage();
                }
            },
        });
    };

    const toggleSelect = (id) =>
        setSelectedPackages((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const handleShare = async () => {
        if (selectedPackages.length === 0) return;

        const selected = packages.filter((p) => selectedPackages.includes(p.id));

        const doc = await generateProfessionalPDF({
            type: "PACKAGES",
            number: "MULTIPLE",
            date: new Date().toLocaleDateString(),
            customerName: "Valued Customer",
            items: selected,
            shopSettings: {
                name: shopSettings.shop_name,
                address: shopSettings.shop_address,
                phone: shopSettings.shop_phone,
                email: shopSettings.shop_email,
                website: shopSettings.shop_website,
                facebook: shopSettings.shop_facebook,
                instagram: shopSettings.shop_instagram,
                whatsapp: shopSettings.shop_whatsapp,
                tagline: shopSettings.shop_tagline,
                footerText: shopSettings.shop_footer_text,
                logoUrl: shopSettings.shop_logo_url,
                paymentInfo: shopSettings.invoice_payment_info ?? '',
                termsConditions: shopSettings.invoice_terms ?? '',
                bank_account_no: shopSettings.bank_account_no ?? '',
                account_name: shopSettings.account_name ?? '',
                bank_details: shopSettings.bank_details ?? '',
            },
        });

        const msg = `Hello,\n\nPlease find the photography package options we discussed attached.\n\nThank you for choosing ${shopSettings.shop_name || "us"}!`;
        await sharePDFOnWhatsApp(doc, "Packages_Proposal.pdf", "", msg);
    };

    return (
        <MainLayout pageTitle="Package Customization">
            <Head title="Package Customization" />

            <div className="space-y-6">

                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Package Customization</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Build category-based photography packages with included services, deliverables, and a single total price.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => createNewPackage()}
                            className="px-4 py-2.5 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors inline-flex items-center gap-2">
                            <PlusCircle className="w-4 h-4" />
                            New package template
                        </button>

                        {selectedPackages.length > 0 && (
                            <button type="button" onClick={handleShare}
                                className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors inline-flex items-center gap-2 shadow-md">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                                Share Selected ({selectedPackages.length})
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard label="Total packages" value={stats.total_packages ?? 0} />
                    <StatCard label="Draft packages" value={stats.draft_packages ?? 0} />
                    <StatCard label="Active packages" value={stats.active_packages ?? 0} />
                    <StatCard label="Package categories" value={stats.package_categories ?? 0} />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

                    <div className="xl:col-span-2 space-y-6">

                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Layers3 className="w-5 h-5 text-primary-500" />
                                <h3 className="font-semibold text-gray-900 dark:text-white">Saved packages</h3>
                            </div>

                            {packages.length === 0 && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">No packages saved yet.</p>
                            )}

                            <div className="space-y-6">
                                {packagesByCategory.map(([category, categoryPackages]) => (
                                    <div key={category}>
                                        <div className="flex items-center justify-between gap-2 mb-3">
                                            <h4 className="text-sm font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-300">
                                                {category}
                                            </h4>
                                            <button
                                                type="button"
                                                onClick={() => createNewPackage(category)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-primary-600 dark:text-primary-300 border border-primary-200 dark:border-primary-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Add Package
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {categoryPackages.map((pkg) => (
                                                <div key={pkg.id}
                                                    className={`rounded-xl border p-4 transition-all ${selectedPackages.includes(pkg.id)
                                                        ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10"
                                                        : "border-gray-100 dark:border-slate-700"
                                                        }`}>
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-start gap-3">
                                                            <input type="checkbox"
                                                                checked={selectedPackages.includes(pkg.id)}
                                                                onChange={() => toggleSelect(pkg.id)}
                                                                className="mt-1 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                            />
                                                            <div>
                                                                <p className="font-medium text-gray-900 dark:text-white">{pkg.name}</p>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400">{pkg.event_type}</p>
                                                                {pkg.products && pkg.products.length > 0 && (
                                                                    <div className="mt-2 text-xs space-y-1">
                                                                        <p className="font-semibold text-slate-800 dark:text-slate-350">Products:</p>
                                                                        <ul className="list-disc list-inside text-gray-500 dark:text-gray-405 space-y-0.5 pl-1">
                                                                            {pkg.products.map((p, pIdx) => {
                                                                                const prd = products.find(x => x.id === p.variant_id);
                                                                                return (
                                                                                    <li key={pIdx} className="truncate">
                                                                                        {prd ? `${prd.product_name} (${prd.sku})` : (p.custom_name || `Product variant #${p.variant_id}`)} x{p.quantity} {p.price != null && p.price !== "" ? `(${formatCurrency(p.price)})` : ""} {p.is_optional ? "(Opt)" : "(Inc)"}
                                                                                    </li>
                                                                                );
                                                                            })}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                                                            {pkg.status}
                                                        </span>
                                                    </div>
                                                    <div className="mt-3 flex items-center justify-end text-sm">
                                                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(pkg.total_price)}</span>
                                                    </div>
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        <button type="button" onClick={() => loadPackage(pkg)}
                                                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-gray-300">
                                                            <PencilLine className="w-4 h-4" /> Modify
                                                        </button>
                                                        <button type="button" onClick={() => deletePackage(pkg.id)}
                                                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-sm text-red-700 dark:border-red-900/50 dark:text-red-300">
                                                            <Trash2 className="w-4 h-4" /> Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Sparkles className="w-5 h-5 text-primary-500" />
                                <h3 className="font-semibold text-gray-900 dark:text-white">Package summary</h3>
                            </div>
                            <div className="space-y-3 text-sm">
                                <SummaryRow label="Category" value={data.category || "—"} />
                                <SummaryRow label="Services" value={`${data.services.filter((s) => s.name?.trim()).length} included`} />
                                <SummaryRow label="Physical Products" value={`${(data.products || []).length} linked`} />
                                <SummaryRow label="Total price" value={formatCurrency(parseTotalPrice(data.total_price))} highlight />
                            </div>
                        </div>
                    </div>

                    <div className="xl:col-span-3 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
                        <div className="flex items-center justify-between gap-3 mb-5">
                            <h3 className="font-semibold text-gray-900 dark:text-white">Package builder</h3>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {selectedPackageId ? "Editing existing package" : "Creating new package"}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <Field label="Package name" error={errors.name}>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData("name", e.target.value)}
                                        className="mt-1 w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                        placeholder="Enter package name..."
                                    />
                                </Field>
                            </div>

                            <Field label="Total package price" error={errors.total_price}>
                                <input
                                    type="number"
                                    min="0"
                                    value={data.total_price}
                                    onChange={(e) => setData("total_price", e.target.value)}
                                    className="mt-1 w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                            </Field>

                            <div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
                                <div className="mt-2 flex items-center gap-3">
                                    <Toggle
                                        checked={isActive}
                                        onChange={(checked) => setData("status", checked ? "active" : "draft")}
                                    />
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {isActive ? "Active" : "Draft"}
                                    </span>
                                </div>
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{statusHelperText}</p>
                                <FieldError message={errors.status} />
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <h4 className="font-medium text-gray-900 dark:text-white">Linked Inventory Products</h4>
                                <button type="button" onClick={addProductToPackageOptions}
                                    className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-700/40 text-sm text-gray-700 dark:text-gray-300">
                                    Add product
                                </button>
                            </div>
                            <FieldError message={errors.products} />
                            {(data.products || []).length === 0 ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400 italic">No physical inventory products linked to this package yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {(data.products || []).map((p, idx) => (
                                        <div key={`prod-${idx}`}
                                            className="grid grid-cols-12 gap-3 items-center rounded-xl border border-gray-100 dark:border-slate-700 p-3 bg-slate-50/50 dark:bg-slate-900/20">
                                            <div className="col-span-6 relative">
                                                <label className="text-xs text-gray-505 dark:text-gray-400 block mb-1">Select Product Variant</label>
                                                <input
                                                    type="text"
                                                    value={p.custom_name || ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const matched = products.find(prod => `${prod.product_name} - ${prod.sku}`.toLowerCase() === val.toLowerCase() || prod.sku.toLowerCase() === val.toLowerCase());
                                                        if (matched) {
                                                            updatePackageProduct(idx, {
                                                                variant_id: matched.id,
                                                                custom_name: `${matched.product_name} - ${matched.sku}`,
                                                                price: matched.price != null ? String(matched.price) : "",
                                                            });
                                                        } else {
                                                            updatePackageProduct(idx, {
                                                                variant_id: null,
                                                                custom_name: val,
                                                            });
                                                        }
                                                    }}
                                                    onFocus={() => setActiveProductDropdownIndex(idx)}
                                                    onBlur={() => setTimeout(() => setActiveProductDropdownIndex(null), 200)}
                                                    className="w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                                                    placeholder="Type to search or enter manual product..."
                                                    autoComplete="off"
                                                />
                                                {activeProductDropdownIndex === idx && filteredProducts.length > 0 && (
                                                    <ul className="absolute z-10 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl mt-1 max-h-48 overflow-y-auto shadow-lg">
                                                        {filteredProducts.map((prod) => (
                                                            <li
                                                                key={`prod-opt-${prod.id}`}
                                                                className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer text-gray-900 dark:text-white text-sm"
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    updatePackageProduct(idx, {
                                                                        variant_id: prod.id,
                                                                        custom_name: `${prod.product_name} - ${prod.sku}`,
                                                                        price: prod.price != null ? String(prod.price) : "",
                                                                    });
                                                                    setActiveProductDropdownIndex(null);
                                                                }}
                                                            >
                                                                {prod.product_name} - {prod.sku} ({formatCurrency(prod.price)})
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                                <FieldError message={errors[`products.${idx}.variant_id`]} />
                                            </div>

                                            <div className="col-span-3">
                                                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Price</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={p.price || ""}
                                                    onChange={(e) => updatePackageProduct(idx, "price", e.target.value)}
                                                    className="w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                                                    placeholder="0.00"
                                                />
                                                <FieldError message={errors[`products.${idx}.price`]} />
                                            </div>

                                            <div className="col-span-2">
                                                <label className="text-xs text-gray-505 dark:text-gray-400 block mb-1">Quantity</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={p.quantity}
                                                    onChange={(e) => updatePackageProduct(idx, "quantity", e.target.value)}
                                                    className="w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-sm"
                                                />
                                                <FieldError message={errors[`products.${idx}.quantity`]} />
                                            </div>

                                            <div className="col-span-1 flex justify-end pt-5">
                                                <button type="button" onClick={() => removePackageProduct(idx)}
                                                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 transition-colors">✕</button>
                                            </div>

                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                            <textarea rows={4} value={data.notes} onChange={(e) => setData("notes", e.target.value)}
                                className="mt-1 w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                            <FieldError message={errors.notes} />
                        </div>

                        {Object.keys(errors).length > 0 && (
                            <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30">
                                <p className="text-sm font-medium text-red-700 dark:text-red-400">Please fix the following errors:</p>
                                <ul className="mt-2 text-sm text-red-600 dark:text-red-300 space-y-1">
                                    {Object.entries(errors).map(([field, message]) => (
                                        <li key={field}>• {message}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="mt-6">
                            <button type="button" onClick={savePackage} disabled={processing}
                                className="px-4 py-2.5 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-60 inline-flex items-center gap-2">
                                {processing && (
                                    <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                )}
                                {processing ? "Saving..." : "Save package"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

function StatCard({ label, value }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
    );
}

function SummaryRow({ label, value, highlight = false }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400">{label}</span>
            <span className={highlight ? "font-semibold text-primary-500" : "font-medium text-gray-900 dark:text-white"}>
                {value}
            </span>
        </div>
    );
}

function Field({ label, children, error }) {
    return (
        <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
            {children}
            <FieldError message={error} />
        </label>
    );
}

function FieldError({ message }) {
    if (!message) return null;
    return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

function Toggle({ checked, onChange }) {
    return (
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
                type="checkbox"
                className="sr-only peer"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-500" />
        </label>
    );
}
