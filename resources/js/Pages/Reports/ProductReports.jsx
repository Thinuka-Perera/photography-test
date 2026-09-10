import MainLayout from "@/Layouts/MainLayout";
import ActiveShopBanner from "@/Modules/Shops/Components/ActiveShopBanner";
import { Head, router, Link, usePage } from "@inertiajs/react";
import {
    Package,
    Search,
    FileDown,
    ChevronDown,
    Table,
    FileText,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Layers,
    AlertCircle,
    Store
} from "lucide-react";
import { useState, Fragment, useEffect } from "react";
import { Menu, Transition } from '@headlessui/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatMoney, formatDate } from '@/utils/format';

export default function ProductReports({
    products = [],
    categories = [],
    stats = {},
    filters = {},
    canViewEstimatedProfit = false,
}) {
    const { auth } = usePage().props;
    const canExport = Boolean(
        auth?.access?.is_super_admin ||
        auth?.access?.page_lookup?.['product-reports.export'] ||
        auth?.access?.page_lookup?.['product-reports']
    );
    const [search, setSearch] = useState("");
    const [startDate, setStartDate] = useState(filters.start_date || "");
    const [endDate, setEndDate] = useState(filters.end_date || "");
    const [categoryId, setCategoryId] = useState(filters.category_id || "");

    const handleFilterChange = (updates) => {
        const newFilters = {
            start_date: updates.startDate !== undefined ? updates.startDate : startDate,
            end_date: updates.endDate !== undefined ? updates.endDate : endDate,
            category_id: updates.categoryId !== undefined ? updates.categoryId : categoryId,
        };

        router.get(
            route('reports.products'),
            newFilters,
            {
                preserveState: true,
                replace: true,
            }
        );
    };

    // Front-end search filter on already items
    const filteredProducts = products.filter(p => {
        const q = search.toLowerCase();
        return (
            p.product_name?.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q) ||
            p.barcode?.toLowerCase().includes(q) ||
            p.category_name?.toLowerCase().includes(q)
        );
    });

    const formatDataForExport = () => {
        return filteredProducts.map(p => {
            const cost = Number(p.cost_price || 0);
            const price = Number(p.selling_price || 0);
            const stock = Number(p.current_stock || 0);
            const sold = Number(p.units_sold || 0);
            const rev = Number(p.revenue || 0);
            const profit = (price - cost) * sold;

            const row = {
                'SKU': p.sku || '—',
                'Barcode': p.barcode || '—',
                'Product Name': p.product_name || '—',
                'Category': p.category_name || '—',
                'Cost (LKR)': cost,
                'Price (LKR)': price,
                'Stock Level': stock,
                'Units Sold': sold,
                'Total Revenue (LKR)': rev,
            };

            if (canViewEstimatedProfit) {
                row['Est. Profit (LKR)'] = profit;
            }

            return row;
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
            ["Product Sales & Stock Report"],
            [`Date Range: ${startDate} to ${endDate}`],
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
            { s: { r: 3, c: 0 }, e: { r: 3, c: keys.length - 1 } },
        ];

        const cols = [
            { wch: 25 }, // SKU
            { wch: 20 }, // Barcode
            { wch: 35 }, // Name
            { wch: 20 }, // Category
            { wch: 15 }, // Cost
            { wch: 15 }, // Price
            { wch: 15 }, // Stock Level
            { wch: 15 }, // Units Sold
            { wch: 20 }, // Revenue
        ];
        if (canViewEstimatedProfit) {
            cols.push({ wch: 20 }); // Est. Profit
        }

        worksheet['!cols'] = cols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Products Report");
        XLSX.writeFile(workbook, `Product_Reports_${startDate}_to_${endDate}.xlsx`);
    };

    const exportToPDF = () => {
        const doc = new jsPDF('landscape');

        if (filteredProducts.length === 0) {
            doc.text("No data found.", 14, 20);
            doc.save(`Product_Reports_${startDate}_to_${endDate}.pdf`);
            return;
        }

        doc.setFontSize(20);
        doc.setTextColor(15, 23, 42); // Dark Navy
        doc.text('PHOTOGRAPHY SHOP SYSTEM', 14, 20);

        doc.setFontSize(12);
        doc.setTextColor(71, 85, 105);
        doc.text(`Product Sales & Stock Report (${startDate} to ${endDate})`, 14, 28);

        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text(`Generated on: ${new Date().toLocaleString()} | Total variants: ${filteredProducts.length}`, 14, 34);

        const rawData = formatDataForExport();
        const tableColumn = Object.keys(rawData[0]);
        const tableRows = rawData.map(item => Object.values(item));

        const columnStyles = {
            4: { halign: 'right' },  // Cost
            5: { halign: 'right' },  // Price
            6: { halign: 'center' }, // Stock Level
            7: { halign: 'center' }, // Units Sold
            8: { halign: 'right' },  // Revenue
        };
        if (canViewEstimatedProfit) {
            columnStyles[9] = { halign: 'right' }; // Est. Profit
        }

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 2, font: 'helvetica' },
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            columnStyles: columnStyles
        });

        doc.save(`Product_Reports_${startDate}_to_${endDate}.pdf`);
    };

    return (
        <MainLayout pageTitle="Product Reports">
            <Head title="Product Reports" />

            <div className="space-y-6">
                <ActiveShopBanner />

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            Product Sales & Inventory Contribution
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Track the demand, earnings, and stock viability of all retail and studio catalog items.
                        </p>
                    </div>

                    {/* Export Dropdown */}
                    <div className="flex items-center gap-3">
                        {canExport && (
                            <Menu as="div" className="relative inline-block text-left z-20">
                                <div>
                                    <Menu.Button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors shadow-sm">
                                        <FileDown className="w-4 h-4" />
                                        Export Data
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
                                                        Export to Excel
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
                                                        Export to PDF
                                                    </button>
                                                )}
                                            </Menu.Item>
                                        </div>
                                    </Menu.Items>
                                </Transition>
                            </Menu>
                        )}
                    </div>
                </div>

                {/* ── Summary Statistics Cards ── */}
                <div className={`grid grid-cols-2 lg:grid-cols-3 ${canViewEstimatedProfit ? 'xl:grid-cols-6' : 'xl:grid-cols-5'} gap-4`}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Products Catalog</span>
                        <div className="flex items-center justify-between mt-3">
                            <span className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total_variants ?? 0}</span>
                            <Package className="w-5 h-5 text-slate-400" />
                        </div>
                        <span className="text-xs text-gray-400 mt-1">Unique item variants</span>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Stock Available</span>
                        <div className="flex items-center justify-between mt-3">
                            <span className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total_stock_units ?? 0}</span>
                            <Layers className="w-5 h-5 text-indigo-400" />
                        </div>
                        <span className="text-xs text-gray-400 mt-1">Total physical units</span>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Inventory Valuation</span>
                        <div className="flex items-center justify-between mt-3">
                            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(stats.total_stock_value_retail)}</span>
                            <DollarSign className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-xs text-gray-400 mt-1">Cost valuation: {formatMoney(stats.total_stock_value_cost)}</span>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Units Sold</span>
                        <div className="flex items-center justify-between mt-3">
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total_units_sold ?? 0}</span>
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-xs text-gray-400 mt-1">Sold in date range</span>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Sales Earnings</span>
                        <div className="flex items-center justify-between mt-3">
                            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatMoney(stats.total_revenue)}</span>
                            <DollarSign className="w-5 h-5 text-primary-400" />
                        </div>
                        <span className="text-xs text-gray-400 mt-1">Total revenue contribution</span>
                    </div>

                    {canViewEstimatedProfit && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Estimated Profit</span>
                            <div className="flex items-center justify-between mt-3">
                                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatMoney(filteredProducts.reduce((sum, p) => sum + ((Number(p.selling_price || 0) - Number(p.cost_price || 0)) * Number(p.units_sold || 0)), 0))}
                                </span>
                                <TrendingUp className="w-5 h-5 text-emerald-500" />
                            </div>
                            <span className="text-xs text-gray-400 mt-1">Net profit from sales</span>
                        </div>
                    )}
                </div>

                {/* ── Filters ── */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-5 border border-gray-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-4 items-end shadow-sm">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">From Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                handleFilterChange({ startDate: e.target.value });
                            }}
                            className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">To Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                handleFilterChange({ endDate: e.target.value });
                            }}
                            className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Category</label>
                        <select
                            value={categoryId}
                            onChange={(e) => {
                                setCategoryId(e.target.value);
                                handleFilterChange({ categoryId: e.target.value });
                            }}
                            className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        >
                            <option value="">All Categories</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Products Table ── */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-slate-700/40 border-b border-gray-100 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Product</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">SKU / Barcode</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Category</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Cost (LKR)</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Selling (LKR)</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Current Stock</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Units Sold</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                                    {canViewEstimatedProfit && <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Profit (LKR)</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-sm">
                                {filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={canViewEstimatedProfit ? 9 : 8} className="px-6 py-16 text-center text-gray-400">
                                            No product report data found. Try adjusting filters or search query.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProducts.map((p) => (
                                        <tr
                                            key={p.id}
                                            className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                                        >
                                            <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                                                {p.product_name}
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex flex-col font-mono text-xs">
                                                    <span className="text-gray-500 dark:text-gray-400">SKU: {p.sku}</span>
                                                    <span className="text-gray-400 dark:text-gray-500">Bar: {p.barcode || '—'}</span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {p.category_name || <span className="opacity-40">—</span>}
                                            </td>

                                            <td className="px-6 py-4 text-right font-mono text-gray-500">
                                                {formatMoney(p.cost_price)}
                                            </td>

                                            <td className="px-6 py-4 text-right font-mono font-semibold text-gray-900 dark:text-white">
                                                {formatMoney(p.selling_price)}
                                            </td>

                                            <td className="px-6 py-4 text-right">
                                                <span className={`font-bold ${p.current_stock <= 0 ? 'text-red-500' : p.current_stock <= 10 ? 'text-amber-500' : 'text-gray-900 dark:text-white'}`}>
                                                    {p.current_stock}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 text-center font-bold text-blue-600 dark:text-blue-400">
                                                {p.units_sold}
                                            </td>

                                            <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                                {formatMoney(p.revenue)}
                                            </td>

                                            {canViewEstimatedProfit && (
                                                <td className="px-6 py-4 text-right font-bold text-teal-600 dark:text-teal-400 font-mono">
                                                    {formatMoney((Number(p.selling_price || 0) - Number(p.cost_price || 0)) * Number(p.units_sold || 0))}
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
