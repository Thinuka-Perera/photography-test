import { Link, router, useForm, usePage } from '@inertiajs/react';
import { useState, Fragment } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import SummaryCard from '@/Components/Reports/SummaryCard';
import HourlyChart from '@/Components/Reports/HourlyChart';
import PaymentBreakdown from '@/Components/Reports/PaymentBreakdown';
import { formatMoney, formatDate } from '@/utils/format';
import { FileText, DollarSign, Tag, BarChart3, Building2, User, TrendingUp, TrendingDown, Package, FileDown, ChevronDown, Table, Edit2, Trash2, Undo, Search, X, Wallet } from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function DailySales({
    startDate,
    endDate,
    date,
    summary,
    paymentBreakdown,
    refundSummary,
    hourlyBreakdown,
    productsSold = [],
    expenses = [],
    totalDailyExpenses = 0,
    totalItemCost = 0,
    totalReturned = 0,
    canViewNetProfit = false,
    canManageExpenses = false,
    totalCollection,
}) {
    const { auth } = usePage().props;
    const canExport = Boolean(
        auth?.access?.is_super_admin ||
        auth?.access?.page_lookup?.['daily-sales-report.export'] ||
        auth?.access?.page_lookup?.['daily-sales-report']
    );
    const [selectedStartDate, setSelectedStartDate] = useState(startDate);
    const [selectedEndDate, setSelectedEndDate] = useState(endDate);

    const [productQuery, setProductQuery] = useState('');
    const [categoryQuery, setCategoryQuery] = useState('');

    const [editingExpenseId, setEditingExpenseId] = useState(null);
    const [deletingExpenseId, setDeletingExpenseId] = useState(null);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        category: 'Raw Materials',
        description: '',
        amount: '',
        expense_date: startDate,
    });

    const handleSubmitExpense = (e) => {
        e.preventDefault();
        if (editingExpenseId) {
            put(route('reports.daily.expenses.update', editingExpenseId), {
                onSuccess: () => {
                    setEditingExpenseId(null);
                    reset('description', 'amount');
                },
            });
        } else {
            post(route('reports.daily.expenses.store'), {
                onSuccess: () => {
                    reset('description', 'amount');
                },
            });
        }
    };

    const handleEditExpense = (expense) => {
        setEditingExpenseId(expense.id);
        setData({
            category: expense.category,
            description: expense.description || '',
            amount: expense.amount.toString(),
            expense_date: expense.expense_date,
        });
    };

    const handleCancelEdit = () => {
        setEditingExpenseId(null);
        reset();
    };

    const handleDeleteExpense = (expenseId) => {
        setDeletingExpenseId(expenseId);
    };

    const handleStartDateChange = (e) => {
        const val = e.target.value;
        setSelectedStartDate(val);
        let currentEnd = selectedEndDate;
        if (new Date(val) > new Date(selectedEndDate)) {
            currentEnd = val;
            setSelectedEndDate(val);
        }
        router.get(
            route('reports.daily'),
            { start_date: val, end_date: currentEnd },
            {
                preserveState: true,
                replace: true,
            },
        );
    };

    const handleEndDateChange = (e) => {
        const val = e.target.value;
        setSelectedEndDate(val);
        let currentStart = selectedStartDate;
        if (new Date(val) < new Date(selectedStartDate)) {
            currentStart = val;
            setSelectedStartDate(val);
        }
        router.get(
            route('reports.daily'),
            { start_date: currentStart, end_date: val },
            {
                preserveState: true,
                replace: true,
            },
        );
    };

    const netRevenue = (
        parseFloat(summary?.gross_revenue || 0) -
        parseFloat(refundSummary?.total_refunded || 0) -
        parseFloat(totalReturned || 0)
    ).toFixed(2);

    const totalCollectionVal =
        totalCollection !== undefined && totalCollection !== null
            ? parseFloat(totalCollection)
            : Math.max(0, (paymentBreakdown || []).reduce(
                  (sum, d) => sum + parseFloat(d.total || 0),
                  0
              ) - parseFloat(totalReturned || 0));

    const netProfit = canViewNetProfit
        ? (
            parseFloat(netRevenue || 0) -
            parseFloat(totalItemCost || 0)
        ).toFixed(2)
        : null;

    const uniqueCategories = Array.from(
        new Set(
            productsSold
                .map((p) => p.category_name)
                .filter((name) => name !== null && name !== undefined && name !== '')
        )
    ).sort();
    const hasEmptyCategory = productsSold.some((p) => !p.category_name);

    const filteredProducts = productsSold.filter((p) => {
        const matchesProduct = (p.product_name || '')
            .toLowerCase()
            .includes(productQuery.toLowerCase());
            
        const catName = p.category_name || '—';
        const matchesCategory = categoryQuery === '' || catName === categoryQuery;
        
        return matchesProduct && matchesCategory;
    });

    const exportToExcel = () => {
        const summaryData = [
            { Metric: "Start Date", Value: startDate },
            { Metric: "End Date", Value: endDate },
            { Metric: "Total Transactions", Value: summary?.total_transactions ?? 0 },
            { Metric: "Daily Income (LKR)", Value: Number(netRevenue) },
            { Metric: "Total Collection (LKR)", Value: Number(totalCollectionVal) },
            { Metric: "Total Returns (LKR)", Value: Number(totalReturned) },
            { Metric: "Discounts Given (LKR)", Value: Number(summary?.total_discounts || 0) },
            { Metric: "Commission Payable (LKR)", Value: Number(summary?.total_commission || 0) },
            { Metric: "Highest Sale (LKR)", Value: Number(summary?.highest_sale || 0) },
            { Metric: "Lowest Sale (LKR)", Value: Number(summary?.lowest_sale || 0) },
            { Metric: "Total Daily Expenses (LKR)", Value: Number(totalDailyExpenses) },
            { Metric: "Total Item Cost (LKR)", Value: Number(totalItemCost) },
        ];

        if (canViewNetProfit) {
            summaryData.push({ Metric: "Net Profit (LKR)", Value: Number(netProfit) });
        }

        const paymentData = (paymentBreakdown || []).map((item) => ({
            'Payment Method': (item.method || '').toUpperCase(),
            'Total Received (LKR)': Number(item.total || 0),
            'Transactions count': Number(item.count || 0)
        }));

        const productsData = productsSold.map((p, idx) => {
            const row = {
                'Rank': idx + 1,
                'Product Name': p.product_name || '—',
                'Category': p.category_name || '—',
                'Units Sold': Number(p.total_qty || 0),
                'Total Revenue (LKR)': Number(p.total_revenue || 0)
            };
            if (canViewNetProfit) {
                row['Total Profit (LKR)'] = Number(p.total_profit || 0);
            }
            return row;
        });

        const expensesData = expenses.map((exp) => ({
            Category: exp.category,
            Description: exp.description || '—',
            Amount: Number(exp.amount),
            Date: exp.expense_date,
            'Created By': exp.created_by
        }));

        const workbook = XLSX.utils.book_new();

        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, wsSummary, "Summary");

        const wsPayments = XLSX.utils.json_to_sheet(paymentData);
        XLSX.utils.book_append_sheet(workbook, wsPayments, "Payment Breakdown");

        const wsProducts = XLSX.utils.json_to_sheet(productsData);
        XLSX.utils.book_append_sheet(workbook, wsProducts, "Products Sold");

        const wsExpenses = XLSX.utils.json_to_sheet(expensesData);
        XLSX.utils.book_append_sheet(workbook, wsExpenses, "Expenses");

        XLSX.writeFile(workbook, `Daily_Sales_Report_${startDate}_to_${endDate}.xlsx`);
    };

    const exportToPDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.setTextColor(15, 23, 42);
        doc.text("Daily Sales/Expenses Report", 14, 20);
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text(`Report Period: ${startDate} to ${endDate}`, 14, 28);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);

        const summaryRows = [
            ["Transactions count", summary?.total_transactions ?? 0],
            ["Daily Income", `LKR ${Number(netRevenue).toLocaleString()}`],
            ["Total Collection", `LKR ${Number(totalCollectionVal).toLocaleString()}`],
            ["Total Returns", `LKR ${Number(totalReturned).toLocaleString()}`],
            ["Discounts Given", `LKR ${Number(summary?.total_discounts || 0).toLocaleString()}`],
            ["Commission Payable", `LKR ${Number(summary?.total_commission || 0).toLocaleString()}`],
            ["Highest Sale", `LKR ${Number(summary?.highest_sale || 0).toLocaleString()}`],
            ["Lowest Sale", `LKR ${Number(summary?.lowest_sale || 0).toLocaleString()}`],
            ["Total Daily Expenses", `LKR ${Number(totalDailyExpenses).toLocaleString()}`],
            ["Total Item Cost", `LKR ${Number(totalItemCost).toLocaleString()}`],
        ];

        if (canViewNetProfit) {
            summaryRows.push(["Net Profit", `LKR ${Number(netProfit).toLocaleString()}`]);
        }

        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text("Financial Summary", 14, 45);

        autoTable(doc, {
            head: [["Metric", "Value"]],
            body: summaryRows,
            startY: 50,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] },
        });

        let currentY = doc.lastAutoTable.finalY + 12;
        doc.text("Payment Methods Breakdown", 14, currentY);

        const paymentRows = (paymentBreakdown || []).map((item) => [
            (item.method || '').toUpperCase(),
            `LKR ${Number(item.total || 0).toLocaleString()}`,
            item.count || 0
        ]);

        autoTable(doc, {
            head: [["Payment Method", "Total Received", "Count"]],
            body: paymentRows,
            startY: currentY + 4,
            theme: 'grid',
            headStyles: { fillColor: [71, 85, 105] },
        });

        currentY = doc.lastAutoTable.finalY + 12;
        doc.text("Products Sold Today Summary", 14, currentY);

        const productHeaders = ["Rank", "Product Name", "Category", "Units Sold", "Total Revenue"];
        if (canViewNetProfit) {
            productHeaders.push("Total Profit");
        }

        const productRows = productsSold.map((p, idx) => {
            const row = [
                idx + 1,
                p.product_name || '—',
                p.category_name || '—',
                p.total_qty || 0,
                `LKR ${Number(p.total_revenue || 0).toLocaleString()}`
            ];
            if (canViewNetProfit) {
                row.push(`LKR ${Number(p.total_profit || 0).toLocaleString()}`);
            }
            return row;
        });

        autoTable(doc, {
            head: [productHeaders],
            body: productRows,
            startY: currentY + 4,
            theme: 'grid',
            headStyles: { fillColor: [100, 116, 139] },
        });

        currentY = doc.lastAutoTable.finalY + 12;
        doc.text(`Daily Expenses (Total: LKR ${Number(totalDailyExpenses).toLocaleString()})`, 14, currentY);

        const expenseRows = expenses.map((e) => [
            e.category,
            e.description || '—',
            `LKR ${Number(e.amount).toLocaleString()}`,
            e.expense_date,
            e.created_by
        ]);

        autoTable(doc, {
            head: [["Category", "Description", "Amount", "Date", "Created By"]],
            body: expenseRows,
            startY: currentY + 4,
            theme: 'grid',
            headStyles: { fillColor: [14, 116, 144] },
        });

        doc.save(`Daily_Sales_Report_${startDate}_to_${endDate}.pdf`);
    };

    return (
        <MainLayout pageTitle="Daily Sales Report">
            <div className="bg-light-bg dark:bg-dark-bg rounded-2xl p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Daily Sales Report</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {startDate === endDate ? (
                                formatDate(startDate + 'T00:00:00', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })
                            ) : (
                                `${formatDate(startDate + 'T00:00:00', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                })} — ${formatDate(endDate + 'T00:00:00', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                })}`
                            )}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">From</span>
                            <input
                                type="date"
                                value={selectedStartDate}
                                onChange={handleStartDateChange}
                                max={new Date().toISOString().split('T')[0]}
                                className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl
                                       text-sm focus:outline-none focus:ring-2
                                       focus:ring-blue-300 dark:focus:ring-blue-500
                                       bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div className="flex items-center gap-1.5 font-medium">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">To</span>
                            <input
                                type="date"
                                value={selectedEndDate}
                                onChange={handleEndDateChange}
                                max={new Date().toISOString().split('T')[0]}
                                className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl
                                       text-sm focus:outline-none focus:ring-2
                                       focus:ring-blue-300 dark:focus:ring-blue-500
                                       bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            />
                        </div>

                        {/* Export Dropdown */}
                        {canExport && (
                            <Menu as="div" className="relative inline-block text-left z-20">
                                <div>
                                    <Menu.Button className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-250 font-medium hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors shadow-sm text-sm">
                                        <FileDown className="w-4 h-4" />
                                        Export
                                        <ChevronDown className="w-4 h-4 text-gray-450" />
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
                                                        className={`${active ? 'bg-emerald-50 dark:bg-slate-750 text-emerald-600 dark:text-emerald-400' : 'text-gray-705 dark:text-gray-300'
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
                                                        className={`${active ? 'bg-red-50 dark:bg-slate-750 text-red-600 dark:text-red-400' : 'text-gray-705 dark:text-gray-300'
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
                                   text-sm font-medium hover:bg-blue-700
                                   transition-colors"
                        >
                            Back to POS
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                    <SummaryCard
                        label="Transactions"
                        value={summary?.total_transactions ?? 0}
                        sub="completed sales"
                        color="blue"
                        icon={FileText}
                    />
                    <SummaryCard
                        label="Daily Income"
                        value={formatMoney(netRevenue)}
                        sub={`Avg: ${formatMoney(summary?.avg_sale_value)}`}
                        color="green"
                        icon={DollarSign}
                    />
                    <SummaryCard
                        label="Total Collection"
                        value={formatMoney(totalCollectionVal)}
                        sub="Total received"
                        color="purple"
                        icon={Wallet}
                    />
                    <SummaryCard
                        label="Discounts Given"
                        value={formatMoney(summary?.total_discounts)}
                        color="orange"
                        icon={Tag}
                    />
                    <SummaryCard
                        label="Total Expenses"
                        value={formatMoney(totalDailyExpenses)}
                        sub={`${expenses.length} expense(s)`}
                        color="red"
                        icon={BarChart3}
                    />
                </div>

                <div className={`grid grid-cols-2 ${canViewNetProfit ? 'lg:grid-cols-6' : 'lg:grid-cols-4'} gap-3 mb-6`}>
                    {canViewNetProfit && (
                        <>
                            <SummaryCard
                                label="Net Profit"
                                value={formatMoney(netProfit)}
                                color={parseFloat(netProfit) >= 0 ? 'green' : 'red'}
                                icon={TrendingUp}
                            />
                            <SummaryCard
                                label="Total Item Cost"
                                value={formatMoney(totalItemCost)}
                                color="rose"
                                icon={DollarSign}
                            />
                        </>
                    )}
                    <SummaryCard
                        label="Total Returns"
                        value={formatMoney(totalReturned)}
                        color="orange"
                        icon={Undo}
                    />
                    <SummaryCard
                        label="Commission"
                        value={formatMoney(summary?.total_commission)}
                        color="blue"
                        icon={User}
                    />
                    <SummaryCard
                        label="Highest Sale"
                        value={formatMoney(summary?.highest_sale)}
                        color="green"
                        icon={TrendingUp}
                    />
                    <SummaryCard
                        label="Lowest Sale"
                        value={formatMoney(summary?.lowest_sale)}
                        color="orange"
                        icon={TrendingDown}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    <div className="lg:col-span-2">
                        <HourlyChart data={hourlyBreakdown} />
                    </div>
                    <div>
                        <PaymentBreakdown data={paymentBreakdown} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-2 border-b border-gray-50 dark:border-slate-750">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Products Sold Today</h3>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                            {/* Product Search */}
                            <div className="relative w-full sm:w-64">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </span>
                                <input
                                    type="text"
                                    placeholder="Filter by product..."
                                    value={productQuery}
                                    onChange={(e) => setProductQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-xl
                                           text-xs focus:outline-none focus:ring-2
                                           focus:ring-blue-300 dark:focus:ring-blue-500
                                           bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            {/* Category Filter */}
                            <div className="relative w-full sm:w-48">
                                <select
                                    value={categoryQuery}
                                    onChange={(e) => setCategoryQuery(e.target.value)}
                                    className="w-full px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-xl
                                           text-xs focus:outline-none focus:ring-2
                                           focus:ring-blue-300 dark:focus:ring-blue-500
                                           bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">All Categories</option>
                                    {uniqueCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                    {hasEmptyCategory && (
                                        <option value="—">No Category</option>
                                    )}
                                </select>
                            </div>

                            {/* Clear Filters Button */}
                            {(productQuery !== '' || categoryQuery !== '') && (
                                <button
                                    onClick={() => {
                                        setProductQuery('');
                                        setCategoryQuery('');
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {productsSold.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-300 dark:text-gray-500">
                            <Package className="w-10 h-10 mb-2" />
                            <p className="text-sm">No sales recorded today</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-300 dark:text-gray-500">
                            <Package className="w-10 h-10 mb-2" />
                            <p className="text-sm">No products match your filters</p>
                            <button
                                onClick={() => {
                                    setProductQuery('');
                                    setCategoryQuery('');
                                }}
                                className="mt-2 text-xs text-blue-500 hover:text-blue-750 underline font-medium"
                            >
                                Clear filters
                            </button>
                        </div>
                    ) : (
                        <Fragment>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-slate-700">
                                            <th className="pb-2 font-medium">#</th>
                                            <th className="pb-2 font-medium">Product</th>
                                            <th className="pb-2 font-medium">Category</th>
                                            <th className="pb-2 font-medium text-right">Units Sold</th>
                                            <th className="pb-2 font-medium text-right">Revenue</th>
                                            {canViewNetProfit && <th className="pb-2 font-medium text-right">Profit</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProducts.map((p, i) => (
                                            <tr
                                                key={p.product_id}
                                                className="border-b border-gray-50 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                                            >
                                                <td className="py-2.5 text-gray-400 dark:text-gray-500">{i + 1}</td>
                                                <td className="py-2.5 font-medium text-gray-805 dark:text-gray-200">{p.product_name}</td>
                                                <td className="py-2.5 text-gray-600 dark:text-gray-400">{p.category_name || '—'}</td>
                                                <td className="py-2.5 text-right text-gray-600 dark:text-gray-400">{p.total_qty}</td>
                                                <td className="py-2.5 text-right font-semibold text-blue-600 dark:text-blue-400">
                                                    {formatMoney(p.total_revenue)}
                                                </td>
                                                {canViewNetProfit && (
                                                    <td className={`py-2.5 text-right font-semibold ${Number(p.total_profit || 0) >= 0
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-rose-600 dark:text-rose-450'
                                                        }`}>
                                                        {formatMoney(p.total_profit)}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className={`grid ${canViewNetProfit ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'} gap-4 mt-6 pt-5 border-t border-gray-100 dark:border-slate-700`}>
                                <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Units Sold</p>
                                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                                        {filteredProducts.reduce((acc, p) => acc + Number(p.total_qty || 0), 0)}
                                    </p>
                                </div>
                                <div className="bg-blue-50/30 dark:bg-blue-950/15 border border-blue-100/50 dark:border-blue-900/35 rounded-2xl p-4">
                                    <p className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wide">Total Revenue</p>
                                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                                        {formatMoney(filteredProducts.reduce((acc, p) => acc + Number(p.total_revenue || 0), 0))}
                                    </p>
                                </div>
                                {canViewNetProfit && (
                                    <div className={`border rounded-2xl p-4 ${filteredProducts.reduce((acc, p) => acc + Number(p.total_profit || 0), 0) >= 0
                                        ? 'bg-emerald-50/30 dark:bg-emerald-950/15 border-emerald-100/50 dark:border-emerald-900/35 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-rose-50/30 dark:bg-rose-950/15 border-rose-100/50 dark:border-rose-900/35 text-rose-600 dark:text-rose-400'
                                        }`}>
                                        <p className="text-xs font-semibold uppercase tracking-wide">Total Profit</p>
                                        <p className="text-xl font-bold mt-1">
                                            {formatMoney(filteredProducts.reduce((acc, p) => acc + Number(p.total_profit || 0), 0))}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </Fragment>
                    )}
                </div>

                {/* Daily Expenses Section */}
                <div className={`grid grid-cols-1 ${canManageExpenses ? 'lg:grid-cols-3' : ''} gap-6 mt-6`}>
                    {/* Add Expense Form (1/3 width) */}
                    {canManageExpenses && (
                        <div className="bg-white dark:bg-slate-805 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
                                {editingExpenseId ? 'Edit Daily Expense' : 'Add Daily Expense'}
                            </h3>
                            <form onSubmit={handleSubmitExpense} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">
                                        Expense Category
                                    </label>
                                    <select
                                        value={data.category}
                                        onChange={e => setData('category', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl
                                           text-sm focus:outline-none focus:ring-2
                                           focus:ring-blue-300 dark:focus:ring-blue-500
                                           bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="Raw Materials">Raw Materials</option>
                                        <option value="Electricity Bill">Electricity Bill</option>
                                        <option value="Water Bill">Water Bill</option>
                                        <option value="Rent">Rent</option>
                                        <option value="Transport">Transport</option>
                                        <option value="Salaries">Salaries</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">
                                        Amount (LKR)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={data.amount}
                                        onChange={e => setData('amount', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl
                                           text-sm focus:outline-none focus:ring-2
                                           focus:ring-blue-300 dark:focus:ring-blue-500
                                           bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                        required
                                    />
                                    {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">
                                        Expense Date
                                    </label>
                                    <input
                                        type="date"
                                        value={data.expense_date}
                                        onChange={e => setData('expense_date', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl
                                           text-sm focus:outline-none focus:ring-2
                                           focus:ring-blue-300 dark:focus:ring-blue-500
                                           bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                        required
                                    />
                                    {errors.expense_date && <p className="text-xs text-red-505 mt-1">{errors.expense_date}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">
                                        Description (Optional)
                                    </label>
                                    <textarea
                                        rows="2"
                                        placeholder="Brief details..."
                                        value={data.description}
                                        onChange={e => setData('description', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl
                                           text-sm focus:outline-none focus:ring-2
                                           focus:ring-blue-300 dark:focus:ring-blue-500
                                           bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                    />
                                    {errors.description && <p className="text-xs text-red-505 mt-1">{errors.description}</p>}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="flex-1 py-2 bg-blue-600 disabled:bg-blue-400 text-white rounded-xl
                                           text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                                    >
                                        {processing ? 'Saving...' : (editingExpenseId ? 'Save Changes' : 'Record Expense')}
                                    </button>
                                    {editingExpenseId && (
                                        <button
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-600 rounded-xl
                                               text-sm font-medium transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Expenses Table (2/3 width) */}
                    <div className={`${canManageExpenses ? 'lg:col-span-2' : ''} bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 flex flex-col justify-between`}>
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Expense Details</h3>
                                <div className="text-right">
                                    <span className="text-xs text-gray-400 dark:text-gray-500 block">Total Expenses</span>
                                    <span className="text-lg font-bold text-red-650 dark:text-red-400">
                                        {formatMoney(totalDailyExpenses)}
                                    </span>
                                </div>
                            </div>

                            {expenses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-300 dark:text-gray-550">
                                    <Package className="w-10 h-10 mb-2" />
                                    <p className="text-sm">No expenses recorded for this range</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-slate-700">
                                                <th className="pb-2 font-medium">Category</th>
                                                <th className="pb-2 font-medium">Description</th>
                                                <th className="pb-2 font-medium text-right font-medium">Amount</th>
                                                <th className="pb-2 font-medium text-center font-medium">Date</th>
                                                <th className="pb-2 font-medium text-right font-medium">Created By</th>
                                                {canManageExpenses && <th className="pb-2 font-medium text-right font-medium">Actions</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {expenses.map((e) => (
                                                <tr
                                                    key={e.id}
                                                    className="border-b border-gray-55 dark:border-slate-700/60 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                                                >
                                                    <td className="py-2.5 font-medium text-gray-800 dark:text-gray-200">
                                                        {e.category}
                                                    </td>
                                                    <td className="py-2.5 text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={e.description}>
                                                        {e.description || '—'}
                                                    </td>
                                                    <td className="py-2.5 text-right font-semibold text-red-600 dark:text-red-400">
                                                        {formatMoney(e.amount)}
                                                    </td>
                                                    <td className="py-2.5 text-center text-gray-600 dark:text-gray-400">
                                                        {e.expense_date}
                                                    </td>
                                                    <td className="py-2.5 text-right text-gray-500 dark:text-gray-400">
                                                        {e.created_by}
                                                    </td>
                                                    {canManageExpenses && (
                                                        <td className="py-2.5 text-right font-medium text-gray-500 dark:text-gray-450 whitespace-nowrap">
                                                            <button
                                                                onClick={() => handleEditExpense(e)}
                                                                className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 mr-2.5 transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit2 className="w-4 h-4 inline-block" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteExpense(e.id)}
                                                                className="text-red-500 hover:text-red-750 dark:hover:text-red-405 transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-4 h-4 inline-block" />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {deletingExpenseId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-105 dark:border-slate-700 p-6 max-w-sm w-full mx-4 shadow-xl">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Expense</h3>
                            <p className="text-sm text-gray-505 dark:text-gray-400 mb-6">
                                Are you sure you want to delete this expense? This action cannot be undone.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setDeletingExpenseId(null)}
                                    className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-750 dark:text-gray-200 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        router.delete(route('reports.daily.expenses.destroy', deletingExpenseId), {
                                            onSuccess: () => setDeletingExpenseId(null)
                                        });
                                    }}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
