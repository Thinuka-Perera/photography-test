import React, { useState, useMemo, Fragment } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { Search, Filter, Eye, Edit, Printer, TrendingUp, DollarSign, Calendar, AlertCircle, CheckCircle2, ArrowRight, Plus, FileDown, ChevronDown, Table, FileText } from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────
// Status Badge
// ─────────────────────────────────────────────
function StatusBadge({ status }) {
    const statusConfig = {
        processing: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', label: 'Processing' },
        ready: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', label: 'Ready' },
        delivered: { bg: 'bg-emerald-100 dark:bg-emerald-950/35', text: 'text-emerald-600 dark:text-emerald-400', label: 'Delivered' },
    };
    const config = statusConfig[status] || statusConfig.processing;
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${config.bg} ${config.text}`}>
            {config.label}
        </span>
    );
}

// ─────────────────────────────────────────────
// Main Bill Index Page
// ─────────────────────────────────────────────
export default function BillIndex({ bills = [], filters = {}, dealers = [] }) {
    const [search, setSearch] = useState(filters.search || '');
    const [filterStatus, setFilterStatus] = useState(filters.status || '');
    const [filterEditor, setFilterEditor] = useState(filters.editor_id || '');
    const [filterDealer, setFilterDealer] = useState(filters.dealer_id || '');

    // Extract unique editors from bills
    const editors = useMemo(() => {
        const editorMap = new Map();
        bills.forEach(bill => {
            if (bill.editor_id && bill.editor?.name) {
                editorMap.set(bill.editor_id, bill.editor.name);
            }
        });
        return Array.from(editorMap.entries());
    }, [bills]);

    // Filter bills client-side
    const filteredBills = useMemo(() => {
        return bills.filter(bill => {
            if (search && !bill.bill_number.toLowerCase().includes(search.toLowerCase())) {
                return false;
            }
            if (filterStatus && bill.status !== filterStatus) {
                return false;
            }
            if (filterEditor && bill.editor_id !== parseInt(filterEditor)) {
                return false;
            }
            if (filterDealer && bill.dealer_id !== parseInt(filterDealer)) {
                return false;
            }
            return true;
        });
    }, [bills, search, filterStatus, filterEditor, filterDealer]);

    // Calculate summary stats
    const stats = useMemo(() => {
        return {
            total: bills.length,
            processing: bills.filter(b => b.status === 'processing').length,
            ready: bills.filter(b => b.status === 'ready').length,
            delivered: bills.filter(b => b.status === 'delivered').length,
            totalAmount: bills.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0),
        };
    }, [bills]);

    // ── Handlers ──────────────────────────────────────
    const handleStatusChange = (billId, newStatus) => {
        router.patch(route('studio.bills.updateStatus', billId), { status: newStatus });
    };

    const handleApplyFilters = () => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (filterStatus) params.append('status', filterStatus);
        if (filterEditor) params.append('editor_id', filterEditor);
        if (filterDealer) params.append('dealer_id', filterDealer);
        router.get(route('studio.bills.index'), Object.fromEntries(params));
    };

    const handleReset = () => {
        setSearch('');
        setFilterStatus('');
        setFilterEditor('');
        setFilterDealer('');
        router.get(route('studio.bills.index'));
    };

    const formatDataForExport = () => {
        return filteredBills.map(bill => ({
            'Bill Number': bill.bill_number || '—',
            'Date': bill.created_at ? new Date(bill.created_at).toLocaleDateString() : '—',
            'Customer': bill.customer_name || '—',
            'Editor': bill.editor?.name || '—',
            'Dealer': bill.dealer?.name || '—',
            'Subtotal (LKR)': Number(bill.subtotal || 0),
            'Discount (LKR)': Number(bill.discount_amount || 0),
            'Total (LKR)': Number(bill.after_discount || 0),
            'Paid (LKR)': Number(bill.paid_amount || 0),
            'Balance Due (LKR)': Number(bill.balance_due || 0),
            'Status': (bill.status || '').toUpperCase()
        }));
    };

    const exportToExcel = () => {
        const rawData = formatDataForExport();
        if (rawData.length === 0) {
            alert("No bills available to export.");
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(rawData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Studio Bills");
        XLSX.writeFile(workbook, `Bills_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = () => {
        const doc = new jsPDF('landscape');
        const rawData = formatDataForExport();
        if (rawData.length === 0) {
            doc.text("No bills data found.", 14, 20);
            doc.save(`Bills_Export_${new Date().toISOString().split('T')[0]}.pdf`);
            return;
        }

        doc.setFontSize(18);
        doc.text("Studio Bills Report", 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

        const tableColumn = Object.keys(rawData[0]);
        const tableRows = rawData.map(item => Object.values(item));

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 28,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] },
        });

        doc.save(`Bills_Export_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <MainLayout pageTitle="Bills">
            <Head title="Bills" />

            <div className="space-y-6">
                {/* Header Title with Export Dropdown */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Studio Bills Summary</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">View and update real-time bill states, invoices, and remaining balances.</p>
                    </div>
                    <div>
                        <Menu as="div" className="relative inline-block text-left z-20">
                            <div>
                                <Menu.Button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-605 transition-colors shadow-sm text-sm">
                                    <FileDown className="w-4 h-4" />
                                    Export Bills
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
                                                    className={`${active ? 'bg-emerald-50 dark:bg-slate-700 text-emerald-600 dark:text-emerald-400' : 'text-gray-750 dark:text-gray-300'
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
                                                    className={`${active ? 'bg-red-50 dark:bg-slate-700 text-red-600 dark:text-red-400' : 'text-gray-750 dark:text-gray-300'
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
                    </div>
                </div>

                {/* Hero Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                <Printer className="w-4 h-4 text-blue-500" />
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">Total Bills</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">Processing</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.processing}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                <TrendingUp className="w-4 h-4 text-blue-500" />
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">Ready</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.ready}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">Delivered</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.delivered}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                                <DollarSign className="w-4 h-4 text-primary-500" />
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">Total Revenue</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {Number(stats.totalAmount).toLocaleString('en-LK', { minimumFractionDigits: 0 })}
                        </p>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Filters</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        {/* Search */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Bill Number
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search..."
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                                />
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Status
                            </label>
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                            >
                                <option value="">All Statuses</option>
                                <option value="processing">Processing</option>
                                <option value="ready">Ready</option>
                                <option value="delivered">Delivered</option>
                            </select>
                        </div>

                        {/* Editor Filter */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Editor
                            </label>
                            <select
                                value={filterEditor}
                                onChange={e => setFilterEditor(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                            >
                                <option value="">All Editors</option>
                                {editors.map(([id, name]) => (
                                    <option key={id} value={id}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Dealer Filter */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-350 mb-2">
                                Dealer
                            </label>
                            <select
                                value={filterDealer}
                                onChange={e => setFilterDealer(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                            >
                                <option value="">All Dealers</option>
                                {dealers.map(dl => (
                                    <option key={dl.id} value={dl.id}>
                                        {dl.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Filter Actions */}
                        <div className="flex gap-2 items-end">
                            <button
                                onClick={handleApplyFilters}
                                className="flex-1 px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors"
                            >
                                Apply
                            </button>
                            <button
                                onClick={handleReset}
                                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 font-medium transition-colors"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bills Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                    {filteredBills.length === 0 ? (
                        <div className="p-12 text-center">
                            <Printer className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">No bills found</p>
                            <Link
                                href={route('studio.bills.create')}
                                className="inline-block mt-4 px-6 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors"
                            >
                                Create New Bill
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-bold text-gray-900 dark:text-white">
                                            Bill Number
                                        </th>
                                        <th className="px-6 py-4 text-left font-bold text-gray-900 dark:text-white">
                                            Date
                                        </th>
                                        <th className="px-6 py-4 text-left font-bold text-gray-900 dark:text-white">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-left font-bold text-gray-900 dark:text-white">
                                            Total
                                        </th>
                                        <th className="px-6 py-4 text-left font-bold text-gray-900 dark:text-white">
                                            Balance Due
                                        </th>
                                        <th className="px-6 py-4 text-left font-bold text-gray-900 dark:text-white">
                                            Editor
                                        </th>
                                        <th className="px-6 py-4 text-left font-bold text-gray-900 dark:text-white">
                                            Dealer
                                        </th>
                                        <th className="px-6 py-4 text-left font-bold text-gray-900 dark:text-white">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {filteredBills.map(bill => (
                                        <tr
                                            key={bill.id}
                                            className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    {bill.bill_number}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                    <Calendar className="w-4 h-4" />
                                                    {new Date(bill.created_at).toLocaleDateString('en-LK')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={bill.status} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    LKR {Number(bill.total_amount).toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`font-bold ${parseFloat(bill.balance_due) > 0
                                                    ? 'text-amber-600 dark:text-amber-400'
                                                    : 'text-emerald-600 dark:text-emerald-400'
                                                    }`}>
                                                    LKR {Number(bill.balance_due).toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    {bill.editor?.name || '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-gray-600 dark:text-gray-405">
                                                    {bill.dealer?.name || '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    {/* View */}
                                                    <Link
                                                        href={route('studio.bills.show', bill.id)}
                                                        className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                                        title="View bill"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>

                                                    {/* Edit (only if not delivered) */}
                                                    {bill.status !== 'delivered' && (
                                                        <Link
                                                            href={route('studio.bills.edit', bill.id)}
                                                            className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                                                            title="Edit bill"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Link>
                                                    )}

                                                    {/* Print */}
                                                    <button
                                                        onClick={() => router.get(route('studio.bills.print', { bill: bill.id, type: 'a4' }))}
                                                        className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
                                                        title="Print bill"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>

                                                    {/* Status Dropdown */}
                                                    <select
                                                        value={bill.status}
                                                        onChange={e => handleStatusChange(bill.id, e.target.value)}
                                                        className="px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                                    >
                                                        <option value="processing">Processing</option>
                                                        <option value="ready">Ready</option>
                                                        <option value="delivered">Delivered</option>
                                                    </select>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Create New Bill Button */}
                {filteredBills.length > 0 && (
                    <div className="flex justify-center">
                        <Link
                            href={route('studio.bills.create')}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-bold transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Create New Bill
                        </Link>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
