import { Barcode, Plus } from "lucide-react";

function Readout({ label, value, mono = false }) {
    return (
        <div className="min-w-[80px] rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {label}
            </p>
            <p
                className={`truncate text-sm font-bold text-slate-800 dark:text-slate-100 ${
                    mono ? "font-mono" : ""
                }`}
            >
                {value}
            </p>
        </div>
    );
}

/**
 * @param {{
 *   barcodeInputRef: React.RefObject<HTMLInputElement>,
 *   barcodeInput: string,
 *   onBarcodeInputChange: (value: string) => void,
 *   onBarcodeSubmit: (e: React.FormEvent) => void,
 *   onBarcodeKeyDown: (e: React.KeyboardEvent) => void,
 *   billNumber: string | number,
 *   billDate: string,
 *   itemCount: number,
 * }} props
 */
export default function PosInfoBar({
    barcodeInputRef,
    barcodeInput,
    onBarcodeInputChange,
    onBarcodeSubmit,
    onBarcodeKeyDown,
    billNumber,
    billDate,
    itemCount = 0,
}) {
    return (
        <div className="shrink-0 flex flex-col gap-3 rounded-2xl border border-slate-200/60 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center">
            {/* Barcode / SKU scan-and-add */}
            <form
                onSubmit={onBarcodeSubmit}
                className="flex flex-1 items-center gap-2"
            >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-md">
                    <Barcode className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <input
                    ref={barcodeInputRef}
                    type="text"
                    placeholder="Scan or enter barcode / SKU..."
                    value={barcodeInput}
                    onChange={(e) => onBarcodeInputChange(e.target.value)}
                    onKeyDown={onBarcodeKeyDown}
                    className="h-14 min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 font-mono text-base text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                />
                <button
                    type="submit"
                    className="flex h-14 shrink-0 items-center gap-2 rounded-xl bg-primary-600 px-6 text-sm font-bold uppercase tracking-wider text-white shadow-md transition-colors hover:bg-primary-700"
                >
                    <Plus className="h-5 w-5" strokeWidth={2.25} />
                    Add
                </button>
            </form>

            {/* Live readouts */}
            <div className="flex items-center gap-2 lg:gap-3">
                <Readout label="Bill No" value={billNumber ?? "—"} mono />
                <Readout label="Date" value={billDate || "—"} />
                <Readout label="Items" value={itemCount} />
            </div>
        </div>
    );
}
