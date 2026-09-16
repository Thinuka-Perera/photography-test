import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import ProductCard from './ProductCard';
import PosCategoryRail from './PosCategoryRail';

export default function ProductGrid({ products, categories, onAddToCart, onAdd, allowOutOfStockSelection = false }) {
    const handleAdd = onAddToCart ?? onAdd;
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');

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
        <div className="flex h-full min-h-0 bg-slate-50/30 dark:bg-slate-900/10">
            {/* Category rail */}
            <PosCategoryRail
                categories={categories}
                activeCategory={activeCategory}
                onSelect={setActiveCategory}
            />

            {/* Search + product grid */}
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="px-6 pt-6 pb-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search products by name or SKU..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 scrollbar-thin">
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
        </div>
    );
}
