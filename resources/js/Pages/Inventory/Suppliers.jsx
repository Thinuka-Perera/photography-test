import MainLayout from "@/Layouts/MainLayout";
import { Head } from "@inertiajs/react";
import { BadgeCheck, BriefcaseBusiness, CalendarDays, Users2 } from "lucide-react";

const employees = [
    {
        name: "Kavindi Fernando",
        role: "Lead photographer",
        module: "Photography",
        assignment: "Wedding coverage · 2026-04-19",
        status: "Assigned",
    },
    {
        name: "Sajith Perera",
        role: "Studio operator",
        module: "Studio printing",
        assignment: "Album print queue",
        status: "On shift",
    },
    {
        name: "Madhavi Silva",
        role: "Client coordinator",
        module: "Shared",
        assignment: "Quotation follow-up",
        status: "Available",
    },
];

export default function Suppliers() {
    return (
        <MainLayout pageTitle="Employees">
            <Head title="Employees" />

            <div className="space-y-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Employee Management System
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Track staff roles, assignments, and involvement across both
                        modules.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                        <div className="flex items-center gap-3">
                            <Users2 className="w-6 h-6 text-primary-500" />
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Active staff</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">27</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                        <div className="flex items-center gap-3">
                            <BriefcaseBusiness className="w-6 h-6 text-violet-500" />
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Freelancers this month</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">6</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                        <div className="flex items-center gap-3">
                            <CalendarDays className="w-6 h-6 text-emerald-500" />
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Assignments today</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">14</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            Team Allocation
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-slate-700">
                        {employees.map((employee) => (
                            <div
                                key={employee.name}
                                className="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                            >
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {employee.name}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {employee.role} · {employee.module}
                                    </p>
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                    <span className="text-gray-600 dark:text-gray-300">
                                        {employee.assignment}
                                    </span>
                                    <span className="inline-flex items-center gap-1 font-medium text-primary-500">
                                        <BadgeCheck className="w-4 h-4" />
                                        {employee.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
