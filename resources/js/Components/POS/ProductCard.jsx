import { Camera, Plus } from 'lucide-react';

export default function ProductCard({ product, onAdd, allowOutOfStockSelection = false }) {
    const outOfStock = product.stock === 0;

    return (
        <button
            onClick={() => (!outOfStock || allowOutOfStockSelection) && onAdd(product)}
            disabled={outOfStock && !allowOutOfStockSelection}
            className={`
                group relative flex flex-col items-start p-4 rounded-3xl border text-left
                transition-all duration-300 w-full
                ${outOfStock && !allowOutOfStockSelection
                    ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-60 cursor-not-allowed'
                    : 'bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/50 hover:border-primary-500/50 dark:hover:border-primary-500/50 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none hover:-translate-y-1'
                }
                ${(outOfStock && allowOutOfStockSelection) ? 'opacity-80' : ''}
            `}
        >
            <div className="relative w-full aspect-square rounded-2xl bg-slate-50 dark:bg-slate-900 mb-4 overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-700/50">
                {product.image ? (
                    <>
                        <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                            }}
                        />
                        <div className="items-center justify-center opacity-20" style={{ display: 'none' }}>
                            <Camera className="w-10 h-10 text-slate-400" />
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center opacity-20">
                        <Camera className="w-10 h-10 text-slate-400" />
                    </div>
                )}

                {outOfStock ? (
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="bg-white text-slate-900 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-xl">
                            Sold Out
                        </span>
                    </div>
                ) : product.stock <= 5 && (
                    <div className="absolute top-2 right-2">
                        <span className="bg-orange-500 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider shadow-lg">
                            Low Stock
                        </span>
                    </div>
                )}
            </div>

            <div className="space-y-1 w-full">
                <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight line-clamp-1 uppercase tracking-wide">
                    {product.name} {product.size ? `(${product.size})` : ''}
                </p>
                <div className="flex items-center justify-between gap-2 pt-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Price</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                            {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(product.price)}
                        </span>
                    </div>
                    {!outOfStock && (
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stock</span>
                            <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                                {product.stock} <span className="text-slate-400 font-medium capitalize">{product.uom || 'Units'}</span>
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute bottom-4 right-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 shadow-xl">
                    <Plus className="w-4 h-4" />
                </div>
            </div>
        </button>
    );
}
