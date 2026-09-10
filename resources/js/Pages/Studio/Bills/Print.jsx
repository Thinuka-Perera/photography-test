import { Head, Link, usePage } from '@inertiajs/react';
import { Printer, ArrowLeft } from 'lucide-react';
import BillPrintA4 from '@/Components/Bills/BillPrintA4';
import BillPrintClientFormat from '@/Components/Bills/BillPrintClientFormat';
import BillPrintThermal from '@/Components/Bills/BillPrintThermal';
import BillPrintArachchiTemplate from '@/Components/Bills/BillPrintArachchiTemplate';

export default function BillPrintPage({ bill, invoiceSettings, shopInfo, print_type = 'a4' }) {
    const { shopSettings: pageShopSettings = {}, activeShop = null } = usePage().props;
    const isThermal = print_type === 'thermal';

    // Determine which A4 template to use based on shop settings
    const templateFormat = invoiceSettings?.invoice_template || shopInfo?.invoice_template || 'default';
    const useClientFormat = templateFormat === 'client_format';

    return (
        <>
            <Head title={`Print ${bill.bill_number}`} />

            <div className="no-print px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <Link
                    href={route('studio.bills.show', bill.id)}
                    className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Bill Details
                </Link>

                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <Link
                            href={route('studio.bills.print', { bill: bill.id, type: 'a4' })}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!isThermal ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            A4 Invoice
                        </Link>
                        <Link
                            href={route('studio.bills.print', { bill: bill.id, type: 'thermal' })}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isThermal ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Thermal Receipt
                        </Link>
                    </div>

                    <button
                        onClick={() => window.print()}
                        className={`px-5 py-2 rounded-xl text-white text-sm font-bold inline-flex items-center gap-2 shadow-lg transition-all active:scale-95 ${isThermal ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-primary-500 hover:bg-primary-600 shadow-primary-500/20'
                            }`}
                    >
                        <Printer className="w-4 h-4" />
                        Print Now
                    </button>
                </div>
            </div>

            <div className="print-area flex justify-center py-8">
                {isThermal ? (
                    <BillPrintThermal bill={bill} shopInfo={shopInfo} invoiceSettings={invoiceSettings} activeShop={activeShop} pageShopSettings={pageShopSettings} />
                ) : useClientFormat ? (
                    <BillPrintClientFormat bill={bill} settings={invoiceSettings} shopInfo={shopInfo} />
                ) : templateFormat.startsWith('arachchi_') ? (
                    <BillPrintArachchiTemplate bill={bill} settings={invoiceSettings} shopInfo={shopInfo} variant={templateFormat} onNewOrder={undefined} />
                ) : (
                    <BillPrintA4 bill={bill} settings={invoiceSettings} shopInfo={shopInfo} />
                )}
            </div>
        </>
    );
}
