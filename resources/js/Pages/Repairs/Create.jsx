import MainLayout from "@/Layouts/MainLayout";
import { Head } from "@inertiajs/react";
import { MessageCircle, Send, Ticket, WandSparkles } from "lucide-react";

const quotationStats = [
    { label: "Draft quotations", value: "11", icon: Ticket, tone: "bg-sky-100 dark:bg-sky-900/30 text-sky-500" },
    { label: "Sent via WhatsApp", value: "8", icon: Send, tone: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500" },
    { label: "Approval rate", value: "74%", icon: MessageCircle, tone: "bg-violet-100 dark:bg-violet-900/30 text-violet-500" },
];

const packageOptions = [
    {
        title: "Wedding Classic",
        amount: "LKR 185,000",
        details: "One day coverage, highlight reel, album draft, two photographers",
    },
    {
        title: "Homecoming Story",
        amount: "LKR 68,000",
        details: "Indoor and outdoor portraits, edited gallery, framed print",
    },
    {
        title: "Corporate Event",
        amount: "LKR 95,000",
        details: "Event coverage, employee portraits, next-day digital delivery",
    },
];

const quotations = [
    {
        customer: "Nadeesha Perera",
        service: "Wedding day coverage",
        amount: "LKR 185,000",
        status: "Awaiting approval",
    },
    {
        customer: "Rivon Technologies",
        service: "Corporate meetup coverage",
        amount: "LKR 95,000",
        status: "Approved",
    },
    {
        customer: "Silva Family",
        service: "Avurudu portraits",
        amount: "LKR 68,000",
        status: "Draft",
    },
];

export default function Create() {
    return (
        <MainLayout pageTitle="Quotation Management">
            <Head title="Quotation Management" />

            <div className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            Quotation Management
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Build, customize, and send quotations directly to clients.
                        </p>
                    </div>
                    <button className="px-4 py-2.5 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors">
                        Create quotation
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {quotationStats.map((item) => {
                        const Icon = item.icon;

                        return (
                            <div
                                key={item.label}
                                className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {item.label}
                                        </p>
                                        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                                            {item.value}
                                        </p>
                                    </div>
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.tone}`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                    <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <WandSparkles className="w-5 h-5 text-primary-500" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                Popular Quote Templates
                            </h3>
                        </div>
                        <div className="space-y-4">
                            {packageOptions.map((option) => (
                                <div
                                    key={option.title}
                                    className="rounded-xl bg-gray-50 dark:bg-slate-700/40 p-4"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {option.title}
                                        </p>
                                        <p className="text-sm font-semibold text-primary-500">
                                            {option.amount}
                                        </p>
                                    </div>
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        {option.details}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="xl:col-span-3 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                Active Quotations
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-slate-700">
                            {quotations.map((quote) => (
                                <div
                                    key={`${quote.customer}-${quote.service}`}
                                    className="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                                >
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {quote.customer}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {quote.service}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-6 text-sm">
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {quote.amount}
                                        </span>
                                        <span className="text-primary-500 font-medium">
                                            {quote.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
