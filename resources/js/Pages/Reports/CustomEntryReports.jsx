import MainLayout from "@/Layouts/MainLayout";
import ActiveShopBanner from "@/Modules/Shops/Components/ActiveShopBanner";
import { Head, router, usePage } from "@inertiajs/react";
import {
    Search,
    FileDown,
    ChevronDown,
    Table,
    FileText,
    TrendingUp,
    DollarSign,
    Layers,
    ReceiptText,
    Percent
} from "lucide-react";
import { useState, Fragment } from "react";
import { Menu, Transition } from '@headlessui/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatMoney, formatDate } from '@/utils/format';

export default function CustomEntryReports({
    items = [],
    categories = [],
    stats = {},
    filters = {},
}) {
    const { auth } = usePage().props;
    const canExport = Boolean(
        auth?.access?.is_super_admin ||
        auth?.access?.page_lookup?.['custom-entry-reports.export'] ||
        auth?.access?.page_lookup?.['custom-entry-reports']
    );
    const [search, setSearch] = useState("");
    const [startDate, setStartDate] = useState(filters.start_date || "");
    const [endDate, setEndDate] = useState(filters.end_date || "");
    const [categoryId, setCategoryId] = useState(filters.category_id || "");

    const [editingCosts, setEditingCosts] = useState({});
    const [savingIds, setSavingIds] = useState({});

    const handleSaveCost = (itemId) => {
        const value = editingCosts[itemId];
        if (value === undefined) return;

        const item = items.find(i => i.id === itemId);
        const parsedVal = value === "" ? null : parseFloat(value);
        const originalVal = item?.cost ?? null;

        if (parsedVal === originalVal) {
            setEditingCosts(prev => {
                const next = { ...prev };
                delete next[itemId];
                return next;
            });
            return;
        }

        setSavingIds(prev => ({ ...prev, [itemId]: true }));

        router.patch(
            route('reports.custom-entries.cost.update', itemId),
            { cost: parsedVal },
            {
                preserveScroll: true,
                onFinish: () => {
                    setSavingIds(prev => ({ ...prev, [itemId]: false }));
                    setEditingCosts(prev => {
                        const next = { ...prev };
                        delete next[itemId];
                        return next;
                    });
                }
            }
        );
    };

    const handleFilterChange = (updates) => {
        const newFilters = {
            start_date: updates.startDate !== undefined ? updates.startDate : startDate,
            end_date: updates.endDate !== undefined ? updates.endDate : endDate,
            category_id: updates.categoryId !== undefined ? updates.categoryId : categoryId,
        };

        router.get(
            route('reports.custom-entries'),
            newFilters,
            {
                preserveState: true,
                replace: true,
            }
        );
    };

    // Filter items client-side based on search term
    const filteredItems = items.filter(item => {
        const q = search.toLowerCase();
        return (
            item.bill_number?.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q) ||
            item.category_name?.toLowerCase().includes(q)
        );
    });

    const formatDataForExport = () => {
        return filteredItems.map((item, idx) => ({
            '#': idx + 1,
            'Date': formatDate(item.sale_date) || item.sale_date,
            'Receipt ID': item.bill_number || '—',
            'Category': item.category_name || '—',
            'Description': item.description || '—',
            'Qty': item.quantity,
            'Unit Price (LKR)': item.unit_price,
            'Unit Cost (LKR)': item.cost !== null ? item.cost : '—',
            'Discount (LKR)': item.discount_amount,
            'Revenue (LKR)': item.total_revenue,
            'Profit (LKR)': item.profit,
        }));
    };

    const exportToExcel = () => {
        const rawData = formatDataForExport();
        if (rawData.length === 0) {
            alert("No data available to export.");
            return;
        }

        const headerRows = [
            ["PHOTOGRAPHY SHOP MANAGEMENT SYSTEM"],
            ["Custom Entry Sales Report"],
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
            { wch: 6 },   // #
            { wch: 22 },  // Date
            { wch: 18 },  // Receipt ID
            { wch: 20 },  // Category
            { wch: 35 },  // Description
            { wch: 8 },   // Qty
            { wch: 16 },  // Unit Price
            { wch: 16 },  // Unit Cost
            { wch: 16 },  // Discount
            { wch: 18 },  // Revenue
            { wch: 18 },  // Profit
        ];

        worksheet['!cols'] = cols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Custom Entries");
        XLSX.writeFile(workbook, `Custom_Entry_Report_${startDate}_to_${endDate}.xlsx`);
    };

    const exportToPDF = () => {
        const doc = new jsPDF('landscape');

        if (filteredItems.length === 0) {
            doc.text("No data found.", 14, 20);
            doc.save(`Custom_Entry_Report_${startDate}_to_${endDate}.pdf`);
            return;
        }

        doc.setFontSize(20);
        doc.setTextColor(15, 23, 42); // Dark Navy
        doc.text('PHOTOGRAPHY SHOP SYSTEM', 14, 20);

        doc.setFontSize(12);
        doc.setTextColor(71, 85, 105);
        doc.text(`Custom Entry Sales Report (${startDate} to ${endDate})`, 14, 28);

        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text(`Generated on: ${new Date().toLocaleString()} | Total Entries: ${filteredItems.length}`, 14, 34);

        const rawData = formatDataForExport();
        const tableColumn = Object.keys(rawData[0]);
        const tableRows = rawData.map(item => Object.values(item));

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 2, font: 'helvetica' },
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            columnStyles: {
                0: { halign: 'center' }, // #
                1: { halign: 'left' },   // Date
                2: { halign: 'left' },   // Receipt ID
                5: { halign: 'center' }, // Qty
                6: { halign: 'right' },  // Unit Price
                7: { halign: 'right' },  // Unit Cost
                8: { halign: 'right' },  // Discount
                9: { halign: 'right' },  // Revenue
                10: { halign: 'right' }, // Profit
            }
        });

        doc.save(`Custom_Entry_Report_${startDate}_to_${endDate}.pdf`);
    };

    return (
        <MainLayout pageTitle="Custom Entry Reports">
            <Head title="Custom Entry Reports" />

            <div className="space-y-6">
                <ActiveShopBanner />

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            Custom Entry Sales Reports
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Review and download detailed records of manual/custom entries completed through the POS module.
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

                {/* Summary Statistics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Gross Revenue */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Gross Revenue</span>
                        <div className="flex items-center justify-between mt-3">
                            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatMoney(stats.total_revenue)}</span>
                            <DollarSign className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-xs text-gray-400 mt-1">Total revenue from manual sales</span>
                    </div>

                    {/* Total Profit */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Total Profit</span>
                        <div className="flex items-center justify-between mt-3">
                            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-450">{formatMoney(stats.total_profit)}</span>
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-xs text-gray-400 mt-1">Total profit calculated</span>
                    </div>

                    {/* Custom Items Sold */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Custom Items Sold</span>
                        <div className="flex items-center justify-between mt-3">
                            <span className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total_items_sold ?? 0}</span>
                            <Layers className="w-5 h-5 text-indigo-400" />
                        </div>
                        <span className="text-xs text-gray-400 mt-1">Cumulative product count</span>
                    </div>

                    {/* Receipts / Bills */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Receipts / Bills</span>
                        <div className="flex items-center justify-between mt-3">
                            <span className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total_transactions ?? 0}</span>
                            <ReceiptText className="w-5 h-5 text-slate-400" />
                        </div>
                        <span className="text-xs text-gray-400 mt-1">Unique bills generated</span>
                    </div>

                    {/* Total Discounts */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Total Discounts</span>
                        <div className="flex items-center justify-between mt-3">
                            <span className="text-xl font-bold text-rose-600 dark:text-rose-455">{formatMoney(stats.total_discounts)}</span>
                            <Percent className="w-5 h-5 text-rose-400" />
                        </div>
                        <span className="text-xs text-gray-400 mt-1">Total discounts applied</span>
                    </div>
                </div>

                {/* Filters Option */}
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
                                placeholder="Search entries..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Details Data Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-slate-700/40 border-b border-gray-100 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-16">#</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date & Time</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Receipt ID</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Category</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase font-mono w-16">Qty</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase font-mono font-bold">Unit Price</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase font-mono w-32 font-bold select-none">Unit Cost</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase font-mono">Discount</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase font-mono font-bold">Total Revenue</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase font-mono text-emerald-600 dark:text-emerald-450 font-bold">Profit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-sm">
                                {filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="px-6 py-16 text-center text-gray-450 dark:text-gray-500">
                                            No custom entry transactions found. Try adjusting filters or search query.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map((item, idx) => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors text-gray-700 dark:text-slate-200"
                                        >
                                            <td className="px-6 py-4 font-medium text-gray-400 dark:text-slate-500 w-16">
                                                {idx + 1}
                                            </td>

                                            <td className="px-6 py-4 font-medium text-gray-800 dark:text-slate-300">
                                                {formatDate(item.sale_date) || item.sale_date}
                                            </td>

                                            <td className="px-6 py-4 font-semibold text-primary-600 dark:text-blue-400 font-mono">
                                                {item.bill_number}
                                            </td>

                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                {item.category_name}
                                            </td>

                                            <td className="px-6 py-4 text-gray-800 dark:text-white font-medium max-w-xs truncate" title={item.description}>
                                                {item.description}
                                            </td>

                                            <td className="px-6 py-4 text-center font-bold text-slate-800 dark:text-white font-mono w-16">
                                                {item.quantity}
                                            </td>

                                            <td className="px-6 py-4 text-right font-mono text-gray-500 dark:text-slate-400">
                                                {formatMoney(item.unit_price)}
                                            </td>

                                            <td className="px-6 py-4 text-right font-mono text-gray-500 dark:text-slate-400 w-32">
                                                <div className="flex items-center justify-end gap-1 relative">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={editingCosts[item.id] !== undefined ? editingCosts[item.id] : (item.cost ?? "")}
                                                        onChange={(e) => setEditingCosts(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleSaveCost(item.id);
                                                            }
                                                        }}
                                                        onBlur={() => handleSaveCost(item.id)}
                                                        disabled={savingIds[item.id]}
                                                        placeholder="—"
                                                        className="w-20 px-1.5 py-1 text-right text-xs border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-primary-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white disabled:opacity-50"
                                                    />
                                                    {savingIds[item.id] && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping absolute right-2" />
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-right font-mono text-rose-500 dark:text-rose-450 font-medium">
                                                {item.discount_amount > 0 ? `-${formatMoney(item.discount_amount)}` : '—'}
                                            </td>

                                            <td className="px-6 py-4 text-right font-bold text-gray-800 dark:text-white font-mono">
                                                {formatMoney(item.total_revenue)}
                                            </td>

                                            <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-450 font-mono">
                                                {formatMoney(item.profit)}
                                            </td>
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
