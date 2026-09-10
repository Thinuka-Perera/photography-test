import { Link } from "@inertiajs/react";
import { Plus, Trash2 } from "lucide-react";

const eventTypes = [
    { label: "Wedding", value: "wedding" },
    { label: "Party", value: "party" },
    { label: "Corporate Shoot", value: "corporate_shoot" },
    { label: "Other", value: "other" },
];

const statusOptions = [
    { label: "Draft", value: "draft" },
    { label: "Confirmed", value: "confirmed" },
    { label: "In Progress", value: "in_progress" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
];

const defaultPackageSections = [
    "Pre Shoot",
    "Drone Coverage",
    "Outdoor Session",
    "Additional Camera Crew",
];

function FieldError({ message }) {
    if (!message) {
        return null;
    }

    return <p className="mt-1 text-sm text-red-500">{message}</p>;
}

function makeCustomSection() {
    return {
        id: `section-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: "",
        rows: [{ label: "", value: "" }],
    };
}

function makePackageSection(name = "") {
    return {
        id: `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: name,
        amount: "",
        notes: "",
    };
}

function parsePackageAmount(value) {
    const parsed = parseFloat(String(value ?? "").trim());

    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizePackageSections(sections = []) {
    return sections.map((section) => ({
        ...section,
        amount: parsePackageAmount(section.amount),
    }));
}

export function normalizeEventFormPayload(formData) {
    return {
        ...formData,
        photography_packages: normalizePackageSections(formData.photography_packages),
        videography_packages: normalizePackageSections(formData.videography_packages),
    };
}

function sumPackageSectionAmounts(photographyPackages = [], videographyPackages = []) {
    return [...photographyPackages, ...videographyPackages].reduce(
        (sum, section) => sum + parsePackageAmount(section.amount),
        0,
    );
}

function computeAgreedAmount(photographyPackages, videographyPackages, templateBasePrice = 0) {
    const base = parsePackageAmount(templateBasePrice);
    const sectionsTotal = sumPackageSectionAmounts(photographyPackages, videographyPackages);
    const total = base + sectionsTotal;

    if (total <= 0) {
        return "";
    }

    return Number.isInteger(total) ? String(total) : total.toFixed(2);
}

function formatPackageOptionLabel(pkg) {
    const price = Number(pkg.total_price ?? 0).toLocaleString();
    const category = pkg.category?.trim();

    if (category) {
        return `${category} · ${pkg.name} - LKR ${price}`;
    }

    return `${pkg.name} - LKR ${price}`;
}

export default function EventForm({
    data,
    errors,
    onSubmit,
    processing,
    setData,
    packageOptions = [],
    submitLabel,
    cancelHref,
}) {
    const selectedPackageId = Number(data.selected_package_id || 0);
    const selectedPackage = packageOptions.find((pkg) => Number(pkg.id) === selectedPackageId);

    const getTemplateBasePrice = (packageId = selectedPackageId) => {
        const pkg = packageOptions.find((item) => Number(item.id) === Number(packageId || 0));

        return pkg?.total_price ?? 0;
    };

    const syncAgreedAmount = (photographyPackages, videographyPackages, templateBasePrice = getTemplateBasePrice()) => (
        computeAgreedAmount(photographyPackages, videographyPackages, templateBasePrice)
    );

    const applyPackage = (nextPackageId) => {
        const packageId = Number(nextPackageId || 0);
        const pkg = packageOptions.find((item) => Number(item.id) === packageId);

        if (!pkg) {
            setData((prev) => {
                const photographyPackages = Array.isArray(prev.photography_packages) ? prev.photography_packages : [];
                const videographyPackages = Array.isArray(prev.videography_packages) ? prev.videography_packages : [];

                return {
                    ...prev,
                    selected_package_id: nextPackageId,
                    total_amount: syncAgreedAmount(photographyPackages, videographyPackages, 0),
                };
            });

            return;
        }

        const packageNotes = [
            pkg.notes ? `Package Note: ${pkg.notes}` : null,
            Array.isArray(pkg.services) && pkg.services.length > 0
                ? `Included Services: ${pkg.services.map((service) => service?.name).filter(Boolean).join(", ")}`
                : null,
            Array.isArray(pkg.deliverables) && pkg.deliverables.length > 0
                ? `Deliverables: ${pkg.deliverables.filter(Boolean).join(", ")}`
                : null,
        ]
            .filter(Boolean)
            .join("\n");

        setData((prev) => {
            const photographyPackages = Array.isArray(prev.photography_packages) ? prev.photography_packages : [];
            const videographyPackages = Array.isArray(prev.videography_packages) ? prev.videography_packages : [];

            return {
                ...prev,
                selected_package_id: nextPackageId,
                total_amount: syncAgreedAmount(photographyPackages, videographyPackages, pkg.total_price ?? 0),
                notes: packageNotes ? [prev.notes, packageNotes].filter(Boolean).join("\n\n") : prev.notes,
            };
        });
    };

    // ── Custom Sections Management ──
    const customSections = Array.isArray(data.custom_sections) ? data.custom_sections : [];

    const addCustomSection = () => {
        setData("custom_sections", [...customSections, makeCustomSection()]);
    };

    const removeCustomSection = (sectionId) => {
        setData("custom_sections", customSections.filter((s) => s.id !== sectionId));
    };

    const updateCustomSectionTitle = (sectionId, title) => {
        setData("custom_sections", customSections.map((s) =>
            s.id === sectionId ? { ...s, title } : s
        ));
    };

    const addCustomSectionRow = (sectionId) => {
        setData("custom_sections", customSections.map((s) =>
            s.id === sectionId ? { ...s, rows: [...(s.rows || []), { label: "", value: "" }] } : s
        ));
    };

    const removeCustomSectionRow = (sectionId, rowIndex) => {
        setData("custom_sections", customSections.map((s) =>
            s.id === sectionId
                ? { ...s, rows: (s.rows || []).filter((_, i) => i !== rowIndex) }
                : s
        ));
    };

    const updateCustomSectionRow = (sectionId, rowIndex, field, value) => {
        setData("custom_sections", customSections.map((s) =>
            s.id === sectionId
                ? {
                    ...s,
                    rows: (s.rows || []).map((r, i) =>
                        i === rowIndex ? { ...r, [field]: value } : r
                    ),
                }
                : s
        ));
    };

    // ── Photography / Videography Package Sections ──
    const photographyPkgs = Array.isArray(data.photography_packages) ? data.photography_packages : [];
    const videographyPkgs = Array.isArray(data.videography_packages) ? data.videography_packages : [];

    const updatePackageSections = (type, updater) => {
        setData((prev) => {
            const photographyPackages = Array.isArray(prev.photography_packages) ? prev.photography_packages : [];
            const videographyPackages = Array.isArray(prev.videography_packages) ? prev.videography_packages : [];
            const key = type === "photography" ? "photography_packages" : "videography_packages";
            const current = type === "photography" ? photographyPackages : videographyPackages;
            const updated = updater(current);
            const nextPhotography = type === "photography" ? updated : photographyPackages;
            const nextVideography = type === "videography" ? updated : videographyPackages;

            return {
                ...prev,
                [key]: updated,
                total_amount: syncAgreedAmount(nextPhotography, nextVideography),
            };
        });
    };

    const addPackageSection = (type) => {
        updatePackageSections(type, (current) => [...current, makePackageSection()]);
    };

    const addPackageSectionPreset = (type, presetName) => {
        updatePackageSections(type, (current) => [...current, makePackageSection(presetName)]);
    };

    const removePackageSection = (type, sectionId) => {
        updatePackageSections(type, (current) => current.filter((s) => s.id !== sectionId));
    };

    const updatePackageSection = (type, sectionId, field, value) => {
        updatePackageSections(type, (current) =>
            current.map((s) => (s.id === sectionId ? { ...s, [field]: value } : s)),
        );
    };

    const inputCls = "mt-1 w-full rounded-xl border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

    return (
        <form onSubmit={onSubmit} className="w-full space-y-6">
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.event_type === "wedding" && (
                    <label className="block w-full md:col-span-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Wedding package template
                        </span>
                        <select
                            value={data.selected_package_id}
                            onChange={(e) => applyPackage(e.target.value)}
                            className={inputCls}
                            style={{ width: "100%" }}
                        >
                            <option value="">Select package (optional)</option>
                            {packageOptions.map((option) => (
                                <option key={option.id} value={option.id} style={{ width: "100%" }}>
                                    {formatPackageOptionLabel(option)}
                                </option>
                            ))}
                        </select>
                        {selectedPackage && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Selected: {formatPackageOptionLabel(selectedPackage)} ({selectedPackage.status})
                            </p>
                        )}
                    </label>
                )}

                <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Event title
                    </span>
                    <input
                        type="text"
                        value={data.title}
                        onChange={(e) => setData("title", e.target.value)}
                        className={inputCls}
                        placeholder="Nadeesha & Tharindu Wedding"
                    />
                    <FieldError message={errors.title} />
                </label>

                <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Event type
                    </span>
                    <select
                        value={data.event_type}
                        onChange={(e) => setData("event_type", e.target.value)}
                        className={inputCls}
                    >
                        {eventTypes.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <FieldError message={errors.event_type} />
                </label>

                <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Client name
                    </span>
                    <input
                        type="text"
                        value={data.client_name}
                        onChange={(e) => setData("client_name", e.target.value)}
                        className={inputCls}
                        placeholder="Nadeesha Perera"
                    />
                    <FieldError message={errors.client_name} />
                </label>

                <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Customer Phone Number
                    </span>
                    <input
                        type="text"
                        value={data.client_phone || ""}
                        onChange={(e) => setData("client_phone", e.target.value)}
                        className={inputCls}
                        placeholder="076-8785897"
                    />
                    <FieldError message={errors.client_phone} />
                </label>

                <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Event date
                    </span>
                    <input
                        type="date"
                        value={data.event_date}
                        onChange={(e) => setData("event_date", e.target.value)}
                        className={inputCls}
                    />
                    <FieldError message={errors.event_date} />
                </label>

                <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Location
                    </span>
                    <input
                        type="text"
                        value={data.location}
                        onChange={(e) => setData("location", e.target.value)}
                        className={inputCls}
                        placeholder="Colombo"
                    />
                    <FieldError message={errors.location} />
                </label>

                <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Wedding Location
                    </span>
                    <input
                        type="text"
                        value={data.wedding_location || ""}
                        onChange={(e) => setData("wedding_location", e.target.value)}
                        className={inputCls}
                        placeholder="Wedding venue address"
                    />
                    <FieldError message={errors.wedding_location} />
                </label>

                <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Saloon Location
                    </span>
                    <input
                        type="text"
                        value={data.saloon_location || ""}
                        onChange={(e) => setData("saloon_location", e.target.value)}
                        className={inputCls}
                        placeholder="Bride saloon address"
                    />
                    <FieldError message={errors.saloon_location} />
                </label>

                <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Photo Shoot Location
                    </span>
                    <input
                        type="text"
                        value={data.photo_shoot_location || ""}
                        onChange={(e) => setData("photo_shoot_location", e.target.value)}
                        className={inputCls}
                        placeholder="Outdoor photo shoot location"
                    />
                    <FieldError message={errors.photo_shoot_location} />
                </label>

                <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Status
                    </span>
                    <select
                        value={data.status}
                        onChange={(e) => setData("status", e.target.value)}
                        className={inputCls}
                    >
                        {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <FieldError message={errors.status} />
                </label>

                <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Expected guests
                    </span>
                    <input
                        type="number"
                        min="1"
                        value={data.expected_guests}
                        onChange={(e) => setData("expected_guests", e.target.value)}
                        className={inputCls}
                        placeholder="150"
                    />
                    <FieldError message={errors.expected_guests} />
                </label>

                <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Amount (LKR)
                    </span>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.total_amount}
                        onChange={(e) => setData("total_amount", e.target.value)}
                        className={inputCls}
                        placeholder="250000.00"
                    />
                    <FieldError message={errors.total_amount} />
                </label>
            </div>

            {/* ── Photography Package Sections ── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                        Photography Package
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                        {defaultPackageSections.map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => addPackageSectionPreset("photography", preset)}
                                className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40 transition-colors"
                            >
                                + {preset}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => addPackageSection("photography")}
                            className="px-2.5 py-1 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors inline-flex items-center gap-1"
                        >
                            <Plus className="w-3 h-3" /> Custom
                        </button>
                    </div>
                </div>

                {photographyPkgs.length > 0 && (
                    <div className="space-y-3">
                        {photographyPkgs.map((pkg) => (
                            <div
                                key={pkg.id}
                                className="rounded-xl border border-blue-200 dark:border-blue-800/40 bg-blue-50/30 dark:bg-blue-900/10 p-4 space-y-3"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <input
                                        type="text"
                                        value={pkg.name}
                                        onChange={(e) => updatePackageSection("photography", pkg.id, "name", e.target.value)}
                                        placeholder="Section name (e.g. Pre Shoot)"
                                        className="flex-1 rounded-lg border-gray-200 dark:border-slate-600 dark:bg-slate-800 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removePackageSection("photography", pkg.id)}
                                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={pkg.amount}
                                        onChange={(e) => updatePackageSection("photography", pkg.id, "amount", e.target.value)}
                                        placeholder="Amount (LKR)"
                                        className="rounded-lg border-gray-200 dark:border-slate-600 dark:bg-slate-800 text-sm"
                                    />
                                    <input
                                        type="text"
                                        value={pkg.notes || ""}
                                        onChange={(e) => updatePackageSection("photography", pkg.id, "notes", e.target.value)}
                                        placeholder="Notes"
                                        className="rounded-lg border-gray-200 dark:border-slate-600 dark:bg-slate-800 text-sm"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Videography Package Sections ── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
                        Videography Package
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                        {defaultPackageSections.map((preset) => (
                            <button
                                key={`video-${preset}`}
                                type="button"
                                onClick={() => addPackageSectionPreset("videography", preset)}
                                className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-medium hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/40 transition-colors"
                            >
                                + {preset}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => addPackageSection("videography")}
                            className="px-2.5 py-1 rounded-lg bg-purple-500 text-white text-xs font-medium hover:bg-purple-600 transition-colors inline-flex items-center gap-1"
                        >
                            <Plus className="w-3 h-3" /> Custom
                        </button>
                    </div>
                </div>

                {videographyPkgs.length > 0 && (
                    <div className="space-y-3">
                        {videographyPkgs.map((pkg) => (
                            <div
                                key={pkg.id}
                                className="rounded-xl border border-purple-200 dark:border-purple-800/40 bg-purple-50/30 dark:bg-purple-900/10 p-4 space-y-3"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <input
                                        type="text"
                                        value={pkg.name}
                                        onChange={(e) => updatePackageSection("videography", pkg.id, "name", e.target.value)}
                                        placeholder="Section name (e.g. Drone Coverage)"
                                        className="flex-1 rounded-lg border-gray-200 dark:border-slate-600 dark:bg-slate-800 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removePackageSection("videography", pkg.id)}
                                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={pkg.amount}
                                        onChange={(e) => updatePackageSection("videography", pkg.id, "amount", e.target.value)}
                                        placeholder="Amount (LKR)"
                                        className="rounded-lg border-gray-200 dark:border-slate-600 dark:bg-slate-800 text-sm"
                                    />
                                    <input
                                        type="text"
                                        value={pkg.notes || ""}
                                        onChange={(e) => updatePackageSection("videography", pkg.id, "notes", e.target.value)}
                                        placeholder="Notes"
                                        className="rounded-lg border-gray-200 dark:border-slate-600 dark:bg-slate-800 text-sm"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Dynamic Custom Detail Sections ── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                        Additional Detail Sections
                    </h3>
                    <button
                        type="button"
                        onClick={addCustomSection}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-colors inline-flex items-center gap-1"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add Section
                    </button>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Add custom sections like Transport, Enlargements, Additional Payments, etc.
                </p>

                {customSections.map((section) => (
                    <div
                        key={section.id}
                        className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800/40 overflow-hidden"
                    >
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 flex items-center justify-between gap-3">
                            <input
                                type="text"
                                value={section.title}
                                onChange={(e) => updateCustomSectionTitle(section.id, e.target.value)}
                                placeholder="Section Title (e.g. Transport, Enlargements)"
                                className="flex-1 rounded-lg border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                            />
                            <button
                                type="button"
                                onClick={() => removeCustomSection(section.id)}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 space-y-2">
                            {/* Header Row */}
                            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                                <div className="col-span-6">Description</div>
                                <div className="col-span-5">Value / Amount</div>
                                <div className="col-span-1"></div>
                            </div>
                            {(section.rows || []).map((row, rowIndex) => (
                                <div key={rowIndex} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-6">
                                        <input
                                            type="text"
                                            value={row.label}
                                            onChange={(e) => updateCustomSectionRow(section.id, rowIndex, "label", e.target.value)}
                                            placeholder="e.g. For Wedding, 16x24"
                                            className="w-full rounded-lg border-gray-200 dark:border-slate-600 dark:bg-slate-800 text-sm"
                                        />
                                    </div>
                                    <div className="col-span-5">
                                        <input
                                            type="text"
                                            value={row.value}
                                            onChange={(e) => updateCustomSectionRow(section.id, rowIndex, "value", e.target.value)}
                                            placeholder="0.00"
                                            className="w-full rounded-lg border-gray-200 dark:border-slate-600 dark:bg-slate-800 text-sm"
                                        />
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        <button
                                            type="button"
                                            onClick={() => removeCustomSectionRow(section.id, rowIndex)}
                                            className="text-red-400 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => addCustomSectionRow(section.id)}
                                className="mt-2 px-3 py-1.5 rounded-lg border border-dashed border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors inline-flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" /> Add Row
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Notes
                </span>
                <textarea
                    value={data.notes}
                    onChange={(e) => setData("notes", e.target.value)}
                    rows={5}
                    className={inputCls}
                    placeholder="Schedule, delivery notes, special handling, and other event details."
                />
                <FieldError message={errors.notes} />
            </label>

            <div className="flex items-center gap-3">
                <button
                    type="submit"
                    disabled={processing}
                    className="px-4 py-2.5 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-60"
                >
                    {submitLabel}
                </button>
                {cancelHref && (
                    <Link
                        href={cancelHref}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300"
                    >
                        Cancel
                    </Link>
                )}
            </div>
        </form>
    );
}
