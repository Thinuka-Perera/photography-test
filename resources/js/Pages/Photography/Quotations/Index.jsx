import MainLayout from "@/Layouts/MainLayout";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import TextInput from "@/Components/TextInput";
import { Head, router, useForm } from "@inertiajs/react";
import {
  Copy,
  MessageCircle,
  PencilLine,
  Send,
  Sparkles,
  Ticket,
  Trash2,
  WandSparkles,
  X,
  Package,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ConvertToInvoiceButton from "@/Components/Finance/ConvertToInvoiceButton";
import { generateProfessionalPDF, sharePDFOnWhatsApp } from "@/utils/pdfGenerator";
import ProductGrid from "@/Components/POS/ProductGrid";



const lineItemPresets = [];

const defaultLineItems = [
  { description: "", unit_price: "", quantity: 1, product_id: null, product_sku: null, color: null },
];

const blankQuotationForm = {
  customer_name: "",
  customer_phone: "",
  event_type: "General",
  event_date: "",
  wedding_date: "",
  homecoming_date: "",
  package_name: "",
  notes: "",
  status: "draft",
  discount_amount: 0,
  manual_total: "",
  line_items: [{ description: "", unit_price: "", quantity: 1, product_id: null, product_sku: null, color: null }],
};

const statusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Awaiting approval", value: "awaiting_approval" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const statusTone = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300",
  awaiting_approval:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  approved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function statusLabel(status) {
  return status.replace("_", " ");
}

function toDateInputValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export default function Index({
  recentQuotations = [],
  stats = {},
  employees = [],
  packages = [],
  shopSettings = {},
  weddingMonthlyBreakdown = [],
  availableWeddingYears = [],
  filters = {},
  customers = [],
  products = [],
  categories = [],
}) {
  const [selectedQuotationId, setSelectedQuotationId] = useState(null);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [weddingOnly, setWeddingOnly] = useState(filters.wedding_only !== undefined ? filters.wedding_only : false);
  const [selectedYear, setSelectedYear] = useState(filters.year || new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(filters.month || "");
  const [activeDropdownIndex, setActiveDropdownIndex] = useState(null);
  const [showProductSelectModal, setShowProductSelectModal] = useState(false);
  const [selectedProductGroup, setSelectedProductGroup] = useState(null);

  const handleProductSelect = (product) => {
    if (product.variants && product.variants.length > 1) {
      setSelectedProductGroup(product);
      return;
    }
    addProductToLineItems(product);
  };

  const addProductToLineItems = (variant) => {
    const existingIndex = data.line_items.findIndex(
      (item) => item.product_id !== null && item.product_id === variant.id
    );

    if (existingIndex !== -1) {
      const nextItems = [...data.line_items];
      nextItems[existingIndex] = {
        ...nextItems[existingIndex],
        quantity: Number(nextItems[existingIndex].quantity || 0) + 1,
      };
      setData("line_items", nextItems);
    } else {
      const newLine = {
        description: variant.name,
        unit_price: Number(variant.price || 0),
        quantity: 1,
        product_id: variant.id,
        product_sku: variant.sku,
      };

      // If the first line is completely empty, replace it, otherwise append.
      if (
        data.line_items.length === 1 &&
        data.line_items[0].description === "" &&
        data.line_items[0].unit_price === ""
      ) {
        setData("line_items", [newLine]);
      } else {
        setData("line_items", [...data.line_items, newLine]);
      }
    }

    // Close variant selector if open
    setSelectedProductGroup(null);
  };

  const monthLabels = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const { data, setData, post, put, processing, errors } = useForm({
    customer_name: "Nadeesha Perera",
    customer_phone: "0771234567",
    event_type: "General",
    event_date: "",
    wedding_date: "",
    homecoming_date: "",
    package_name: "",
    notes:
      "Include two photographers and evening coverage until the first dance.",
    status: "draft",
    discount_amount: 0,
    manual_total: "",
    line_items: defaultLineItems,
  });

  const subtotal = useMemo(
    () =>
      data.line_items.reduce(
        (sum, item) =>
          sum + Number(item.unit_price || 0) * Number(item.quantity || 0),
        0,
      ),
    [data.line_items],
  );

  const total = useMemo(() => {
    if (data.manual_total !== undefined && data.manual_total !== null && data.manual_total !== "") {
      return Number(data.manual_total);
    }
    return Math.max(0, subtotal - Number(data.discount_amount || 0));
  }, [subtotal, data.discount_amount, data.manual_total]);

  const filteredProducts = useMemo(() => {
    if (activeDropdownIndex === null) return [];
    const searchVal = data.line_items[activeDropdownIndex]?.description?.toLowerCase() || "";
    return products.filter(p =>
      p.name.toLowerCase().includes(searchVal) ||
      p.sku.toLowerCase().includes(searchVal)
    );
  }, [products, data.line_items, activeDropdownIndex]);

  const whatsappMessage = useMemo(() => {
    const separator = "──────────────────";
    const lines = [
      `*QUOTATION: ${data.customer_name}*`,
      `_Generated on ${new Date().toLocaleDateString()}_`,
      "",
      `*Event Details*`,
      `Type: ${data.event_type}`,
      `Package: ${data.package_name || "Custom"}`,
      data.event_date ? `Date: ${data.event_date}` : null,
      data.wedding_date ? `Wedding Date: ${data.wedding_date}` : null,
      data.homecoming_date ? `Homecoming Date: ${data.homecoming_date}` : null,
      "",
      `*Services & Items*`,
      ...data.line_items.map(
        (item) => {
          const matchedProduct = item.product_id ? products.find(p => p.id === item.product_id) : null;
          const size = item.size || (matchedProduct?.size) || null;
          const sizeStr = size ? ` [${size}]` : "";
          const colorStr = item.color ? ` (${item.color})` : "";
          return `• ${item.description}${colorStr}${sizeStr} (x${item.quantity})\n  ${formatCurrency(
            Number(item.unit_price || 0) * Number(item.quantity || 0),
          )}`;
        }
      ),
      "",
      separator,
      `*Subtotal:* ${formatCurrency(subtotal)}`,
      data.discount_amount > 0 ? `*Discount:* -${formatCurrency(Number(data.discount_amount))}` : null,
      `*TOTAL AMOUNT: ${formatCurrency(total)}*`,
      separator,
      "",
      data.notes ? `*Notes:* \n${data.notes}` : null,
      "",
      "Thank you for choosing us to capture your special moments!",
    ].filter(line => line !== null);

    return lines.join("\n");
  }, [data, subtotal, total, products]);

  const handleWhatsAppShare = async (quoteData = null) => {
    const isEvent = quoteData && quoteData.nativeEvent;
    const actualQuoteData = isEvent ? null : quoteData;
    
    const activeData = actualQuoteData || data;
    const activeSubtotal = actualQuoteData ? actualQuoteData.subtotal : subtotal;
    const activeTotal = actualQuoteData ? actualQuoteData.total_amount : total;
    const activeDiscount = actualQuoteData ? actualQuoteData.discount_amount : data.discount_amount;
    const activeItems = actualQuoteData ? (actualQuoteData.items || []).map(i => ({
      description: i.description + (i.color ? ` (${i.color})` : ""),
      quantity: i.quantity,
      unit_price: i.unit_price,
      line_total: i.line_total,
      size: i.product_id ? (products.find(p => p.id === i.product_id)?.size || null) : null
    })) : data.line_items.map(i => ({
      description: i.description + (i.color ? ` (${i.color})` : ""),
      quantity: i.quantity,
      unit_price: i.unit_price,
      line_total: Number(i.unit_price) * Number(i.quantity),
      size: i.product_id ? (products.find(p => p.id === i.product_id)?.size || null) : null
    }));

    const doc = await generateProfessionalPDF({
      type: 'QUOTATION',
      number: activeData.quote_number || 'DRAFT',
      date: activeData.created_at ? new Date(activeData.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
      customerName: activeData.customer_name,
      customerPhone: activeData.customer_phone,
      items: activeItems,
      subtotal: activeSubtotal,
      discount: activeDiscount,
      total: activeTotal,
      notes: activeData.notes,
      shopSettings: {
        name: shopSettings.shop_name,
        address: shopSettings.shop_address,
        phone: shopSettings.shop_phone,
        logoUrl: shopSettings.shop_logo_url,
        paymentInfo: shopSettings.invoice_payment_info,
        termsConditions: shopSettings.invoice_terms,
      }
    });

    const { generateWhatsAppMessageForBill } = await import('@/utils/pdfGenerator');
    const filename = `Quotation_${activeData.quote_number || 'Draft'}.pdf`;
    const message = generateWhatsAppMessageForBill({ ...activeData, items: activeItems, total_amount: activeTotal }, shopSettings);

    await sharePDFOnWhatsApp(doc, filename, activeData.customer_phone, message);
  };

  const updateLineItem = (index, keyOrMap, value) => {
    const nextItems = [...data.line_items];
    if (typeof keyOrMap === "object" && keyOrMap !== null) {
      nextItems[index] = { ...nextItems[index], ...keyOrMap };
    } else {
      nextItems[index] = { ...nextItems[index], [keyOrMap]: value };
      if (keyOrMap === "description") {
        const matchingProduct = products.find(p => p.name === value);
        if (!matchingProduct) {
          nextItems[index].product_id = null;
          nextItems[index].product_sku = null;
        } else {
          nextItems[index].product_id = matchingProduct.id;
          nextItems[index].product_sku = matchingProduct.sku;
        }
      }
    }
    setData("line_items", nextItems);
  };

  const addPresetItem = (preset) => {
    setData("line_items", [
      ...data.line_items,
      {
        description: preset.description,
        unit_price: preset.unit_price,
        quantity: 1,
      },
    ]);
  };

  const removeLineItem = (index) => {
    setData(
      "line_items",
      data.line_items.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const applyTemplate = (template) => {
    setSelectedQuotationId(null);

    let newItems = [];
    if (template.services && template.services.length > 0) {
      newItems = template.services.map(s => ({
        description: s.name,
        unit_price: s.price || 0,
        quantity: 1,
      }));
    } else {
      newItems = [
        { description: template.name, unit_price: template.total_price, quantity: 1 }
      ];
    }

    // Filter out initial empty placeholder item if user hasn't typed anything
    const currentLineItems = Array.isArray(data.line_items) ? data.line_items : [];
    const validExistingItems = currentLineItems.filter(
      item => (item.description && item.description.trim() !== '') || (item.unit_price !== '' && item.unit_price !== 0 && item.unit_price !== null && item.unit_price !== undefined)
    );

    const mergedLineItems = [...validExistingItems, ...newItems];

    const existingPackageName = data.package_name || '';
    let updatedPackageName = template.name || '';
    if (existingPackageName) {
      if (!existingPackageName.includes(template.name)) {
        updatedPackageName = `${existingPackageName}, ${template.name}`;
      } else {
        updatedPackageName = existingPackageName;
      }
    }

    setData((prev) => ({
      ...prev,
      package_name: updatedPackageName,
      event_type: prev.event_type || template.event_type || '',
      line_items: mergedLineItems,
    }));
  };

  const loadQuotation = (quotation) => {
    setSelectedQuotationId(quotation.id);
    setData({
      customer_name: quotation.customer_name ?? "",
      customer_phone: quotation.customer_phone ?? "",
      event_type: quotation.event_type ?? "",
      event_date: toDateInputValue(quotation.event_date),
      wedding_date: toDateInputValue(quotation.wedding_date),
      homecoming_date: toDateInputValue(quotation.homecoming_date),
      package_name: quotation.package_name ?? "",
      notes: quotation.notes ?? "",
      status: quotation.status ?? "draft",
      discount_amount: Number(quotation.discount_amount || 0),
      manual_total: quotation.manual_total !== null && quotation.manual_total !== undefined ? String(quotation.manual_total) : "",
      line_items:
        quotation.items?.length > 0
          ? quotation.items.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unit_price: item.unit_price !== null && item.unit_price !== undefined ? Number(item.unit_price) : "",
            product_id: item.product_id ?? null,
            product_sku: item.product_sku ?? null,
            color: item.color ?? null,
          }))
          : [
            {
              description: "Manual customization",
              unit_price: "",
              quantity: 1,
              product_id: null,
              product_sku: null,
              color: null,
            },
          ],
    });
  };

  const createNewDraft = () => {
    setSelectedQuotationId(null);
    setData(blankQuotationForm);
  };

  const saveQuotation = () => {
    if (selectedQuotationId) {
      put(route("photography.quotations.update", selectedQuotationId));
      return;
    }

    post(route("photography.quotations.store"), {
      onSuccess: () => {
        createNewDraft();
      },
    });
  };

  const deleteQuotation = (quotationId) => {
    if (!confirm("Delete this quotation?")) {
      return;
    }

    router.delete(route("photography.quotations.destroy", quotationId), {
      onSuccess: () => {
        if (selectedQuotationId === quotationId) {
          createNewDraft();
        }
      },
    });
  };

  const prepareWhatsapp = () => {
    if (!selectedQuotationId) {
      alert("Save the quotation first before preparing WhatsApp handoff.");
      return;
    }

    router.post(
      route("photography.quotations.prepare-whatsapp", selectedQuotationId),
      { customer_phone: data.customer_phone },
      { onSuccess: () => setShowWhatsappModal(false) },
    );
  };

  const copyMessage = async () => {
    await navigator.clipboard.writeText(whatsappMessage);
  };

  useEffect(() => {
    router.get(
      route("photography.quotations"),
      {
        wedding_only: weddingOnly,
        year: selectedYear,
        month: selectedMonth || undefined,
      },
      { preserveState: true, preserveScroll: true, replace: true },
    );
  }, [selectedYear, selectedMonth, weddingOnly]);

  return (
    <MainLayout pageTitle="Quotation Management">
      <Head title="Quotation Management" />

      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Quotation Management
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Generate professional quotations, customize them manually, and
              prepare a WhatsApp handoff with a backend-ready workflow.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={createNewDraft}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300"
            >
              New draft
            </button>
            <button
              type="button"
              onClick={() => setShowWhatsappModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
            >
              <Send className="w-4 h-4" />
              Prepare WhatsApp handoff
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Draft quotations"
            value={stats.draft_count ?? 0}
            icon={Ticket}
            tone="bg-sky-100 dark:bg-sky-900/30 text-sky-500"
          />
          <StatCard
            label="WhatsApp-ready"
            value={stats.whatsapp_ready_count ?? 0}
            icon={MessageCircle}
            tone="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500"
          />
          <StatCard
            label="Approval rate"
            value={`${stats.approval_rate ?? 0}%`}
            icon={Sparkles}
            tone="bg-violet-100 dark:bg-violet-900/30 text-violet-500"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <WandSparkles className="w-5 h-5 text-primary-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Quote templates
                </h3>
              </div>

              <div className="space-y-4">
                {packages.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No packages created yet.</p>
                ) : (
                  packages.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => applyTemplate(template)}
                      className="w-full text-left rounded-xl bg-gray-50 dark:bg-slate-700/40 p-4 hover:ring-2 hover:ring-primary-500/40 transition"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {template.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {template.event_type}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-primary-500">
                          {formatCurrency(template.total_price)}
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {template.notes || "No description available."}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {weddingOnly ? "Wedding quotations" : "All quotations"}
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Monthly + year-wise
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Filter type</label>
                  <select
                    value={weddingOnly ? "wedding" : "all"}
                    onChange={(event) => setWeddingOnly(event.target.value === "wedding")}
                    className="w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-xs"
                  >
                    <option value="all">All Events</option>
                    <option value="wedding">Wedding Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(Number(event.target.value))}
                    className="w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    {(availableWeddingYears.length ? availableWeddingYears : [new Date().getFullYear()]).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                    className="w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="">All months</option>
                    {monthLabels.map((label, index) => (
                      <option key={label} value={index + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-gray-100 dark:border-slate-700 p-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Monthly wedding count ({selectedYear})
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {monthLabels.map((label, index) => {
                    const monthly = weddingMonthlyBreakdown.find((row) => Number(row.month_number) === index + 1);
                    return (
                      <div key={label} className="rounded-lg bg-gray-50 dark:bg-slate-900/40 px-2 py-1.5">
                        <span className="text-gray-500 dark:text-gray-400">{label.slice(0, 3)}</span>
                        <span className="ml-2 font-semibold text-gray-900 dark:text-white">{monthly?.total || 0}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                {recentQuotations.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {weddingOnly ? "No wedding quotations found for this filter." : "No quotations found for this filter."}
                  </p>
                )}
                {recentQuotations.map((quote) => (
                  <div
                    key={quote.id}
                    className="rounded-xl border border-gray-100 dark:border-slate-700 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {quote.customer_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {quote.package_name || "Custom package"}
                        </p>
                      </div>
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${statusTone[quote.status] ?? statusTone.draft
                          }`}
                      >
                        {statusLabel(quote.status)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        {quote.quote_number}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(quote.total_amount)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => loadQuotation(quote)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <PencilLine className="w-4 h-4" />
                        Customize
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteQuotation(quote.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-sm text-red-700 dark:border-red-900/50 dark:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>

                      <ConvertToInvoiceButton
                        quotation={quote}
                        employees={employees}
                      />

                      <button
                        type="button"
                        onClick={() => handleWhatsAppShare(quote)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors text-sm"
                      >
                        <MessageCircle className="w-4 h-4" />
                        PDF Share
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="xl:col-span-3 grid grid-cols-1 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Manual quotation builder
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedQuotationId
                    ? "Editing saved quotation"
                    : "Creating draft"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer name</label>
                  <TextInput
                    value={data.customer_name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setData("customer_name", val);
                      const matched = customers.find(c => c.name?.toLowerCase() === val.toLowerCase());
                      if (matched && matched.phone && !data.customer_phone) {
                        setData("customer_phone", matched.phone);
                      }
                    }}
                    onFocus={() => document.getElementById('name-dropdown')?.classList.remove('hidden')}
                    onBlur={() => setTimeout(() => document.getElementById('name-dropdown')?.classList.add('hidden'), 200)}
                    className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <ul id="name-dropdown" className="hidden absolute z-10 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl mt-1 max-h-48 overflow-y-auto shadow-lg">
                    {customers.filter(c => c.name?.toLowerCase().includes(data.customer_name?.toLowerCase() || '')).map(c => (
                      <li
                        key={`name-${c.id}`}
                        className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer text-gray-900 dark:text-white text-sm"
                        onClick={() => {
                          setData("customer_name", c.name);
                          if (c.phone && !data.customer_phone) setData("customer_phone", c.phone);
                        }}
                      >
                        {c.name}
                      </li>
                    ))}
                  </ul>
                  <FieldError message={errors.customer_name} />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer phone</label>
                  <TextInput
                    value={data.customer_phone}
                    onChange={(e) => {
                      const val = e.target.value;
                      setData("customer_phone", val);
                      const matched = customers.find(c => c.phone === val);
                      if (matched && matched.name && !data.customer_name) {
                        setData("customer_name", matched.name);
                      }
                    }}
                    onFocus={() => document.getElementById('phone-dropdown')?.classList.remove('hidden')}
                    onBlur={() => setTimeout(() => document.getElementById('phone-dropdown')?.classList.add('hidden'), 200)}
                    className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <ul id="phone-dropdown" className="hidden absolute z-10 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl mt-1 max-h-48 overflow-y-auto shadow-lg">
                    {customers.filter(c => c.phone && c.phone.includes(data.customer_phone || '')).map(c => (
                      <li
                        key={`phone-${c.id}`}
                        className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer text-gray-900 dark:text-white text-sm"
                        onClick={() => {
                          setData("customer_phone", c.phone);
                          if (c.name && !data.customer_name) setData("customer_name", c.name);
                        }}
                      >
                        {c.phone} {c.name ? `(${c.name})` : ''}
                      </li>
                    ))}
                  </ul>
                  <FieldError message={errors.customer_phone} />
                </div>


                <Field label="Status">
                  <select
                    value={data.status}
                    onChange={(e) => setData("status", e.target.value)}
                    className="mt-1 w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <FieldError message={errors.status} />
                </Field>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notes
                </label>
                <textarea
                  rows={4}
                  value={data.notes}
                  onChange={(e) => setData("notes", e.target.value)}
                  className="mt-1 w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <FieldError message={errors.notes} />
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Line items
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => addPresetItem({ description: "", unit_price: 0 })}
                      className="px-3 py-2 rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 text-sm font-medium hover:bg-primary-100 transition-colors"
                    >
                      + New Line
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowProductSelectModal(true)}
                      className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-100 transition-colors inline-flex items-center gap-1.5"
                    >
                      <Package className="w-4 h-4" />
                      + From Inventory
                    </button>
                  </div>
                </div>

                <FieldError message={errors.line_items} />
<div className="space-y-3">
                  {data.line_items.map((item, index) => (
                    <div
                      key={`line-item-${index}`}
                      className="grid grid-cols-12 gap-3 items-center rounded-xl border border-gray-100 dark:border-slate-700 p-3"
                    >
                      <div className="col-span-4 relative">
                        <label className="text-xs text-gray-500 dark:text-gray-400">
                          Description
                        </label>
                        <TextInput
                          value={item.description}
                          onChange={(e) =>
                            updateLineItem(index, "description", e.target.value)
                          }
                          className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          placeholder="Type description manually..."
                        />
                        <FieldError message={errors[`line_items.${index}.description`]} />
                        {(() => {
                          const matchedProduct = products.find((p) => p.id === item.product_id);
                          if (!matchedProduct) return null;
                          const exceeds = Number(item.quantity || 1) > Number(matchedProduct.stock);
                          return (
                            <div className="mt-1 flex items-center justify-between text-[10px]">
                              <span className="text-gray-400 font-mono font-medium">SKU: {matchedProduct.sku}</span>
                              <span className={`font-semibold ${exceeds ? "text-amber-500 dark:text-amber-400 animate-pulse" : "text-emerald-500"}`}>
                                In Stock: {matchedProduct.stock} {exceeds && "(Warning: Exceeds Available Stock)"}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 dark:text-gray-400">
                          Color
                        </label>
                        <TextInput
                          value={item.color || ""}
                          onChange={(e) =>
                            updateLineItem(index, "color", e.target.value || null)
                          }
                          className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-xs py-1.5 px-2.5"
                          placeholder="Color..."
                        />
                        <FieldError message={errors[`line_items.${index}.color`]} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 dark:text-gray-400">
                          Qty
                        </label>
                        <TextInput
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(
                              index,
                              "quantity",
                              Number(e.target.value || 1),
                            )
                          }
                          className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        <FieldError message={errors[`line_items.${index}.quantity`]} />
                      </div>
                      <div className="col-span-3">
                        <label className="text-xs text-gray-500 dark:text-gray-400">
                          Unit price (Optional)
                        </label>
                        <TextInput
                          type="number"
                          min="0"
                          placeholder="Optional"
                          value={item.unit_price}
                          onChange={(e) =>
                            updateLineItem(
                              index,
                              "unit_price",
                              e.target.value === "" ? "" : Number(e.target.value),
                            )
                          }
                          className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                        <FieldError message={errors[`line_items.${index}.unit_price`]} />
                      </div>
                      <div className="col-span-1 flex justify-end pt-5">
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="text-sm text-red-600 dark:text-red-400"
                        >
                          x
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={saveQuotation}
                  disabled={processing}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-60"
                >
                  Save quotation
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Live quote preview
                </h3>
                <div className="mt-4 rounded-2xl bg-gray-50 dark:bg-slate-900/60 border border-dashed border-gray-200 dark:border-slate-700 p-5 space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Customer
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {data.customer_name}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Package
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {data.package_name || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Event date
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {data.event_date || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Wedding Date
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {data.wedding_date || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Homecoming Date
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {data.homecoming_date || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {data.line_items.map((item, idx) => (
                      <div
                        key={`${item.description}-${idx}`}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-600 dark:text-gray-300">
                          {item.description}
                          {item.color ? ` (${item.color})` : ""}
                          {" x"}
                          {item.quantity}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(
                            Number(item.unit_price) * Number(item.quantity),
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 dark:border-slate-700 pt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        Subtotal
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        Discount
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(Number(data.discount_amount || 0))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-base">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        Total
                      </span>
                      <span className="font-semibold text-primary-500">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  WhatsApp handoff
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Backend endpoint prepares handoff metadata but does not send.
                </p>
                <div className="mt-4 rounded-2xl bg-gray-50 dark:bg-slate-900/60 border border-dashed border-gray-200 dark:border-slate-700 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Message preview
                  </p>
                  <pre className="mt-2 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans">
                    {whatsappMessage}
                  </pre>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Share as PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWhatsappModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500 text-emerald-600 font-medium hover:bg-emerald-50"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Text Message
                  </button>
                  <button
                    type="button"
                    onClick={copyMessage}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300"
                  >
                    <Copy className="w-4 h-4" />
                    Copy message
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        show={showWhatsappModal}
        onClose={() => setShowWhatsappModal(false)}
        maxWidth="2xl"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                WhatsApp handoff
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                This stores handoff-ready phone details only. Sending is
                intentionally not implemented.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowWhatsappModal(false)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              x
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                WhatsApp number
              </label>
              <TextInput
                value={data.customer_phone}
                onChange={(e) => setData("customer_phone", e.target.value)}
                className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Handoff message
              </label>
              <textarea
                rows={8}
                value={whatsappMessage}
                readOnly
                className="mt-1 w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={copyMessage}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300"
            >
              <Copy className="w-4 h-4" />
              Copy message
            </button>
            <PrimaryButton
              type="button"
              onClick={prepareWhatsapp}
              className="bg-primary-500 hover:bg-primary-600 focus:ring-primary-500"
            >
              Save handoff
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      {/* Product Selector Modal */}
      <Modal show={showProductSelectModal} onClose={() => setShowProductSelectModal(false)} maxWidth="5xl">
        <div className="p-6 flex flex-col h-[85vh]">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Select Product from Inventory
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Browse catalog and select items to add to the quotation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowProductSelectModal(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <ProductGrid
              products={products}
              categories={categories}
              onAddToCart={handleProductSelect}
              allowOutOfStockSelection={true}
            />
          </div>
        </div>
      </Modal>

      {/* Variant Selector Modal */}
      <Modal show={!!selectedProductGroup} onClose={() => setSelectedProductGroup(null)} maxWidth="md">
        <div className="p-6 max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Select Variant for {selectedProductGroup?.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Multiple sizes/options available for this item.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedProductGroup(null)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto pr-2">
            {selectedProductGroup?.variants.map((v) => (
              <div
                key={v.id}
                onClick={() => addProductToLineItems(v)}
                className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-all"
              >
                <div>
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                    {v.name} {v.size ? `(${v.size})` : ""}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-mono">
                    SKU: {v.sku} · Stock: {v.stock}
                  </p>
                </div>
                <div className="font-black text-primary-500 text-sm">
                  {formatCurrency(v.price)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}

function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${tone}`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      {children}
    </label>
  );
}

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}
