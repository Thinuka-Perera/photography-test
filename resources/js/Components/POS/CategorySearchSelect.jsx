import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';

const UNCATEGORIZED = { id: '', name: 'Uncategorized' };

export default function CategorySearchSelect({ value = '', itemTypes = [], onChange, className = '' }) {
    const inputRef = useRef(null);
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isFiltering, setIsFiltering] = useState(false);
    const [menuRect, setMenuRect] = useState(null);

    const selected = useMemo(
        () => itemTypes.find((item) => String(item.id) === String(value)) ?? null,
        [itemTypes, value],
    );

    const allOptions = useMemo(() => [UNCATEGORIZED, ...itemTypes], [itemTypes]);

    const filteredOptions = useMemo(() => {
        if (!isFiltering) {
            return allOptions;
        }
        const normalized = query.trim().toLowerCase();
        if (!normalized) {
            return allOptions;
        }
        return allOptions.filter((option) => option.name.toLowerCase().includes(normalized));
    }, [allOptions, isFiltering, query]);

    useEffect(() => {
        if (!isOpen) {
            setQuery(selected ? selected.name : UNCATEGORIZED.name);
        }
    }, [selected, isOpen]);

    const updateMenuPosition = () => {
        if (!inputRef.current) return;
        const rect = inputRef.current.getBoundingClientRect();
        setMenuRect({
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
        });
    };

    useEffect(() => {
        if (!isOpen) return undefined;

        updateMenuPosition();
        const onScrollOrResize = () => updateMenuPosition();
        window.addEventListener('scroll', onScrollOrResize, true);
        window.addEventListener('resize', onScrollOrResize);

        return () => {
            window.removeEventListener('scroll', onScrollOrResize, true);
            window.removeEventListener('resize', onScrollOrResize);
        };
    }, [isOpen, query]);

    const openMenu = () => {
        setIsOpen(true);
        setIsFiltering(false);
        setQuery(selected ? selected.name : UNCATEGORIZED.name);
        updateMenuPosition();
        requestAnimationFrame(() => inputRef.current?.select());
    };

    const closeMenu = () => {
        setIsOpen(false);
        setIsFiltering(false);
        setQuery(selected ? selected.name : UNCATEGORIZED.name);
    };

    const handleSelect = (option) => {
        onChange(option.id || null);
        closeMenu();
    };

    const inputClasses = `w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all ${className}`;

    return (
        <>
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setIsFiltering(true);
                        setQuery(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={openMenu}
                    onBlur={() => setTimeout(closeMenu, 150)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            closeMenu();
                            inputRef.current?.blur();
                        }
                    }}
                    placeholder="Search category..."
                    className={inputClasses}
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-autocomplete="list"
                />
                <button
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => (isOpen ? closeMenu() : openMenu())}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Toggle categories"
                >
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {isOpen && menuRect && createPortal(
                <ul
                    className="rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
                    style={{
                        position: 'fixed',
                        top: menuRect.top,
                        left: menuRect.left,
                        width: menuRect.width,
                        zIndex: 9999,
                    }}
                    role="listbox"
                >
                    {filteredOptions.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-slate-400">No matching categories</li>
                    ) : (
                        filteredOptions.map((option) => {
                            const isSelected = String(option.id) === String(value ?? '');
                            return (
                                <li key={option.id || 'uncategorized'} role="option" aria-selected={isSelected}>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleSelect(option)}
                                        className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                                            isSelected
                                                ? 'bg-primary-50 font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                                : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50'
                                        }`}
                                    >
                                        {option.name}
                                    </button>
                                </li>
                            );
                        })
                    )}
                </ul>,
                document.body,
            )}
        </>
    );
}
