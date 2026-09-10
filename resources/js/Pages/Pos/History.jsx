import MainLayout from "@/Layouts/MainLayout";
import { Head } from "@inertiajs/react";
import { Receipt, RefreshCcw, RotateCcw } from "lucide-react";

const refunds = [
    {
        invoice: "INV-PH-287",
        customer: "Iresha Fernando",
        reason: "Date change before shoot",
        amount: "LKR 25,000",
        status: "Approved",
    },
    {
        invoice: "INV-ST-251",
        customer: "Campus Events",
        reason: "Duplicate frame count",
        amount: "LKR 8,500",
        status: "Processed",
    },
    {
        invoice: "INV-PH-294",
        customer: "Saman Hewage",
        reason: "Package downgrade",
        amount: "LKR 12,000",
        status: "Pending review",
    },
];

export default function History() {
    return (
        <MainLayout pageTitle="Refunds">
            <Head title="Refunds" />

            <div className="space-y-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Refund Management
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Link each refund to the originating invoice and keep the
                        financial trail clean.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                        <div className="flex items-center gap-3">
                            <RotateCcw className="w-6 h-6 text-primary-500" />
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Refunds this month</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">9</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                        <div className="flex items-center gap-3">
                            <RefreshCcw className="w-6 h-6 text-amber-500" />
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Pending review</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">3</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                        <div className="flex items-center gap-3">
                            <Receipt className="w-6 h-6 text-emerald-500" />
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Returned value</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">LKR 76K</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-slate-700/40">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Invoice</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Reason</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {refunds.map((refund) => (
                                <tr key={refund.invoice}>
                                    <td className="px-6 py-4 font-semibold text-primary-500">{refund.invoice}</td>
                                    <td className="px-6 py-4 text-gray-900 dark:text-white">{refund.customer}</td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{refund.reason}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{refund.amount}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300">
                                            {refund.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </MainLayout>
    );
}
