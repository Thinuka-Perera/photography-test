/**
 * @param {{
 *   categories: Array<{ id: string | number, name: string }>,
 *   activeCategory: string | number,
 *   onSelect: (id: string | number) => void,
 * }} props
 */
export default function PosCategoryRail({
    categories = [],
    activeCategory,
    onSelect,
}) {
    const items = [{ id: "all", name: "All Items" }, ...categories];

    return (
        <div className="flex w-40 shrink-0 flex-col gap-1.5 overflow-y-auto border-r border-slate-200/60 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/20 xl:w-48">
            <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Categories
            </p>
            {items.map((cat) => {
                const active = activeCategory === cat.id;
                return (
                    <button
                        key={cat.id}
                        type="button"
                        onClick={() => onSelect(cat.id)}
                        aria-pressed={active}
                        className={`flex min-h-[44px] items-center rounded-xl px-3 text-left text-sm font-semibold transition-all ${
                            active
                                ? "bg-primary-600 text-white shadow-md"
                                : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                    >
                        {cat.name}
                    </button>
                );
            })}
        </div>
    );
}
