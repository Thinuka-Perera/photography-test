import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import ProductCard from './ProductCard';

export default function ProductGrid({ products, categories, onAddToCart, focusSearchTrigger, onAdd, allowOutOfStockSelection = false }) {
    const handleAdd = onAddToCart ?? onAdd;
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const searchInputRef = useRef(null);

    useEffect(() => {
        if (focusSearchTrigger > 0) {
            searchInputRef.current?.focus();

            searchInputRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }, [focusSearchTrigger]);
    const filtered = useMemo(() => {
        return products.filter((p) => {
            const matchesSearch =
                search === '' ||
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
                (p.size && p.size.toLowerCase().includes(search.toLowerCase()));

            const matchesCategory =
                activeCategory === 'all' || p.category_id === activeCategory;

            return matchesSearch && matchesCategory;
        });
    }, [products, search, activeCategory]);

    const groupedProducts = useMemo(() => {
        const groups = {};
        filtered.forEach(p => {
            if (!groups[p.base_product_id]) {
                groups[p.base_product_id] = {
                    ...p,
                    stock: 0,
                    variants: []
                };
            }
            groups[p.base_product_id].variants.push(p);
            groups[p.base_product_id].stock += Number(p.stock) || 0;
        });
        return Object.values(groups);
    }, [filtered]);

    return (
        <div className="flex flex-col h-full bg-slate-50/30 dark:bg-slate-900/10">
            <div className="px-6 py-6 space-y-6">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary-500 transition-colors" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search products by name or SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-sm"
                    />
                </div>

                <div className="flex gap-2 pb-2 overflow-x-auto scrollbar-hide">
                    <button
                        onClick={() => setActiveCategory('all')}
                        className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeCategory === 'all'
                                ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-lg shadow-slate-900/10'
                                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700'
                            }`}
                    >
                        All Items
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeCategory === cat.id
                                    ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-lg shadow-slate-900/10'
                                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700'
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin">
                {groupedProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-300 dark:text-slate-600 bg-white dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                        <Search className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm font-bold uppercase tracking-widest">No Matches Found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {groupedProducts.map((productGroup) => (
                            <ProductCard
                                key={productGroup.base_product_id}
                                product={productGroup}
                                onAdd={() => {
                                    if (productGroup.variants.length === 1) {
                                        handleAdd(productGroup.variants[0]);
                                    } else {
                                        handleAdd(productGroup);
                                    }
                                }}
                                allowOutOfStockSelection={allowOutOfStockSelection}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
