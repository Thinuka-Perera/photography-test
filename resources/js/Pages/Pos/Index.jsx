import MainLayout from "@/Layouts/MainLayout";
import { Head } from "@inertiajs/react";
import { CheckCheck, MessageCircle, Send, Ticket } from "lucide-react";

const conversations = [
    {
        client: "Nadeesha Perera",
        document: "Quotation QT-109",
        lastAction: "Sent package options and draft quotation",
        status: "Seen on WhatsApp",
    },
    {
        client: "Royal Gift House",
        document: "Invoice INV-ST-304",
        lastAction: "Shared invoice with dispatch note",
        status: "Awaiting reply",
    },
    {
        client: "Silva Family",
        document: "Reminder",
        lastAction: "Requested event date confirmation",
        status: "Needs follow-up",
    },
];

export default function Index() {
    return (
        <MainLayout pageTitle="WhatsApp Hub">
            <Head title="WhatsApp Hub" />

            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Communication Integration
                    </h2>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
                        Use WhatsApp to send quotations, invoices, payment reminders,
                        and quick status updates without leaving the system.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                        <div className="flex items-center gap-3">
                            <Ticket className="w-6 h-6 text-primary-500" />
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Quotes sent today</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">8</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                        <div className="flex items-center gap-3">
                            <Send className="w-6 h-6 text-emerald-500" />
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Invoices delivered</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">13</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                        <div className="flex items-center gap-3">
                            <MessageCircle className="w-6 h-6 text-violet-500" />
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Follow-ups pending</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">5</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            Recent Conversations
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-slate-700">
                        {conversations.map((item) => (
                            <div
                                key={`${item.client}-${item.document}`}
                                className="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                            >
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {item.client}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {item.document} · {item.lastAction}
                                    </p>
                                </div>
                                <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-500">
                                    <CheckCheck className="w-4 h-4" />
                                    {item.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
