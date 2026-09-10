import MainLayout from "@/Layouts/MainLayout";
import { Head } from "@inertiajs/react";
import { Layers3, PlusCircle, Sparkles } from "lucide-react";

const packages = [
    {
        title: "Wedding Signature",
        price: "LKR 225,000",
        coverage: "Pre-shoot, full day, album and reel",
        idealFor: "Couples who need complete wedding storytelling",
    },
    {
        title: "Event Essentials",
        price: "LKR 85,000",
        coverage: "4-hour event, edited gallery, social cut-downs",
        idealFor: "Birthdays, corporate sessions, private celebrations",
    },
    {
        title: "Portrait Premium",
        price: "LKR 54,000",
        coverage: "Studio or outdoor portrait set, retouching, framed print",
        idealFor: "Graduations, homecoming, family portraits",
    },
];

const addOns = [
    "Extra album spreads and mini books",
    "Live print corner during events",
    "Drone coverage and cinematic highlights",
    "Express delivery of edited gallery",
];

export default function History() {
    return (
        <MainLayout pageTitle="Package Customization">
            <Head title="Package Customization" />

            <div className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            Package Customization
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Start from standard packages, then adjust deliverables,
                            pricing, and add-ons for each client.
                        </p>
                    </div>
                    <button className="px-4 py-2.5 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors inline-flex items-center gap-2">
                        <PlusCircle className="w-4 h-4" />
                        New custom package
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {packages.map((item) => (
                        <div
                            key={item.title}
                            className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <Layers3 className="w-5 h-5 text-primary-500" />
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                    {item.title}
                                </h3>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {item.price}
                            </p>
                            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                                {item.coverage}
                            </p>
                            <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">
                                {item.idealFor}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Sparkles className="w-5 h-5 text-primary-500" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            Common Add-ons
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {addOns.map((item) => (
                            <div
                                key={item}
                                className="rounded-xl bg-gray-50 dark:bg-slate-700/40 px-4 py-3 text-sm text-gray-600 dark:text-gray-300"
                            >
                                {item}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
