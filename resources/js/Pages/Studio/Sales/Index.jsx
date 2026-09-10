import { Link, router, usePage } from '@inertiajs/react';
import { useState, Fragment } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { formatMoney, formatDateShort } from '@/utils/format';
import { FileText, X, FileDown, ChevronDown, Table } from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const STATUS_COLORS = {
    processing: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    delivered: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
    completed: 'bg-green-100 dark:bg-emerald-900/30 text-green-700 dark:text-emerald-300',
    settled: 'bg-green-100 dark:bg-emerald-900/30 text-green-700 dark:text-emerald-300',
    outstanding: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    overdue: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    pending: 'bg-yellow-100 dark:bg-amber-900/30 text-yellow-700 dark:text-amber-300',
    refunded: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    partially_refunded: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    cancelled: 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300',
    reclaimed: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/30',
};

export default function SalesIndex({ sales, filters, canViewProfit }) {
    const { auth } = usePage().props;
    const canExport = Boolean(
        auth?.access?.is_super_admin ||
        auth?.access?.page_lookup?.['sales-history.export'] ||
        auth?.access?.page_lookup?.['sales-history']
    );
    const [form, setForm] = useState({
        search: filters.search ?? '',
        date_from: filters.date_from ?? '',
        date_to: filters.date_to ?? '',
        method: filters.method ?? '',
        status: filters.status ?? '',
    });

    const handleFilter = (e) => {
        e.preventDefault();
        router.get(route('studio.sales.index'), form, {
            preserveState: true,
            replace: true,
        });
    };

    const handleReset = () => {
        const empty = {
            search: '',
            date_from: '',
            date_to: '',
            method: '',
            status: '',
        };
        setForm(empty);
        router.get(route('studio.sales.index'), {}, { replace: true });
    };

    const formatDataForExport = () => {
        return sales.data.map(sale => {
            const data = {
                'Bill #': sale.bill_number || '—',
                'Date & Time': formatDateShort(sale.created_at),
                'Editor': sale.editor?.name ?? '—',
                'Total Amount (LKR)': Number(sale.total_amount || 0),
            };
            if (canViewProfit) {
                data['Profit (LKR)'] = Number(sale.profit || 0);
            }
            data['Payment Method'] = sale.payment_method ?? '—';
            data['Status'] = (sale.status || '').replace(/_/g, ' ').toUpperCase();
            return data;
        });
    };

    const exportToExcel = () => {
        const rawData = formatDataForExport();
        if (rawData.length === 0) {
            alert("No data available to export.");
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(rawData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sales History");
        XLSX.writeFile(workbook, `Transactions_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        const rawData = formatDataForExport();
        if (rawData.length === 0) {
            doc.text("No transaction data found.", 14, 20);
            doc.save(`Transactions_Export_${new Date().toISOString().split('T')[0]}.pdf`);
            return;
        }

        doc.setFontSize(18);
        doc.text("Transaction History Report", 14, 15);
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

        doc.save(`Transactions_Export_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <MainLayout pageTitle="Transaction History">
            <div className="bg-gray-50 dark:bg-slate-900 rounded-2xl p-4 md:p-6 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Transaction History</h1>
                        <p className="text-sm text-gray-400 dark:text-slate-400 mt-0.5">
                            {sales.total} total transactions
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Export Dropdown */}
                        {canExport && (
                            <Menu as="div" className="relative inline-block text-left z-20">
                                <div>
                                    <Menu.Button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-650 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors shadow-sm text-sm">
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
                                                        className={`${active ? 'bg-emerald-50 dark:bg-slate-750 text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'
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
                                                        className={`${active ? 'bg-red-50 dark:bg-slate-750 text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
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

                        <Link
                            href={route('studio.pos.index')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl
                                   text-xs md:text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            Back to POS
                        </Link>
                    </div>
                </div>

                <form
                    onSubmit={handleFilter}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 mb-5"
                >
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <input
                            type="text"
                            placeholder="Search bill #"
                            value={form.search}
                            onChange={(e) => setForm({ ...form, search: e.target.value })}
                            className="px-3 py-2 border border-gray-200 rounded-xl text-sm
                                   dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500
                                   focus:outline-none focus:ring-2 focus:ring-blue-300
                                   col-span-2 md:col-span-1"
                        />
                        <input
                            type="date"
                            value={form.date_from}
                            onChange={(e) => setForm({ ...form, date_from: e.target.value })}
                            className="px-3 py-2 border border-gray-200 rounded-xl text-sm
                                   dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100
                                   focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                        <input
                            type="date"
                            value={form.date_to}
                            onChange={(e) => setForm({ ...form, date_to: e.target.value })}
                            className="px-3 py-2 border border-gray-200 rounded-xl text-sm
                                   dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100
                                   focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                        <select
                            value={form.method}
                            onChange={(e) => setForm({ ...form, method: e.target.value })}
                            className="px-3 py-2 border border-gray-200 rounded-xl text-sm
                                   dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100
                                   focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                            <option value="">All Methods</option>
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="credit">Credit Bill</option>
                            <option value="advance">Advance Payment</option>
                        </select>
                        <select
                            value={form.status}
                            onChange={(e) => setForm({ ...form, status: e.target.value })}
                            className="px-3 py-2 border border-gray-200 rounded-xl text-sm
                                   dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100
                                   focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                            <option value="">All Status</option>
                            <option value="processing">Processing</option>
                            <option value="delivered">Delivered</option>
                            <option value="settled">Settled</option>
                            <option value="outstanding">Outstanding</option>
                            <option value="overdue">Overdue</option>
                            <option value="completed">Completed</option>
                            <option value="refunded">Refunded</option>
                            <option value="partially_refunded">Partial Refund</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="flex-1 py-2 bg-blue-600 text-white rounded-xl
                                       text-sm font-medium hover:bg-blue-700
                                       transition-colors"
                            >
                                Filter
                            </button>
                            <button
                                type="button"
                                onClick={handleReset}
                                className="px-3 py-2 border border-gray-200 rounded-xl
                                       dark:border-slate-600 text-sm text-gray-500 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700
                                       transition-colors inline-flex items-center"
                                aria-label="Clear filters"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </form>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
                                <tr className="text-left text-xs text-gray-400 uppercase tracking-wide">
                                    <th className="px-4 py-3 font-medium">Bill #</th>
                                    <th className="px-4 py-3 font-medium">Date & Time</th>
                                    <th className="px-4 py-3 font-medium">Editor</th>
                                    <th className="px-4 py-3 font-medium text-right">Total</th>
                                    {canViewProfit && <th className="px-4 py-3 font-medium text-right">Profit</th>}
                                    <th className="px-4 py-3 font-medium">Payment</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={canViewProfit ? 8 : 7} className="px-4 py-12 text-center text-sm">
                                            <div className="flex flex-col items-center gap-2 text-gray-300 dark:text-slate-500">
                                                <FileText className="w-10 h-10" />
                                                <span>No transactions found</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    sales.data.map((sale) => (
                                        <tr
                                            key={sale.id}
                                            className="border-b border-gray-50 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors"
                                        >
                                            <td className="px-4 py-3 font-mono text-xs text-blue-600 font-medium">
                                                {sale.bill_number}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 dark:text-slate-400 text-xs">
                                                {formatDateShort(sale.created_at)}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                                                {sale.editor?.name ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-slate-100">
                                                {formatMoney(sale.total_amount)}
                                            </td>
                                            {canViewProfit && (
                                                <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                                                    {formatMoney(sale.profit)}
                                                </td>
                                            )}
                                            <td className="px-4 py-3">
                                                <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-full capitalize">
                                                    {sale.payment_method ?? '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[sale.status] ?? ''}`}
                                                >
                                                    {sale.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Link
                                                    href={route('studio.bills.show', sale.id)}
                                                    className="text-xs text-blue-500 dark:text-blue-400 hover:underline"
                                                >
                                                    View
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {sales.last_page > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-700">
                            <p className="text-xs text-gray-400 dark:text-slate-400">
                                Showing {sales.from}–{sales.to} of {sales.total}
                            </p>
                            <div className="flex gap-1">
                                {sales.links.map((link) => (
                                    <button
                                        key={`${link.label}-${link.url ?? 'no-url'}-${link.active ? 'active' : 'inactive'}`}
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url)}
                                        className={`px-3 py-1.5 rounded-lg text-xs transition-colors
                                        ${link.active
                                                ? 'bg-blue-600 text-white'
                                                : link.url
                                                    ? 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600'
                                                    : 'bg-gray-50 dark:bg-slate-800 text-gray-300 dark:text-slate-500 cursor-not-allowed'
                                            }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
