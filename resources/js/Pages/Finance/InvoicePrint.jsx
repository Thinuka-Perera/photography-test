import { Head } from '@inertiajs/react';
import BillPrintArachchiTemplate from '@/Components/Bills/BillPrintArachchiTemplate';

export default function InvoicePrint({ invoice, shopSettings }) {
    const templateFormat = shopSettings?.invoice_template || 'default';

    return (
        <>
            <Head title={`Print Invoice ${invoice.invoice_number}`} />

            <div className="print-area flex justify-center w-full min-h-screen bg-gray-100">
                <BillPrintArachchiTemplate
                    bill={invoice}
                    settings={shopSettings}
                    shopInfo={shopSettings}
                    variant={templateFormat}
                    onNewOrder={undefined}
                />
            </div>
        </>
    );
}
