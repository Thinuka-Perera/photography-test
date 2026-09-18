import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CollapsibleSection({
    icon,
    title,
    badge = null,
    defaultOpen = false,
    open: controlledOpen,
    onToggle,
    children,
    className = '',
}) {
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    const contentRef = useRef(null);
    const [height, setHeight] = useState(defaultOpen ? 'auto' : '0px');

    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

    const toggle = () => {
        const next = !isOpen;
        if (controlledOpen === undefined) {
            setInternalOpen(next);
        }
        onToggle?.(next);
    };

    useEffect(() => {
        if (!contentRef.current) return;
        if (isOpen) {
            setHeight(`${contentRef.current.scrollHeight}px`);
            const timer = setTimeout(() => setHeight('auto'), 200);
            return () => clearTimeout(timer);
        } else {
            // Collapse: set explicit height first, then 0
            setHeight(`${contentRef.current.scrollHeight}px`);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setHeight('0px'));
            });
        }
    }, [isOpen]);

    return (
        <div className={`rounded-2xl border border-slate-100 dark:border-slate-700/50 overflow-hidden transition-colors ${isOpen ? 'bg-white dark:bg-slate-800/50' : 'bg-slate-50/50 dark:bg-slate-900/20'} ${className}`}>
            <button
                type="button"
                onClick={toggle}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
            >
                <div className="flex items-center gap-2 min-w-0">
                    {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">
                        {title}
                    </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {!isOpen && badge && (
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                            {badge}
                        </span>
                    )}
                    <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>
            <div
                ref={contentRef}
                style={{ height, overflow: height === 'auto' ? 'visible' : 'hidden' }}
                className="transition-[height] duration-200 ease-in-out"
            >
                <div className="px-4 pb-4">
                    {children}
                </div>
            </div>
        </div>
    );
}
