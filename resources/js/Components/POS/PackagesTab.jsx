import React, { useState, useMemo } from 'react';
import { Search, Sparkles, Check, PackageOpen, Award, ArrowRight } from 'lucide-react';

export default function PackagesTab({ packages = [], onAddPackage }) {
    const [search, setSearch] = useState('');

    const filteredPackages = useMemo(() => {
        return packages.filter((pkg) => {
            const matchesSearch =
                search === '' ||
                pkg.name.toLowerCase().includes(search.toLowerCase()) ||
                (pkg.category && pkg.category.toLowerCase().includes(search.toLowerCase())) ||
                (pkg.event_type && pkg.event_type.toLowerCase().includes(search.toLowerCase()));

            return matchesSearch;
        });
    }, [packages, search]);

    return (
        <div className="flex flex-col h-full bg-slate-50/30 dark:bg-slate-900/10 p-6 space-y-6">
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary-500 transition-colors" />
                <input
                    type="text"
                    placeholder="Search photography packages by name, category, or event type..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-sm"
                />
            </div>

            <div className="flex-1 overflow-y-auto max-h-[500px] scrollbar-thin">
                {filteredPackages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-300 dark:text-slate-600 bg-white dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                        <PackageOpen className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm font-bold uppercase tracking-widest">No Packages Found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                        {filteredPackages.map((pkg) => (
                            <div
                                key={pkg.id}
                                className="group relative flex flex-col justify-between p-6 rounded-3xl border border-slate-200/60 dark:border-slate-700/50 bg-white dark:bg-slate-800 hover:border-primary-500/50 dark:hover:border-primary-500/50 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all duration-300"
                            >
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <span className="inline-block px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-2">
                                                {pkg.category || 'Package'}
                                            </span>
                                            <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-primary-500 transition-colors uppercase leading-tight line-clamp-1">
                                                {pkg.name}
                                            </h4>
                                            {pkg.event_type && (
                                                <p className="text-xs text-slate-400 font-medium italic mt-0.5">
                                                    For: {pkg.event_type}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Price</span>
                                            <span className="text-base font-black text-slate-950 dark:text-white tracking-tight">
                                                {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(pkg.total_price)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Services list */}
                                    {pkg.services && pkg.services.length > 0 && (
                                        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/80">
                                            <span className="text-[9px] font-black text-slate-460 dark:text-slate-400 uppercase tracking-widest block">Included Services:</span>
                                            <div className="grid grid-cols-1 gap-1">
                                                {pkg.services.slice(0, 4).map((s, idx) => (
                                                    <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                                                        <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                                        <span className="truncate">{s.name}</span>
                                                    </div>
                                                ))}
                                                {pkg.services.length > 4 && (
                                                    <span className="text-[10px] text-slate-400 font-semibold italic pl-5">
                                                        + {pkg.services.length - 4} more services
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Deliverables list */}
                                    {pkg.deliverables && pkg.deliverables.length > 0 && (
                                        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/80">
                                            <span className="text-[9px] font-black text-slate-460 dark:text-slate-400 uppercase tracking-widest block">Deliverables:</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {pkg.deliverables.map((d, idx) => (
                                                    <span key={idx} className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-650">
                                                        {d}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {pkg.notes && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                                            {pkg.notes}
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => onAddPackage(pkg)}
                                    className="w-full mt-6 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-primary-500 hover:text-white dark:hover:bg-primary-500 dark:hover:text-white text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-[0.98]"
                                >
                                    Add Package to Cart
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
