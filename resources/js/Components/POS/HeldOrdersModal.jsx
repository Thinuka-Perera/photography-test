import { useState } from 'react';
import Modal from '@/Components/Modal';
import { Clock, Trash2, PlayCircle, ShoppingBag, User, X, AlertCircle, Package } from 'lucide-react';

function formatCurrency(value) {
    return new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 2,
    }).format(Number(value || 0));
}

function timeAgo(dateStr) {
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now - then;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

export default function HeldOrdersModal({
    show = false,
    onClose,
    heldOrders = [],
    onResumeOrder,
    onDeleteOrder,
    onDeleteAll,
}) {
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

    const handleDelete = (id) => {
        onDeleteOrder?.(id);
        setConfirmDeleteId(null);
    };

    const handleDeleteAll = () => {
        onDeleteAll?.();
        setConfirmDeleteAll(false);
    };

    return (
        <Modal show={show} maxWidth="2xl" onClose={onClose}>
            <div className="p-8 sm:p-10">
                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3.5 rounded-[2rem] bg-amber-500/10 border border-amber-500/20">
                            <Clock className="w-7 h-7 text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Held Orders</h2>
                            <p className="mt-1 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {heldOrders.length} order{heldOrders.length !== 1 ? 's' : ''} on hold
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2.5 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* List */}
                {heldOrders.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="inline-flex p-5 rounded-[2rem] bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-700 mb-5">
                            <Package className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-sm font-bold text-slate-400">No held orders</p>
                        <p className="text-xs text-slate-300 mt-1">Orders you put on hold will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
                        {heldOrders.map((order) => (
                            <div
                                key={order.id}
                                className="group p-5 rounded-[2rem] border border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-slate-900 hover:border-amber-500/30 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    {/* Order Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="inline-flex px-3 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest border border-amber-500/20">
                                                {order.holdRef}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {timeAgo(order.heldAt)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 mt-3">
                                            {order.customerName ? (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="font-bold truncate max-w-[150px]">{order.customerName}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs font-medium text-slate-400 italic">Walk-in</span>
                                            )}

                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="font-bold">{order.itemCount} item{order.itemCount !== 1 ? 's' : ''}</span>
                                            </div>
                                        </div>

                                        <div className="mt-2">
                                            <span className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                                                {formatCurrency(order.subtotal)}
                                            </span>
                                            {order.notes && (
                                                <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[250px] italic">
                                                    "{order.notes}"
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {confirmDeleteId === order.id ? (
                                            <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(order.id)}
                                                    className="px-3 py-2 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                                                >
                                                    Confirm
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => onResumeOrder?.(order.id)}
                                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-slate-900/10"
                                                >
                                                    <PlayCircle className="w-3.5 h-3.5" />
                                                    Resume
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDeleteId(order.id)}
                                                    className="p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                {heldOrders.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        {confirmDeleteAll ? (
                            <div className="flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex items-center gap-2 text-red-500">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-xs font-bold">Remove all held orders?</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDeleteAll}
                                    className="px-4 py-2 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                                >
                                    Yes, Delete All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmDeleteAll(false)}
                                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setConfirmDeleteAll(true)}
                                className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Clear All
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
