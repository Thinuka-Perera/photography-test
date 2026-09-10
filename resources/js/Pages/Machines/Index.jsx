import MainLayout from "@/Layouts/MainLayout";
import { Head } from "@inertiajs/react";
import {
    Boxes,
    Image as ImageIcon,
    Package,
    Printer,
    ShoppingBag,
} from "lucide-react";

const ICONS = {
    printer: Printer,
    "shopping-bag": ShoppingBag,
    boxes: Boxes,
    package: Package,
};

export default function Index({
    summary = [],
    productionQueue = [],
    productGroups = [],
}) {
    return (
        <MainLayout pageTitle="Dashboard">
            <Head title="Dashboard" />

            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Printing Module
                    </h2>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
                        Track print orders and keep
                        inventory aligned with daily production.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {summary.map((item) => {
                        const Icon = ICONS[item.icon] ?? Package;

                        return (
                            <div
                                key={item.label}
                                className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="min-w-0 pr-2">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {item.label}
                                        </p>
                                        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                                            {item.value}
                                        </p>
                                        {item.sub ? (
                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {item.sub}
                                            </p>
                                        ) : null}
                                    </div>
                                    <div
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${item.tone}`}
                                    >
                                        <Icon className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                    <div className="xl:col-span-3 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                Production queue
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Bills in processing or ready (active shop)
                            </p>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-slate-700">
                            {productionQueue.length === 0 ? (
                                <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                                    No bills in processing or ready right now.
                                </div>
                            ) : (
                                productionQueue.map((job) => (
                                    <div
                                        key={job.id ?? `${job.order_no}-${job.customer}`}
                                        className="px-6 py-4 flex items-center justify-between gap-4"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-semibold text-gray-900 dark:text-white truncate">
                                                {job.order_no} · {job.customer}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                                {job.type}
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-medium text-primary-500">
                                                {job.status}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {job.eta}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <ImageIcon className="w-5 h-5 text-primary-500" />
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                    Product categories
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    From your inventory catalogue
                                </p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {productGroups.length === 0 ? (
                                <div className="rounded-xl bg-gray-50 dark:bg-slate-700/40 p-4 text-sm text-gray-500 dark:text-gray-400">
                                    No categories yet. Add categories under Inventory to see them here.
                                </div>
                            ) : (
                                productGroups.map((category) => (
                                    <div
                                        key={category.title}
                                        className="rounded-xl bg-gray-50 dark:bg-slate-700/40 p-4"
                                    >
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {category.title}
                                        </p>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            {category.description}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
