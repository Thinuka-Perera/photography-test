
/**
 * @param {{ children: React.ReactNode }} props
 */
export default function PosWorkArea({ children }) {
    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {children}
        </div>
    );
}
