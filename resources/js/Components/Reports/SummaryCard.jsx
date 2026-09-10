export default function SummaryCard({ label, value, sub, color = 'blue', icon }) {
    const colors = {
        blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40',
        green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/40',
        orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/40',
        red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/40',
        purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/40',
        rose: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40',
        emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40',
    };

    const Icon = icon;

    return (
        <div className={`rounded-2xl border p-5 ${colors[color] ?? colors.blue}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium opacity-70 dark:opacity-60 uppercase tracking-wide">
                        {label}
                    </p>
                    <p className="text-2xl font-bold mt-1 dark:text-white">{value}</p>
                    {sub && <p className="text-xs opacity-60 dark:opacity-50 mt-1">{sub}</p>}
                </div>

                {Icon && (
                    <span className="text-2xl opacity-60" aria-hidden="true">
                        <Icon className="w-6 h-6" />
                    </span>
                )}
            </div>
        </div>
    );
}