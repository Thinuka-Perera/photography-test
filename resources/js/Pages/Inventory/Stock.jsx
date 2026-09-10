import MainLayout from "@/Layouts/MainLayout";
import ActiveShopBanner from "@/Modules/Shops/Components/ActiveShopBanner";
import { Head, router, usePage } from "@inertiajs/react";
import {
    AlertTriangle,
    Package,
    Search,
    TrendingDown,
    TrendingUp,
    FileDown,
    ChevronDown,
    Table,
    FileText,
} from "lucide-react";
import { useState, Fragment } from "react";
import { Menu, Transition } from '@headlessui/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────
// Stock Tracking Page
//
// Displays ALL product variants from the database with:
//   - Product image thumbnail (from image_url accessor)
//   - Variant name (Product — Size / Grade)
//   - SKU, category as module, current stock, reorder threshold
//   - Status badge: Healthy / Low / Critical
//
// Props from InventoryController::stock():
//   stockItems: Array of { id, name, sku, module, image_url, current, reorderAt, status }
// ─────────────────────────────────────────────

const statusStyles = {
    healthy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    low: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function Stock({ stockItems = [] }) {
    const { auth } = usePage().props;
    const canExport = Boolean(
        auth?.access?.is_super_admin ||
        auth?.access?.page_lookup?.['stock-tracking.export'] ||
        auth?.access?.page_lookup?.['stock-tracking']
    );
    const [search, setSearch] = useState("");

    // Filter items by name, SKU, or module
    const filtered = stockItems.filter((item) => {
        const q = search.toLowerCase();
        return (
            item.name?.toLowerCase().includes(q) ||
            item.sku?.toLowerCase().includes(q) ||
            item.module?.toLowerCase().includes(q)
        );
    });

    const healthy = stockItems.filter((i) => i.status === "healthy").length;
    const low = stockItems.filter((i) => i.status === "low").length;
    const critical = stockItems.filter((i) => i.status === "critical").length;

    const formatDataForExport = () => {
        return filtered.map(item => {
            const costPrice = item.cost_price ? Number(item.cost_price) : 0;
            const sellPrice = item.selling_price ? Number(item.selling_price) : 0;
            const totalVal = costPrice * item.current;

            return {
                'Item / Variant': item.name || 'Unknown',
                'Category': item.module || '—',
                'Location': item.location || '—',
                'SKU': item.sku || '—',
                'Barcode': item.barcode || '—',
                'UOM': item.uom || 'unit',
                'Cost (LKR)': costPrice.toLocaleString(),
                'Price (LKR)': sellPrice.toLocaleString(),
                'Current Stock': item.current,
                'Reorder Threshold': item.reorderAt,
                'Value (LKR)': totalVal.toLocaleString(),
                'Status': item.status?.toUpperCase() || 'UNKNOWN'
            };
        });
    };

    const exportToExcel = () => {
        const rawData = formatDataForExport();
        if (rawData.length === 0) {
            alert("No data available to export.");
            return;
        }

        const headerRows = [
            ["PHOTOGRAPHY SHOP MANAGEMENT SYSTEM"],
            ["Stock Tracking Report"],
            [`Generated On: ${new Date().toLocaleString()}`],
            [],
        ];

        const keys = Object.keys(rawData[0]);
        headerRows.push(keys);

        rawData.forEach(item => {
            headerRows.push(Object.values(item));
        });

        const worksheet = XLSX.utils.aoa_to_sheet(headerRows);

        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: keys.length - 1 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: keys.length - 1 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: keys.length - 1 } },
        ];

        worksheet['!cols'] = [
            { wch: 30 }, // Item
            { wch: 20 }, // Category
            { wch: 15 }, // Location
            { wch: 25 }, // SKU
            { wch: 20 }, // Barcode
            { wch: 10 }, // UOM
            { wch: 15 }, // Cost
            { wch: 15 }, // Price
            { wch: 15 }, // Current Stock
            { wch: 18 }, // Reorder
            { wch: 18 }, // Value
            { wch: 15 }, // Status
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Tracking");
        XLSX.writeFile(workbook, `Stock_Tracking_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = () => {
        const doc = new jsPDF('landscape');

        if (filtered.length === 0) {
            doc.text("No stock tracking data found.", 14, 20);
            doc.save(`Stock_Tracking_${new Date().toISOString().split('T')[0]}.pdf`);
            return;
        }

        doc.setFontSize(22);
        doc.setTextColor(3, 174, 210);
        doc.text('PHOTOGRAPHY SHOP', 14, 22);

        doc.setFontSize(12);
        doc.setTextColor(50, 50, 50);
        doc.text('Stock Tracking Report', 14, 30);

        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);
        doc.text(`Total Items: ${filtered.length} | Critical Items: ${critical}`, 14, 42);

        const rawData = formatDataForExport();
        const tableColumn = Object.keys(rawData[0]);
        const tableRows = rawData.map(item => Object.values(item));

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 48,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
            headStyles: { fillColor: [3, 174, 210], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            columnStyles: {
                6: { halign: 'right' },  // Cost
                7: { halign: 'right' },  // Price
                8: { halign: 'center' }, // Stock
                9: { halign: 'center' }, // Threshold
                10: { halign: 'right' },  // Value
                11: { fontStyle: 'bold', halign: 'center' } // Status
            },
            didParseCell: function (data) {
                if (data.section === 'body' && data.column.index === 11) {
                    const stat = data.cell.raw.toLowerCase();
                    if (stat === 'critical' || stat === 'out of stock') data.cell.styles.textColor = [220, 38, 38];
                    else if (stat === 'low') data.cell.styles.textColor = [217, 119, 6];
                    else data.cell.styles.textColor = [5, 150, 105];
                }
            }
        });

        doc.save(`Stock_Tracking_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <MainLayout pageTitle="Stock Tracking">
            <Head title="Stock Tracking" />

            <div className="space-y-6">
                <ActiveShopBanner />

                {/* ── Header ── */}
                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            Real-Time Stock Tracking
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Monitor usage across printing, retail, and photography service delivery.
                        </p>
                    </div>

                    {/* Export Dropdown */}
                    {canExport && (
                        <Menu as="div" className="relative inline-block text-left z-20">
                            <div>
                                <Menu.Button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors shadow-sm">
                                    <FileDown className="w-4 h-4" />
                                    Export
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                </Menu.Button>
                            </div>
                            <Transition
                                as={Fragment}
                                enter="transition ease-out duration-100"
                                enterFrom="transform opacity-0 scale-95"
                                enterTo="transform opacity-100 scale-100"
                                leave="transition ease-in duration-75"
                                leaveFrom="transform opacity-100 scale-100"
                                leaveTo="transform opacity-0 scale-95"
                            >
                                <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-gray-100 dark:divide-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black/5 focus:outline-none">
                                    <div className="p-1.5">
                                        <Menu.Item>
                                            {({ active }) => (
                                                <button
                                                    onClick={exportToExcel}
                                                    className={`${active ? 'bg-emerald-50 dark:bg-slate-700 text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'
                                                        } group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors`}
                                                >
                                                    <Table className="w-4 h-4 text-emerald-500" />
                                                    Export as Excel
                                                </button>
                                            )}
                                        </Menu.Item>
                                        <Menu.Item>
                                            {({ active }) => (
                                                <button
                                                    onClick={exportToPDF}
                                                    className={`${active ? 'bg-red-50 dark:bg-slate-700 text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
                                                        } group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium mt-1 transition-colors`}
                                                >
                                                    <FileText className="w-4 h-4 text-red-500" />
                                                    Export as PDF
                                                </button>
                                            )}
                                        </Menu.Item>
                                    </div>
                                </Menu.Items>
                            </Transition>
                        </Menu>
                    )}
                </div>

                {/* ── Summary stat cards ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="w-6 h-6 text-green-500" />
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Healthy</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{healthy}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <TrendingDown className="w-6 h-6 text-amber-500" />
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Low</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{low}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Critical</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{critical}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Search ── */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, SKU or category..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                </div>

                {/* ── Table ── */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-slate-700/40">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Item</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">SKU</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Location (Box)</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Category</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Current</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Reorder At</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                                        No stock items found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => router.get(route("inventory.logs", item.id))}
                                        className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                                    >
                                        {/* Thumbnail + Name */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {/* Product image — full URL from image_url accessor */}
                                                <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                                                    {item.image_url ? (
                                                        <img
                                                            src={item.image_url}
                                                            alt={item.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <Package className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                                    )}
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {item.name}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 font-mono text-sm text-gray-500 dark:text-gray-400">
                                            {item.sku}
                                        </td>

                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                            {item.location || "—"}
                                        </td>

                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                            {item.module}
                                        </td>

                                        {/* Current stock — red if critical */}
                                        <td className={`px-6 py-4 text-right font-bold ${item.status === "critical"
                                            ? "text-red-500"
                                            : item.status === "low"
                                                ? "text-amber-500"
                                                : "text-gray-900 dark:text-white"
                                            }`}>
                                            {item.current}
                                        </td>

                                        <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400">
                                            {item.reorderAt}
                                        </td>

                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusStyles[item.status]}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </MainLayout>
    );
}
