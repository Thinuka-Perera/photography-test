import MainLayout from "@/Layouts/MainLayout";
import EventForm, { normalizeEventFormPayload } from "@/Pages/Photography/Events/Partials/EventForm";
import { Head, useForm } from "@inertiajs/react";

function toDateInputValue(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toISOString().slice(0, 10);
}

export default function Edit({ event, packageOptions = [] }) {
    const { data, setData, put, processing, errors } = useForm({
        selected_package_id: "",
        title: event.title ?? "",
        event_type: event.event_type ?? "wedding",
        client_name: event.client_name ?? "",
        client_phone: event.client_phone ?? "",
        event_date: toDateInputValue(event.event_date),
        location: event.location ?? "",
        wedding_location: event.wedding_location ?? "",
        saloon_location: event.saloon_location ?? "",
        photo_shoot_location: event.photo_shoot_location ?? "",
        status: event.status ?? "draft",
        expected_guests: event.expected_guests ?? "",
        total_amount: event.total_amount ?? "",
        notes: event.notes ?? "",
        custom_sections: event.custom_sections ?? [],
        photography_packages: (event.photography_packages ?? []).map((section) => ({
            ...section,
            amount: section.amount != null && section.amount !== "" ? String(section.amount) : "",
        })),
        videography_packages: (event.videography_packages ?? []).map((section) => ({
            ...section,
            amount: section.amount != null && section.amount !== "" ? String(section.amount) : "",
        })),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route("photography.events.update", event.id), { data: normalizeEventFormPayload(data) });
    };

    return (
        <MainLayout pageTitle="Edit Event">
            <Head title="Edit Event" />

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Edit Event
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Update the event details and keep the schedule current.
                    </p>
                </div>

                <EventForm
                    data={data}
                    errors={errors}
                    onSubmit={handleSubmit}
                    processing={processing}
                    setData={setData}
                    packageOptions={packageOptions}
                    submitLabel="Update event"
                    cancelHref={route("photography.events.show", event.id)}
                />
            </div>
        </MainLayout>
    );
}
