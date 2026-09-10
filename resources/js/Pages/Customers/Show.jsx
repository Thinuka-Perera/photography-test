import MainLayout from "@/Layouts/MainLayout";
import { Head, Link } from "@inertiajs/react";
import { CalendarDays, Phone, Mail, MapPin, UserRound } from "lucide-react";

function formatMoney(value) {
    return new Intl.NumberFormat("en-LK", {
        style: "currency",
        currency: "LKR",
        minimumFractionDigits: 2,
    }).format(Number(value || 0));
}

function TypeBadge({ type }) {
    const normalized = String(type || "amateur").toLowerCase() === "professional" ? "professional" : "amateur";
    const classes =
        normalized === "professional"
            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
            : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";

    return (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${classes}`}>
            {normalized === "professional" ? "Professional" : "Amateur"}
        </span>
    );
}

function Empty({ label }) {
    return (
        <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-slate-700 dark:text-gray-400">
            No {label} found for this customer.
        </div>
    );
}

export default function Show({ customer, history }) {
    const invoices = history?.invoices ?? [];
    const sales = history?.sales ?? [];
    const bills = history?.bills ?? [];
    const creditBills = history?.creditBills ?? [];
    const creditOnly = creditBills.filter((row) => String(row.type || '').toLowerCase() === 'credit');
    const advanceOnly = creditBills.filter((row) => String(row.type || '').toLowerCase() === 'advance');

    return (
        <MainLayout pageTitle={`Customer: ${customer.name}`}>
            <Head title={`Customer - ${customer.name}`} />

            <div className="space-y-6">
                <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                                <UserRound className="h-3.5 w-3.5" />
                                Customer Profile
                            </div>
                            <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{customer.name}</h1>
                            <div className="mt-2">
                                <TypeBadge type={customer.customer_type} />
                            </div>
                            <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" /> {customer.phone || "No phone"}</p>
                                <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" /> {customer.email || "No email"}</p>
                                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" /> {customer.address || "No address"}</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Link
                                href={route("customers.index")}
                                className="inline-flex items-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-700"
                            >
                                Back to Customers
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Metric label="Invoices" value={customer.invoices_count ?? 0} />
                    <Metric label="Sales" value={customer.sales_count ?? 0} />
                    <Metric label="Bills" value={bills.length} />
                    <Metric label="Credit Bills" value={creditOnly.length} />
                </section>

                <HistoryCard title="Recent Bills">
                    {bills.length === 0 ? (
                        <Empty label="bills" />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
                                <thead className="bg-gray-50/80 dark:bg-slate-900/60">
                                    <tr>
                                        <Th>Bill #</Th>
                                        <Th>Date</Th>
                                        <Th>Total</Th>
                                        <Th>Paid</Th>
                                        <Th>Status</Th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {bills.map((bill) => (
                                        <tr key={bill.id}>
                                            <Td>
                                                <Link href={route("studio.bills.show", bill.id)} className="text-primary-600 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-200">
                                                    {bill.bill_number}
                                                </Link>
                                            </Td>
                                            <Td>{new Date(bill.created_at).toLocaleString()}</Td>
                                            <Td>{formatMoney(bill.after_discount)}</Td>
                                            <Td>{formatMoney(bill.paid_amount)}</Td>
                                            <Td>{bill.status}</Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </HistoryCard>

                <HistoryCard title="Recent Sales">
                    {sales.length === 0 ? (
                        <Empty label="sales" />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
                                <thead className="bg-gray-50/80 dark:bg-slate-900/60">
                                    <tr>
                                        <Th>Sale #</Th>
                                        <Th>Date</Th>
                                        <Th>Total</Th>
                                        <Th>Status</Th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {sales.map((sale) => (
                                        <tr key={sale.id}>
                                            <Td>
                                                <Link href={route("studio.sales.show", sale.id)} className="text-primary-600 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-200">
                                                    {sale.sale_number || `SALE-${sale.id}`}
                                                </Link>
                                            </Td>
                                            <Td>{new Date(sale.created_at).toLocaleString()}</Td>
                                            <Td>{formatMoney(sale.total_amount)}</Td>
                                            <Td>{sale.status || "-"}</Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </HistoryCard>

                <HistoryCard title="Recent Invoices">
                    {invoices.length === 0 ? (
                        <Empty label="invoices" />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
                                <thead className="bg-gray-50/80 dark:bg-slate-900/60">
                                    <tr>
                                        <Th>Invoice #</Th>
                                        <Th>Date</Th>
                                        <Th>Total</Th>
                                        <Th>Status</Th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {invoices.map((invoice) => (
                                        <tr key={invoice.id}>
                                            <Td>{invoice.invoice_number || `INV-${invoice.id}`}</Td>
                                            <Td>{new Date(invoice.created_at).toLocaleString()}</Td>
                                            <Td>{formatMoney(invoice.total_amount)}</Td>
                                            <Td>{invoice.status || "-"}</Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </HistoryCard>

                <HistoryCard title="Credit Bills">
                    {creditOnly.length === 0 ? (
                        <Empty label="credit bills" />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
                                <thead className="bg-gray-50/80 dark:bg-slate-900/60">
                                    <tr>
                                        <Th>Bill #</Th>
                                        <Th>Type</Th>
                                        <Th>Promise Date</Th>
                                        <Th>Balance</Th>
                                        <Th>Status</Th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {creditOnly.map((credit) => (
                                        <tr key={credit.id}>
                                            <Td>
                                                {credit.bill_id ? (
                                                    <Link href={route("studio.bills.show", credit.bill_id)} className="text-primary-600 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-200">
                                                        BILL-{credit.bill_id}
                                                    </Link>
                                                ) : (
                                                    `#${credit.id}`
                                                )}
                                            </Td>
                                            <Td>{credit.type}</Td>
                                            <Td>
                                                <span className="inline-flex items-center gap-1">
                                                    <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                                                    {credit.promise_date || "-"}
                                                </span>
                                            </Td>
                                            <Td>{formatMoney(credit.balance_amount)}</Td>
                                            <Td>{credit.status || "-"}</Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </HistoryCard>

                <HistoryCard title="Advance Payments">
                    {advanceOnly.length === 0 ? (
                        <Empty label="advance payments" />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
                                <thead className="bg-gray-50/80 dark:bg-slate-900/60">
                                    <tr>
                                        <Th>Bill #</Th>
                                        <Th>Type</Th>
                                        <Th>Promise Date</Th>
                                        <Th>Balance</Th>
                                        <Th>Status</Th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {advanceOnly.map((credit) => (
                                        <tr key={credit.id}>
                                            <Td>
                                                {credit.bill_id ? (
                                                    <Link href={route("studio.bills.show", credit.bill_id)} className="text-primary-600 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-200">
                                                        BILL-{credit.bill_id}
                                                    </Link>
                                                ) : (
                                                    `#${credit.id}`
                                                )}
                                            </Td>
                                            <Td>{credit.type}</Td>
                                            <Td>
                                                <span className="inline-flex items-center gap-1">
                                                    <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                                                    {credit.promise_date || "-"}
                                                </span>
                                            </Td>
                                            <Td>{formatMoney(credit.balance_amount)}</Td>
                                            <Td>{credit.status || "-"}</Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </HistoryCard>
            </div>
        </MainLayout>
    );
}

function Metric({ label, value }) {
    return (
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
    );
}

function HistoryCard({ title, children }) {
    return (
        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="border-b border-gray-100 px-6 py-4 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
            </div>
            <div className="p-4">{children}</div>
        </section>
    );
}

function Th({ children }) {
    return <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">{children}</th>;
}

function Td({ children }) {
    return <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{children}</td>;
}
