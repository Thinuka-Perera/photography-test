import MainLayout from "@/Layouts/MainLayout";
import { Head, Link, router, useForm } from "@inertiajs/react";
import { CalendarDays, Edit3, MapPin, User2, Wallet, Phone, Download, MessageCircle, Camera, Video } from "lucide-react";
import { generateEventLetterheadPDF, sharePDFOnWhatsApp } from "@/utils/pdfGenerator";

const eventTypeLabels = {
    wedding: "Wedding",
    party: "Party",
    corporate_shoot: "Corporate Shoot",
    other: "Other",
};

const statusStyles = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300",
    confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const paymentStateLabels = {
    pending_advance: "Pending advance",
    partially_paid: "Partially paid",
    fully_paid: "Fully paid",
};

function formatDate(dateString) {
    if (!dateString) return "-";
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(dateString));
}

function formatMoney(value) {
    return new Intl.NumberFormat("en-LK", {
        style: "currency",
        currency: "LKR",
        minimumFractionDigits: 2,
    }).format(Number(value || 0));
}

export default function Show({ event, paymentSummary, shopSettings = {} }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        amount: "",
        payment_method: "cash",
        paid_on: new Date().toISOString().slice(0, 10),
        reference_no: "",
        notes: "",
    });

    const submitPayment = (e) => {
        e.preventDefault();
        post(route("photography.events.payments.store", event.id), {
            preserveScroll: true,
            onSuccess: () => reset("amount", "reference_no", "notes"),
        });
    };

    const photographyPkgs = Array.isArray(event.photography_packages) ? event.photography_packages : [];
    const videographyPkgs = Array.isArray(event.videography_packages) ? event.videography_packages : [];
    const customSections = Array.isArray(event.custom_sections) ? event.custom_sections : [];

    const buildEventLetterheadData = () => ({
        event,
        paymentSummary,
        photographyPkgs,
        videographyPkgs,
        customSections,
        shopSettings: {
            name: shopSettings.shop_name ?? 'Photography Studio',
            address: shopSettings.shop_address ?? '',
            phone: shopSettings.shop_phone ?? '',
            whatsapp: shopSettings.shop_whatsapp ?? '',
            tagline: shopSettings.shop_tagline ?? '',
            footerText: shopSettings.shop_footer_text ?? '',
            logoUrl: shopSettings.shop_logo_url ?? null,
            paymentInfo: shopSettings.invoice_payment_info ?? '',
            termsConditions: shopSettings.invoice_terms ?? '',
            bank_account_no: shopSettings.bank_account_no ?? '',
            account_name: shopSettings.account_name ?? '',
            bank_details: shopSettings.bank_details ?? '',
        },
    });

    const handleDownloadPDF = async () => {
        try {
            const doc = await generateEventLetterheadPDF(buildEventLetterheadData());
            doc.save(`Event_${event.title?.replace(/\s+/g, '_') || event.id}.pdf`);
        } catch (error) {
            console.error('PDF generation failed:', error);
            alert('PDF generation failed. Please try again.');
        }
    };

    const handleWhatsAppShare = async () => {
        try {
            const doc = await generateEventLetterheadPDF(buildEventLetterheadData());
            const filename = `Event_${event.title?.replace(/\s+/g, '_') || event.id}.pdf`;
            const { generateWhatsAppMessageForBill } = await import('@/utils/pdfGenerator');
            const message = generateWhatsAppMessageForBill(event, shopSettings);
            await sharePDFOnWhatsApp(doc, filename, event.client_phone || '', message);
        } catch (error) {
            console.error('WhatsApp share failed:', error);
            alert('Could not share via WhatsApp. Please try downloading the PDF instead.');
        }
    };

    return (
        <MainLayout pageTitle="Wedding Details">
            <Head title={event.title} />

            <div className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{event.title}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {event.client_name}
                            {event.client_phone && <span className="ml-2">• {event.client_phone}</span>}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={handleDownloadPDF}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-900 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Download PDF
                        </button>
                        <button
                            type="button"
                            onClick={handleWhatsAppShare}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium transition-colors"
                            style={{ backgroundColor: '#25D366' }}
                        >
                            <MessageCircle className="w-4 h-4" />
                            Send via WhatsApp
                        </button>
                        <Link
                            href={route("photography.events.edit", event.id)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600"
                        >
                            <Edit3 className="w-4 h-4" />
                            Edit wedding
                        </Link>
                        <button
                            type="button"
                            onClick={() => {
                                if (confirm("Delete this wedding?")) {
                                    router.delete(route("photography.events.destroy", event.id));
                                }
                            }}
                            className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
                        >
                            Delete
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <InfoCard icon={CalendarDays} label="Date" value={formatDate(event.event_date)} />
                    <InfoCard icon={User2} label="Client" value={event.client_name} />
                    <InfoCard icon={MapPin} label="Location" value={event.location || "Not set"} />
                    <InfoCard
                        icon={CalendarDays}
                        label="Status"
                        value={event.status.replace("_", " ")}
                        valueClassName={`inline-flex w-fit px-3 py-1 rounded-full text-xs font-medium ${statusStyles[event.status] ?? statusStyles.draft}`}
                    />
                </div>

                {/* Locations & Contact Row */}
                {(event.client_phone || event.wedding_location || event.saloon_location || event.photo_shoot_location) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {event.client_phone && <InfoCard icon={Phone} label="Phone" value={event.client_phone} />}
                        {event.wedding_location && <InfoCard icon={MapPin} label="Wedding Location" value={event.wedding_location} />}
                        {event.saloon_location && <InfoCard icon={MapPin} label="Saloon Location" value={event.saloon_location} />}
                        {event.photo_shoot_location && <InfoCard icon={Camera} label="Photo Shoot Location" value={event.photo_shoot_location} />}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <InfoCard icon={Wallet} label="Amount" value={formatMoney(paymentSummary?.total_amount ?? 0)} />
                    <InfoCard icon={Wallet} label="Received" value={formatMoney(paymentSummary?.received_amount ?? 0)} />
                    <InfoCard icon={Wallet} label="Balance due" value={formatMoney(paymentSummary?.balance_amount ?? 0)} />
                    <InfoCard icon={Wallet} label="Payment status" value={paymentStateLabels[paymentSummary?.payment_status] ?? "Pending"} />
                </div>

                {/* Photography & Videography Packages */}
                {(photographyPkgs.length > 0 || videographyPkgs.length > 0) && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {photographyPkgs.length > 0 && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-blue-100 dark:border-blue-900/30 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Camera className="w-5 h-5 text-blue-500" />
                                    Photography Package
                                </h3>
                                <div className="mt-4 space-y-3">
                                    {photographyPkgs.map((pkg, i) => (
                                        <div key={pkg.id || i} className="flex items-center justify-between rounded-xl bg-blue-50/50 dark:bg-blue-900/10 p-3">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{pkg.name || 'Unnamed'}</p>
                                                {pkg.notes && <p className="text-xs text-gray-500 mt-0.5">{pkg.notes}</p>}
                                            </div>
                                            <span className="font-semibold text-gray-900 dark:text-white">{formatMoney(pkg.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {videographyPkgs.length > 0 && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-purple-100 dark:border-purple-900/30 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Video className="w-5 h-5 text-purple-500" />
                                    Videography Package
                                </h3>
                                <div className="mt-4 space-y-3">
                                    {videographyPkgs.map((pkg, i) => (
                                        <div key={pkg.id || i} className="flex items-center justify-between rounded-xl bg-purple-50/50 dark:bg-purple-900/10 p-3">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{pkg.name || 'Unnamed'}</p>
                                                {pkg.notes && <p className="text-xs text-gray-500 mt-0.5">{pkg.notes}</p>}
                                            </div>
                                            <span className="font-semibold text-gray-900 dark:text-white">{formatMoney(pkg.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Custom Sections */}
                {customSections.length > 0 && (
                    <div className="space-y-4">
                        {customSections.map((section, idx) => (
                            <div key={section.id || idx} className="bg-white dark:bg-slate-800 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 overflow-hidden">
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 px-6 py-3">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">{section.title || 'Custom Section'}</h3>
                                </div>
                                <div className="p-6">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-xs text-gray-500 uppercase">
                                                <th className="text-left pb-2">Description</th>
                                                <th className="text-right pb-2">Value / Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                            {(section.rows || []).map((row, rowIdx) => (
                                                <tr key={rowIdx}>
                                                    <td className="py-2 text-gray-700 dark:text-gray-300">{row.label || '-'}</td>
                                                    <td className="py-2 text-right font-medium text-gray-900 dark:text-white">{row.value || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 space-y-4">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Wedding type</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                                {eventTypeLabels[event.event_type] ?? event.event_type}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Expected guests</p>
                            <p className="font-medium text-gray-900 dark:text-white">{event.expected_guests ?? "Not specified"}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Notes</p>
                            <p className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-line">{event.notes || "No notes recorded."}</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Record payment</h3>
                        <form onSubmit={submitPayment} className="mt-4 space-y-3">
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={data.amount}
                                onChange={(e) => setData("amount", e.target.value)}
                                placeholder="Amount"
                                className="w-full rounded-xl border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                            {errors.amount && <p className="text-xs text-red-500">{errors.amount}</p>}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <select
                                    value={data.payment_method}
                                    onChange={(e) => setData("payment_method", e.target.value)}
                                    className="w-full rounded-xl border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="bank_transfer">Bank transfer</option>
                                    <option value="online">Online</option>
                                    <option value="other">Other</option>
                                </select>
                                <input
                                    type="date"
                                    value={data.paid_on}
                                    onChange={(e) => setData("paid_on", e.target.value)}
                                    className="w-full rounded-xl border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                            </div>
                            {errors.paid_on && <p className="text-xs text-red-500">{errors.paid_on}</p>}

                            <input
                                type="text"
                                value={data.reference_no}
                                onChange={(e) => setData("reference_no", e.target.value)}
                                placeholder="Reference no (optional)"
                                className="w-full rounded-xl border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                            <textarea
                                rows={3}
                                value={data.notes}
                                onChange={(e) => setData("notes", e.target.value)}
                                placeholder="Notes (optional)"
                                className="w-full rounded-xl border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-4 py-2.5 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-60"
                            >
                                {processing ? "Saving..." : "Record payment"}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment history</h3>
                    {(event.payments || []).length === 0 ? (
                        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No payments recorded yet.</p>
                    ) : (
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-slate-900/60">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs uppercase text-gray-500 dark:text-gray-400">Date</th>
                                        <th className="px-3 py-2 text-left text-xs uppercase text-gray-500 dark:text-gray-400">Method</th>
                                        <th className="px-3 py-2 text-left text-xs uppercase text-gray-500 dark:text-gray-400">Reference</th>
                                        <th className="px-3 py-2 text-left text-xs uppercase text-gray-500 dark:text-gray-400">Notes</th>
                                        <th className="px-3 py-2 text-right text-xs uppercase text-gray-500 dark:text-gray-400">Receipt</th>
                                        <th className="px-3 py-2 text-right text-xs uppercase text-gray-500 dark:text-gray-400">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {(event.payments || []).map((payment) => (
                                        <tr key={payment.id}>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{formatDate(payment.paid_on)}</td>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{payment.payment_method}</td>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{payment.reference_no || "-"}</td>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{payment.notes || "-"}</td>
                                            <td className="px-3 py-2 text-right">
                                                <a
                                                    href={route("photography.events.payments.print", { event: event.id, payment: payment.id })}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-700/40"
                                                >
                                                    Print
                                                </a>
                                            </td>
                                            <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">{formatMoney(payment.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}

function InfoCard({ icon: Icon, label, value, valueClassName = "" }) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                    <p className={`mt-2 text-lg font-semibold text-gray-900 dark:text-white ${valueClassName}`}>
                        {value}
                    </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-500 flex items-center justify-center dark:bg-primary-900/20">
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
}
