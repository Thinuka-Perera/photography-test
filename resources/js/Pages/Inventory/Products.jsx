import MainLayout from "@/Layouts/MainLayout";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import {
    ArrowLeft,
    Barcode,
    Edit2,
    GripVertical,
    ImagePlus,
    LayoutGrid,
    List,
    Package,
    PlusCircle,
    Save,
    Search,
    Trash2,
    X,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import ConfirmModal from "@/Components/ConfirmModal";
import useActiveShop from "@/hooks/useActiveShop";
import BarcodePrintModal from "@/Components/Inventory/BarcodePrintModal";

// ─────────────────────────────────────────────
// VariantRow — one row in the "Add Variants" table
// Handles a single variant's size, grade, SKU, prices
// ─────────────────────────────────────────────
function VariantRow({
    variant,
    index,
    onChange,
    onRemove,
    categoryPrefix,
    labels = { size: "Size", grade: "Grade / Type" },
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    isDragOver,
    isDragging,
}) {
    // Auto-preview SKU as the user types size/grade (mirrors model boot logic)
    const previewSku = () => {
        const prefix = categoryPrefix || "GEN";
        const size = variant.size
            ? variant.size.toUpperCase().replace(/\s/g, "")
            : "STD";
        const grade = variant.grade_type
            ? variant.grade_type.toUpperCase().replace(/[^A-Z0-9]/g, "")
            : "STD";
        return `${prefix}-${size}-GRA-${grade}`;
    };

    return (
        <tr
            className={`group transition-colors ${isDragging
                ? "opacity-50 bg-primary-50/80 dark:bg-primary-900/20"
                : isDragOver
                    ? "bg-primary-50 dark:bg-primary-900/15 ring-1 ring-inset ring-primary-300 dark:ring-primary-700"
                    : "hover:bg-gray-50 dark:hover:bg-slate-700/30"
                }`}
            onDragOver={(e) => {
                e.preventDefault();
                onDragOver?.(index);
            }}
            onDrop={(e) => {
                e.preventDefault();
                onDrop?.(index);
            }}
            onDragEnd={() => onDragEnd?.()}
        >
            {/* Drag handle */}
            <td className="px-2 py-3 w-10 align-middle">
                <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", String(index));
                        onDragStart?.(index);
                    }}
                    className="flex h-9 w-9 cursor-grab items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:cursor-grabbing dark:hover:bg-slate-700 dark:hover:text-gray-200"
                    title="Drag to reorder"
                    aria-label={`Reorder variant row ${index + 1}`}
                >
                    <GripVertical className="h-4 w-4" />
                </button>
            </td>

            {/* Size */}
            <td className="px-4 py-3">
                <input
                    type="text"
                    value={variant.size || ""}
                    onChange={(e) => onChange(index, "size", e.target.value)}
                    placeholder={labels.size === "Color / Pattern" ? "e.g. Cyan" : "e.g. 4x6"}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
            </td>

            {/* Grade */}
            <td className="px-4 py-3">
                <input
                    type="text"
                    value={variant.grade_type || ""}
                    onChange={(e) =>
                        onChange(index, "grade_type", e.target.value)
                    }
                    placeholder={labels.grade === "Compatible Machine" ? "e.g. L18050" : "e.g. A"}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
            </td>

            {/* SKU — shows auto-preview unless user typed a custom one */}
            <td className="px-4 py-3">
                <div className="relative">
                    <input
                        type="text"
                        value={variant.sku || ""}
                        onChange={(e) =>
                            onChange(index, "sku", e.target.value)
                        }
                        placeholder={previewSku()}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {/* Show preview hint if no custom SKU typed */}
                    {!variant.sku && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                            auto
                        </span>
                    )}
                </div>
            </td>

            {/* Barcode — shows auto-preview unless user typed a custom one */}
            <td className="px-4 py-3">
                <div className="relative">
                    <input
                        type="text"
                        value={variant.barcode || ""}
                        onChange={(e) =>
                            onChange(index, "barcode", e.target.value)
                        }
                        placeholder={previewSku().replace(/-/g, "")}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {/* Show preview hint if no custom Barcode typed */}
                    {!variant.barcode && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                            auto
                        </span>
                    )}
                </div>
            </td>

            {/* Cost Price — required by DB validation (numeric ≥ 0) */}
            <td className="px-4 py-3">
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        LKR
                    </span>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={variant.cost_price ?? ""}
                        onChange={(e) =>
                            onChange(index, "cost_price", e.target.value)
                        }
                        placeholder="0.00"
                        required
                        aria-required="true"
                        className={`w-full pl-10 pr-3 py-2 rounded-lg border ${variant.cost_price === "" ||
                            variant.cost_price === null ||
                            variant.cost_price === undefined
                            ? "border-red-200 dark:border-red-700/50"
                            : "border-gray-200 dark:border-slate-600"
                            } bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
                    />
                </div>
            </td>

            {/* Selling Price — required by DB validation (numeric ≥ 0) */}
            <td className="px-4 py-3">
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        LKR
                    </span>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={variant.selling_price ?? ""}
                        onChange={(e) =>
                            onChange(index, "selling_price", e.target.value)
                        }
                        placeholder="0.00"
                        required
                        aria-required="true"
                        className={`w-full pl-10 pr-3 py-2 rounded-lg border ${variant.selling_price === "" ||
                            variant.selling_price === null ||
                            variant.selling_price === undefined
                            ? "border-red-200 dark:border-red-700/50"
                            : "border-gray-200 dark:border-slate-600"
                            } bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent`}
                    />
                </div>
            </td>

            {/* Remove row */}
            <td className="px-4 py-3">
                <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </td>
        </tr>
    );
}

// ─────────────────────────────────────────────
// ProductCard — summary card shown in product list
// ─────────────────────────────────────────────
function ProductCard({ product, onEdit, onDelete, onBarcode }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow overflow-hidden">
            {/* Product image — shown if available, fallback icon otherwise */}
            {product.image_url ? (
                <div className="w-full h-52 bg-gray-50 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-contain"
                    />
                </div>
            ) : (
                <div className="w-full h-52 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                    <Package className="w-8 h-8 text-gray-300 dark:text-slate-600" />
                </div>
            )}

            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            {product.name}
                        </h3>
                        <p className="text-xs text-gray-400">
                            {product.category?.name} · {product.uom}{product.location ? ` · Box: ${product.location}` : ""}
                        </p>
                        {product.description && (
                            <p className="mt-1 text-xs text-gray-500 line-clamp-1 italic">
                                {product.description}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                            onClick={() => onBarcode?.(product)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-550 hover:text-primary-500 transition-colors"
                            title="Barcode label options"
                        >
                            <Barcode className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onEdit(product)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 hover:text-primary-500 transition-colors"
                            title="Edit product"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onDelete(product)}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-500 transition-colors"
                            title="Delete product"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Variant chips */}
                <div className="mt-4 flex flex-wrap gap-2">
                    {product.variants?.slice(0, 6).map((v) => {
                        const stock = v.inventory?.current_stock ?? 0;
                        const threshold = v.inventory?.low_stock_threshold ?? 10;
                        const isLow = stock < threshold;
                        return (
                            <span
                                key={v.id}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${isLow
                                    ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                                    : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300"
                                    }`}
                            >
                                <Barcode className="w-3 h-3" />
                                {v.sku} · {[v.size, v.grade_type].filter(Boolean).join(" / ")}
                                <span className="font-bold ml-1">({stock})</span>
                            </span>
                        );
                    })}
                    {product.variants?.length > 6 && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-500">
                            +{product.variants.length - 6} more
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// ProductListRow — compact table row for list view
// Shows image thumbnail, name, category, variants count, and actions
// ─────────────────────────────────────────────
function ProductListRow({ product, onEdit, onDelete, onBarcode }) {
    const totalStock = product.variants?.reduce(
        (sum, v) => sum + Number(v.inventory?.current_stock ?? 0), 0
    ) ?? 0;
    const hasLow = product.variants?.some(
        (v) => (v.inventory?.current_stock ?? 0) < (v.inventory?.low_stock_threshold ?? 10)
    );

    return (
        <tr className="group hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
            {/* Thumbnail + Name */}
            <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-slate-700">
                        {product.image_url ? (
                            <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-contain bg-gray-50 dark:bg-slate-700"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-4 h-4 text-gray-400" />
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{product.name}</p>
                        <p className="text-xs text-gray-400">{product.category?.name}</p>
                    </div>
                </div>
            </td>

            {/* Location */}
            <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                {product.location || "-"}
            </td>

            {/* UOM */}
            <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                {product.uom}
            </td>

            {/* Variants */}
            <td className="px-5 py-3">
                <div className="flex flex-wrap gap-1">
                    {product.variants?.slice(0, 4).map((v) => {
                        const stock = v.inventory?.current_stock ?? 0;
                        const isLow = stock < (v.inventory?.low_stock_threshold ?? 10);
                        return (
                            <span
                                key={v.id}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isLow
                                    ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                                    : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300"
                                    }`}
                            >
                                {[v.size, v.grade_type].filter(Boolean).join("/") || v.sku}
                                <span className="font-bold">·{stock}</span>
                            </span>
                        );
                    })}
                    {product.variants?.length > 4 && (
                        <span className="text-xs text-gray-400 self-center">
                            +{product.variants.length - 4}
                        </span>
                    )}
                </div>
            </td>

            {/* Total stock */}
            <td className="px-5 py-3">
                <span className={`font-bold text-sm ${hasLow ? "text-red-500" : "text-gray-900 dark:text-white"
                    }`}>{totalStock}</span>
                <span className="text-xs text-gray-400 ml-1">{product.uom}s</span>
            </td>

            {/* Actions */}
            <td className="px-5 py-3">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onBarcode?.(product)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-primary-500 transition-colors"
                        title="Barcode label options"
                    >
                        <Barcode className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onEdit(product)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-primary-500 transition-colors"
                        title="Edit product"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onDelete(product)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete product"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

// ─────────────────────────────────────────────
// ProductForm — create or edit a product with dynamic variants
// ─────────────────────────────────────────────
function ProductForm({ categories, product, onSuccess, onCancel }) {
    const { activeShop } = useActiveShop();
    const isEdit = !!product;

    // Derive the category SKU prefix for the auto-preview
    const getCategoryPrefix = (catId) => {
        const cat = categories.find((c) => c.id === parseInt(catId));
        if (!cat) return "GEN";
        return cat.name
            .toUpperCase()
            .replace(/[^A-Z]/g, "")
            .substring(0, 3);
    };

    const { data, setData, post, processing, errors, transform } = useForm({
        name: product?.name ?? "",
        category_id: product?.category_id ?? "",
        description: product?.description ?? "",
        uom: product?.uom ?? "unit",
        location: product?.location ?? "",
        image: null, // File object — null means keep existing
        variants: product?.variants?.map((v) => ({
            id: v.id,
            size: v.size ?? "",
            grade_type: v.grade_type ?? "",
            sku: v.sku ?? "",
            barcode: v.barcode ?? "",
            cost_price: v.cost_price ?? "",
            selling_price: v.selling_price ?? "",
        })) ?? [
                { size: "", grade_type: "", sku: "", barcode: "", cost_price: "", selling_price: "" },
            ],
    });

    // Local state for the image preview URL shown in the UI
    const [imagePreview, setImagePreview] = useState(
        product?.image_url ?? null
    );
    const fileInputRef = useRef(null);
    const [dragIndex, setDragIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);

    // Handle image file selection
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setData("image", file);
        // Show a local preview immediately without uploading
        setImagePreview(URL.createObjectURL(file));
    };

    // Remove the selected image
    const clearImage = () => {
        setData("image", null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Add a blank variant row
    const addVariant = () => {
        setData("variants", [
            ...data.variants,
            { size: "", grade_type: "", sku: "", barcode: "", cost_price: "", selling_price: "" },
        ]);
    };

    // Update a specific variant field
    const updateVariant = (index, field, value) => {
        const updated = [...data.variants];
        updated[index] = { ...updated[index], [field]: value };
        setData("variants", updated);
    };

    // Remove a variant row (min 1 row)
    const removeVariant = (index) => {
        if (data.variants.length === 1) return;
        setData(
            "variants",
            data.variants.filter((_, i) => i !== index)
        );
    };

    const reorderVariants = (fromIndex, toIndex) => {
        if (fromIndex === null || fromIndex === toIndex) return;
        const updated = [...data.variants];
        const [moved] = updated.splice(fromIndex, 1);
        updated.splice(toIndex, 0, moved);
        setData("variants", updated);
    };

    const handleVariantDragStart = (index) => {
        setDragIndex(index);
        setDragOverIndex(index);
    };

    const handleVariantDragOver = (index) => {
        if (dragIndex === null || dragIndex === index) return;
        setDragOverIndex(index);
    };

    const handleVariantDrop = (index) => {
        if (dragIndex !== null) {
            reorderVariants(dragIndex, index);
        }
        setDragIndex(null);
        setDragOverIndex(null);
    };

    const handleVariantDragEnd = () => {
        setDragIndex(null);
        setDragOverIndex(null);
    };

    /**
     * Front-line validation that mirrors the server-side rules in
     * App\Http\Controllers\ProductController. Keeps the user from spending
     * a network round-trip just to be told a numeric field is empty.
     *
     * Returns an array of human-readable messages — empty array means the
     * payload is shaped correctly to be accepted by the controller.
     *
     * NOTE: This is a *belt-and-braces* check on top of:
     *   - HTML `required` / `min` attributes on the inputs themselves
     *   - Laravel `required|numeric|min:0` validation on the server
     *
     * @returns {string[]}
     */
    const collectValidationErrors = () => {
        const issues = [];
        if (!data.name?.trim()) issues.push("Product name is required.");
        if (!data.category_id) issues.push("A category must be selected.");
        if (!data.uom) issues.push("Unit of measure is required.");
        if (!Array.isArray(data.variants) || data.variants.length === 0) {
            issues.push("At least one variant is required.");
        } else {
            data.variants.forEach((v, idx) => {
                const row = `Variant #${idx + 1}`;
                const cost = v.cost_price;
                const sell = v.selling_price;
                if (cost === "" || cost === null || cost === undefined) {
                    issues.push(`${row}: cost price is required.`);
                } else if (Number(cost) < 0 || Number.isNaN(Number(cost))) {
                    issues.push(`${row}: cost price must be a number ≥ 0.`);
                }
                if (sell === "" || sell === null || sell === undefined) {
                    issues.push(`${row}: selling price is required.`);
                } else if (Number(sell) < 0 || Number.isNaN(Number(sell))) {
                    issues.push(`${row}: selling price must be a number ≥ 0.`);
                }
            });
        }
        return issues;
    };

    const validationIssues = collectValidationErrors();
    const isFormValid = validationIssues.length === 0;

    // Whether to surface the validation summary banner. We only reveal it
    // after the user makes a submit attempt, so a freshly opened form does
    // not greet them with red text.
    const [showValidationSummary, setShowValidationSummary] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!isFormValid) {
            setShowValidationSummary(true);
            return;
        }

        if (isEdit) {
            // Send a plain POST and let Laravel spoof PUT via _method.
            // This avoids relying on true PUT requests at the web server layer.
            router.post(route("products.update.post", { shop: activeShop?.slug }), {
                product_id: product.id,
                shop: activeShop?.slug,
                ...data,
            }, {
                forceFormData: true,
                onSuccess,
            });
        } else {
            post(route("products.store", { shop: activeShop?.slug }), {
                shop: activeShop?.slug,
                forceFormData: true,
                onSuccess,
            });
        }
    };

    const getVariantColumnLabels = (uom) => {
        switch (uom) {
            case "sheet":
            case "roll":
                return { size: "Paper Size", grade: "Paper Grade / GSM" };
            case "bottle":
                return { size: "Color / Pattern", grade: "Compatible Machine" };
            case "box":
            case "pack":
                return { size: "Pack Size", grade: "Type / Grade" };
            case "unit":
            default:
                return { size: "Size / Dimensions", grade: "Grade / Type" };
        }
    };

    const variantLabels = getVariantColumnLabels(data.uom);
    const categoryPrefix = getCategoryPrefix(data.category_id);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product base fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Product Name *
                    </label>
                    <input
                        type="text"
                        value={data.name}
                        onChange={(e) => setData("name", e.target.value)}
                        placeholder="e.g. Photo Frame"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                    />
                    {errors.name && (
                        <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                    )}
                </div>

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Category *
                    </label>
                    <select
                        value={data.category_id}
                        onChange={(e) => setData("category_id", e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                    >
                        <option value="">Select a category</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name} ({cat.type})
                            </option>
                        ))}
                    </select>
                    {errors.category_id && (
                        <p className="mt-1 text-xs text-red-500">{errors.category_id}</p>
                    )}
                </div>

                {/* Unit of Measure */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Unit of Measure (UOM)
                    </label>
                    <select
                        value={data.uom}
                        onChange={(e) => setData("uom", e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                        <option value="unit">unit</option>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="meter">meter</option>
                        <option value="liter">liter</option>
                        <option value="sheet">sheet</option>
                        <option value="bottle">bottle</option>
                        <option value="roll">roll</option>
                        <option value="box">box</option>
                        <option value="pack">pack</option>
                    </select>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Description
                    </label>
                    <input
                        type="text"
                        value={data.description}
                        onChange={(e) => setData("description", e.target.value)}
                        placeholder="Optional notes..."
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                </div>

                {/* Location (Box) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Location (Box)
                    </label>
                    <input
                        type="text"
                        value={data.location}
                        onChange={(e) => setData("location", e.target.value)}
                        placeholder="e.g. Box A1, Shelf 3..."
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {errors.location && (
                        <p className="mt-1 text-xs text-red-500">{errors.location}</p>
                    )}
                </div>
            </div>

            {/* ── Product Image Upload ── */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Product Image
                    <span className="ml-2 text-xs font-normal text-gray-400">Optional — JPG, PNG, WEBP · Max 2MB</span>
                </label>

                <div className="flex items-start gap-5">
                    {/* Preview box */}
                    <div className="relative flex-shrink-0 w-32 h-32 rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 flex items-center justify-center">
                        {imagePreview ? (
                            <>
                                <img
                                    src={imagePreview}
                                    alt="Product preview"
                                    className="w-full h-full object-contain"
                                />
                                {/* Remove button */}
                                <button
                                    type="button"
                                    onClick={clearImage}
                                    className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-1 text-gray-400 p-3">
                                <ImagePlus className="w-7 h-7" />
                                <span className="text-xs text-center">No image</span>
                            </div>
                        )}
                    </div>

                    {/* Upload button and hint */}
                    <div className="flex flex-col gap-3 justify-center h-32">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/jpg,image/webp"
                            className="hidden"
                            onChange={handleImageChange}
                            id="product-image-input"
                        />
                        <label
                            htmlFor="product-image-input"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                            <ImagePlus className="w-4 h-4" />
                            {imagePreview ? "Change Image" : "Choose Image"}
                        </label>
                        <p className="text-xs text-gray-400">
                            This image will appear on the product card
                            {!isEdit && " after saving."}.
                            {isEdit && imagePreview === `/storage/${product?.image}` && (
                                <span className="block text-amber-500 mt-1">Choosing a new image will replace the existing one.</span>
                            )}
                        </p>
                        {errors.image && (
                            <p className="text-xs text-red-500">{errors.image}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Variants section */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Variants (Size + Grade combinations)
                    </label>
                    <button
                        type="button"
                        onClick={addVariant}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-500 hover:text-primary-600 transition-colors"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Add Variant
                    </button>
                </div>
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                    Drag the grip icon on each row to change display order (e.g. put 5×6 before 6×7).
                </p>

                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="w-10 px-2 py-3" aria-label="Reorder" />
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-[16%] min-w-[140px]">{variantLabels.size}</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-[16%] min-w-[140px]">{variantLabels.grade}</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-[20%] min-w-[150px]">
                                    <div className="flex items-center gap-1">
                                        SKU
                                        <span className="text-gray-400 font-normal normal-case">(optional)</span>
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-[20%] min-w-[150px]">
                                    <div className="flex items-center gap-1">
                                        Barcode
                                        <span className="text-gray-400 font-normal normal-case">(optional)</span>
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-[14%] min-w-[120px]">Cost Price</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-[14%] min-w-[120px]">Selling Price</th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                            {data.variants.map((variant, index) => (
                                <VariantRow
                                    key={variant.id ?? `new-${index}`}
                                    index={index}
                                    variant={variant}
                                    categoryPrefix={categoryPrefix}
                                    labels={variantLabels}
                                    onChange={updateVariant}
                                    onRemove={removeVariant}
                                    onDragStart={handleVariantDragStart}
                                    onDragOver={handleVariantDragOver}
                                    onDrop={handleVariantDrop}
                                    onDragEnd={handleVariantDragEnd}
                                    isDragging={dragIndex === index}
                                    isDragOver={dragOverIndex === index && dragIndex !== index}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                {data.category_id && (
                    <p className="mt-2 text-xs text-gray-400">
                        <span className="font-mono">{categoryPrefix}</span> prefix will be used in auto-generated SKUs for this category.
                    </p>
                )}
            </div>

            {/* Validation summary — surfaces only after a failed submit attempt
                and lists every DB-mandatory field that is still missing. */}
            {showValidationSummary && !isFormValid && (
                <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-900/20"
                >
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                        Please complete the required fields before saving:
                    </p>
                    <ul className="mt-1 list-disc pl-5 text-xs text-red-600 dark:text-red-400">
                        {validationIssues.map((msg, i) => (
                            <li key={i}>{msg}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-medium"
                >
                    <X className="w-4 h-4" />
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={processing || !isFormValid}
                    title={
                        !isFormValid
                            ? "Fill all required fields to enable saving"
                            : undefined
                    }
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save className="w-4 h-4" />
                    {processing
                        ? "Saving..."
                        : isEdit
                            ? "Update Product"
                            : "Create Product"}
                </button>

                {/* Subtle hint when the button is disabled, so the user knows
                    *why* it isn't clickable instead of feeling the form is broken. */}
                {!isFormValid && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                        {validationIssues.length} required field
                        {validationIssues.length === 1 ? "" : "s"} missing
                    </span>
                )}
            </div>
        </form>
    );
}

// ─────────────────────────────────────────────
// Main Products Page
// ─────────────────────────────────────────────
export default function Products({ products, categories, filters = {}, locations = [] }) {
    const { activeShop = null } = usePage().props;

    const [search, setSearch] = useState(filters.search ?? "");
    const [selectedLocation, setSelectedLocation] = useState(filters.location ?? "");

    // Sync search & location state with filters prop when they change externally
    useEffect(() => {
        setSearch(filters.search ?? "");
        setSelectedLocation(filters.location ?? "");
    }, [filters.search, filters.location]);

    const runFilter = (term, loc) => {
        const queryParams = {};
        if (term.trim()) queryParams.search = term;
        if (loc) queryParams.location = loc;

        router.get(
            route("products.index"),
            queryParams,
            {
                preserveState: true,
                preserveScroll: true,
                replace: true
            }
        );
    };

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== (filters.search ?? "")) {
                runFilter(search, selectedLocation);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [search, filters.search]);

    const handleLocationFilterChange = (loc) => {
        setSelectedLocation(loc);
        runFilter(search, loc);
    };
    const [view, setView] = useState("list");
    const [editingProduct, setEditing] = useState(null);
    const [barcodeProduct, setBarcodeProduct] = useState(null);
    // 'grid' | 'listview' — how products are displayed in list mode
    const [displayMode, setDisplayMode] = useState("grid");

    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedMode = localStorage.getItem("productsDisplayMode");
            if (savedMode) {
                setDisplayMode(savedMode);
            }
        }
    }, []);

    const changeDisplayMode = (mode) => {
        setDisplayMode(mode);
        if (typeof window !== "undefined") {
            localStorage.setItem("productsDisplayMode", mode);
        }
    };

    const openCreate = () => {
        setEditing(null);
        setView("create");
    };

    const openEdit = (product) => {
        setEditing(product);
        setView("edit");
    };

    const handleSuccess = () => {
        setView("list");
        setEditing(null);
        router.reload(); // Refresh the product list from server
    };

    const handleCancel = () => {
        setView("list");
        setEditing(null);
    };

    const [deleteModal, setDeleteModal] = useState({ isOpen: false, product: null, processing: false });

    const handleDelete = (product) => {
        setDeleteModal({ isOpen: true, product, processing: false });
    };

    const confirmDelete = () => {
        if (!deleteModal.product) return;
        setDeleteModal(prev => ({ ...prev, processing: true }));
        router.post(route("products.destroy.post", { shop: activeShop?.slug }), {
            product_id: deleteModal.product.id,
            shop: activeShop?.slug,
        }, {
            onSuccess: () => {
                setDeleteModal({ isOpen: false, product: null, processing: false });
                router.reload();
            },
            onError: () => {
                setDeleteModal(prev => ({ ...prev, processing: false }));
            }
        });
    };

    return (
        <MainLayout pageTitle="Products">
            <Head title="Products" />

            <div className="space-y-6">
                {/* ── Header ── */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {view !== "list" && (
                            <button
                                onClick={handleCancel}
                                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-500"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {view === "list"
                                    ? "Products"
                                    : view === "create"
                                        ? "New Product"
                                        : "Edit Product"}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {view === "list"
                                    ? "Manage products and their size/grade variants."
                                    : "Fill in the details below and add at least one variant."}
                            </p>
                        </div>
                    </div>

                    {view === "list" && (
                        <div className="flex items-center gap-3">
                            {/* Search Input */}
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    runFilter(search, selectedLocation);
                                }}
                                className="relative hidden md:block"
                            >
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search products, SKUs..."
                                    className="w-64 pl-10 pr-4 py-2 bg-gray-100 dark:bg-slate-700 border-0 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 transition-all"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-400 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </form>

                            {/* Location Filter Dropdown */}
                            <select
                                value={selectedLocation}
                                onChange={(e) => handleLocationFilterChange(e.target.value)}
                                className="bg-gray-100 dark:bg-slate-700 border-0 rounded-xl text-sm text-gray-905 dark:text-white py-2 px-3 focus:ring-2 focus:ring-primary-500 transition-all active:border-0"
                            >
                                <option value="">All Locations (Boxes)</option>
                                {locations.map((loc) => (
                                    <option key={loc} value={loc} className="dark:bg-slate-800">
                                        {loc}
                                    </option>
                                ))}
                            </select>

                            {/* Grid / List display toggle */}
                            <div className="inline-flex rounded-xl bg-gray-100 dark:bg-slate-700 p-1">
                                <button
                                    onClick={() => changeDisplayMode("grid")}
                                    className={`p-2 rounded-lg transition-all ${displayMode === "grid"
                                        ? "bg-white dark:bg-slate-800 shadow-sm text-gray-900 dark:text-white"
                                        : "text-gray-400 hover:text-gray-600"
                                        }`}
                                    title="Grid view"
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => changeDisplayMode("listview")}
                                    className={`p-2 rounded-lg transition-all ${displayMode === "listview"
                                        ? "bg-white dark:bg-slate-800 shadow-sm text-gray-900 dark:text-white"
                                        : "text-gray-400 hover:text-gray-600"
                                        }`}
                                    title="List view"
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>

                            <button
                                onClick={openCreate}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
                            >
                                <PlusCircle className="w-4 h-4" />
                                New Product
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Product Form (Create / Edit) ── */}
                {(view === "create" || view === "edit") && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
                        <ProductForm
                            categories={categories}
                            product={view === "edit" ? editingProduct : null}
                            onSuccess={handleSuccess}
                            onCancel={handleCancel}
                        />
                    </div>
                )}

                {/* ── Product Grid / List View ── */}
                {view === "list" && (
                    <>
                        {/* GRID VIEW — responsive columns for better pagination display */}
                        {displayMode === "grid" && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {products.data?.length === 0 ? (
                                    <div className="col-span-full text-center py-20 text-gray-400">
                                        No products yet. Click "New Product" to add one.
                                    </div>
                                ) : (
                                    products.data?.map((product) => (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            onEdit={openEdit}
                                            onDelete={handleDelete}
                                            onBarcode={setBarcodeProduct}
                                        />
                                    ))
                                )}
                            </div>
                        )}

                        {/* LIST VIEW — compact table */}
                        {displayMode === "listview" && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                                {products.data?.length === 0 ? (
                                    <div className="text-center py-20 text-gray-400">
                                        No products yet. Click "New Product" to add one.
                                    </div>
                                ) : (
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-slate-700/40">
                                            <tr>
                                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Product</th>
                                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Location (Box)</th>
                                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">UOM</th>
                                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Variants</th>
                                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total Stock</th>
                                                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                            {products.data?.map((product) => (
                                                <ProductListRow
                                                    key={product.id}
                                                    product={product}
                                                    onEdit={openEdit}
                                                    onDelete={handleDelete}
                                                    onBarcode={setBarcodeProduct}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                        {/* Pagination */}
                        {products.last_page > 1 && (
                            <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 px-6 py-4 mt-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                                <p className="text-xs text-gray-500">
                                    Showing {products.from}-{products.to} of {products.total} products
                                </p>
                                <div className="flex gap-2">
                                    {products.links.map((link, i) => (
                                        <button
                                            key={i}
                                            disabled={!link.url || link.active}
                                            onClick={() => router.get(link.url)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${link.active
                                                ? "bg-primary-500 text-white shadow-sm"
                                                : link.url
                                                    ? "bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600"
                                                    : "text-gray-300 dark:text-slate-600 cursor-not-allowed"
                                                }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, product: null, processing: false })}
                onConfirm={confirmDelete}
                title="Delete Product"
                message={`Are you sure you want to delete "${deleteModal.product?.name}" and all its variants? This cannot be undone.`}
                confirmText="Delete"
                processing={deleteModal.processing}
            />

            <BarcodePrintModal
                product={barcodeProduct}
                isOpen={!!barcodeProduct}
                onClose={() => setBarcodeProduct(null)}
            />
        </MainLayout>
    );
}
