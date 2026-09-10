import MainLayout from "@/Layouts/MainLayout";
import EventForm, { normalizeEventFormPayload } from "@/Pages/Photography/Events/Partials/EventForm";
import { Head, useForm } from "@inertiajs/react";

export default function Create({ packageOptions = [] }) {
    const { data, setData, post, processing, errors } = useForm({
        selected_package_id: "",
        title: "",
        event_type: "wedding",
        client_name: "",
        client_phone: "",
        event_date: "",
        location: "",
        wedding_location: "",
        saloon_location: "",
        photo_shoot_location: "",
        status: "draft",
        expected_guests: "",
        total_amount: "",
        notes: "",
        custom_sections: [],
        photography_packages: [],
        videography_packages: [],
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route("photography.events.store"), { data: normalizeEventFormPayload(data) });
    };

    return (
        <MainLayout pageTitle="Create Event">
            <Head title="Create Event" />

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Create Event
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Add a new wedding, party, or corporate shoot to the schedule.
                    </p>
                </div>

                <EventForm
                    data={data}
                    errors={errors}
                    onSubmit={handleSubmit}
                    processing={processing}
                    setData={setData}
                    packageOptions={packageOptions}
                    submitLabel="Save event"
                    cancelHref={route("photography.events.index")}
                />
            </div>
        </MainLayout>
    );
}
