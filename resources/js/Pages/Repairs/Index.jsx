import MainLayout from "@/Layouts/MainLayout";
import { Head } from "@inertiajs/react";
import { CalendarDays, Camera, Clock3, Users2 } from "lucide-react";

const eventStats = [
    { label: "Upcoming events", value: "9", icon: CalendarDays, tone: "bg-sky-100 dark:bg-sky-900/30 text-sky-500" },
    { label: "Teams on-site", value: "4", icon: Users2, tone: "bg-violet-100 dark:bg-violet-900/30 text-violet-500" },
    { label: "Edits pending", value: "13", icon: Clock3, tone: "bg-amber-100 dark:bg-amber-900/30 text-amber-500" },
];

const events = [
    {
        name: "Nadeesha & Tharindu Wedding",
        client: "Nadeesha Perera",
        date: "2026-04-19",
        team: "Lead + 3 crew",
        status: "Confirmed",
    },
    {
        name: "Avurudu Family Portraits",
        client: "Silva Family",
        date: "2026-04-20",
        team: "Studio team",
        status: "Shot list pending",
    },
    {
        name: "Corporate Annual Meetup",
        client: "Rivon Technologies",
        date: "2026-04-24",
        team: "Lead + video support",
        status: "Quotation approved",
    },
];

export default function Index() {
    return (
        <MainLayout pageTitle="Event Management">
            <Head title="Event Management" />

            <div className="space-y-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Photography Module
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Organize events, assign staff, and track delivery readiness for
                        photography services.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {eventStats.map((item) => {
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

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3">
                        <Camera className="w-5 h-5 text-primary-500" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            Upcoming Event Schedule
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-slate-700/40">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                        Event
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                        Client
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                        Date
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                        Team
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {events.map((event) => (
                                    <tr key={event.name}>
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                            {event.name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                            {event.client}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                            {event.date}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                            {event.team}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300">
                                                {event.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
