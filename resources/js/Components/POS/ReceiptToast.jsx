import { useState, useEffect } from 'react';
import { Download, MessageCircle, Trash2, X } from 'lucide-react';

export default function ReceiptToast({
    lastSavedBill,
    onSavePDF,
    onWhatsApp,
    onSaveA4PDF,
    onWhatsAppA4,
    onNewOrder,
    onDismiss,
}) {
    const [visible, setVisible] = useState(false);
    const [showA4, setShowA4] = useState(false);

    useEffect(() => {
        if (lastSavedBill) {
            setVisible(true);
            setShowA4(false);
            const timer = setTimeout(() => {
                setVisible(false);
                onDismiss?.();
            }, 30000);
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
        }
    }, [lastSavedBill?.id]);

    if (!visible || !lastSavedBill) return null;

    const handleDismiss = () => {
        setVisible(false);
        onDismiss?.();
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white shadow-2xl shadow-black/30 border border-slate-700/50 backdrop-blur-xl">
                {/* Status dot + bill number */}
                <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-black tracking-wider uppercase text-emerald-400">
                        {lastSavedBill.bill_number}
                    </span>
                </div>

                {/* Primary actions */}
                <button
                    onClick={onSavePDF}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[10px] font-bold uppercase tracking-wider transition-all"
                >
                    <Download className="w-3 h-3" />
                    PDF
                </button>
                <button
                    onClick={onWhatsApp}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-[10px] font-bold uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/20"
                >
                    <MessageCircle className="w-3 h-3" />
                    WhatsApp
                </button>

                {/* A4 toggle */}
                <button
                    onClick={() => setShowA4(!showA4)}
                    className="text-[9px] font-bold text-slate-400 hover:text-white uppercase tracking-wider transition-colors px-1"
                >
                    {showA4 ? '▾ A4' : '▸ A4'}
                </button>

                {showA4 && (
                    <>
                        <button
                            onClick={onSaveA4PDF}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] font-bold uppercase tracking-wider transition-all text-slate-300"
                        >
                            <Download className="w-2.5 h-2.5" />
                            A4 PDF
                        </button>
                        <button
                            onClick={onWhatsAppA4}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] font-bold uppercase tracking-wider transition-all text-slate-300"
                        >
                            <MessageCircle className="w-2.5 h-2.5" />
                            A4 WA
                        </button>
                    </>
                )}

                {/* Separator + New Order */}
                <div className="h-5 w-px bg-slate-700 mx-1" />
                <button
                    onClick={() => { handleDismiss(); onNewOrder?.(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider transition-all"
                >
                    <Trash2 className="w-3 h-3" />
                    New
                </button>

                {/* Close button */}
                <button
                    onClick={handleDismiss}
                    className="ml-1 p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
