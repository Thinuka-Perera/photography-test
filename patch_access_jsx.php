<?php

$file = 'resources/js/Pages/Roles/Access.jsx';
$content = file_get_contents($file);

// Replace togglePermission up to submit
$newFunctions = <<<'JS'
    const hasAccess = (pageKey, action) => {
        if (selectedRole?.locked) return true;
        if (data.permissions.includes('*')) return true;
        if (data.permissions.includes(pageKey)) return true;
        return data.permissions.includes(`${pageKey}.${action}`);
    };

    const togglePermission = (pageKey, action, availableActions) => {
        if (!selectedRole || selectedRole.locked) return;
        if (!adminRoleSlugs.includes(selectedRole.slug) && adminOnlyPages.includes(pageKey)) return;

        let newPermissions = [...data.permissions];

        if (newPermissions.includes(pageKey)) {
            newPermissions = newPermissions.filter(p => p !== pageKey);
            availableActions.forEach(a => {
                if (a !== action) newPermissions.push(`${pageKey}.${a}`);
            });
        } else {
            const perm = `${pageKey}.${action}`;
            if (newPermissions.includes(perm)) {
                newPermissions = newPermissions.filter(p => p !== perm);
                if (action === 'view') {
                    newPermissions = newPermissions.filter(p => !p.startsWith(`${pageKey}.`));
                }
            } else {
                newPermissions.push(perm);
                if (action !== 'view' && !newPermissions.includes(`${pageKey}.view`)) {
                    newPermissions.push(`${pageKey}.view`);
                }
            }
        }
        setData("permissions", newPermissions);
    };

    const toggleRow = (pageKey, availableActions, isAllChecked) => {
        if (!selectedRole || selectedRole.locked) return;
        if (!adminRoleSlugs.includes(selectedRole.slug) && adminOnlyPages.includes(pageKey)) return;

        let newPermissions = [...data.permissions].filter(p => p !== pageKey && !p.startsWith(`${pageKey}.`));
        if (!isAllChecked) {
            availableActions.forEach(a => newPermissions.push(`${pageKey}.${a}`));
        }
        setData("permissions", newPermissions);
    };

    const submit = event => {
JS;

$content = preg_replace('/const togglePermission = pageKey => \{.*?const submit = event => \{/s', $newFunctions, $content);

// Replace the grid of buttons with the matrix table
$tableHtml = <<<'JS'
                                <div className="mt-6 space-y-6">
                                    {pages.map(section => (
                                        <section key={section.section}>
                                            <div className="mb-3">
                                                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                    {section.section}
                                                </h3>
                                            </div>

                                            <div className="overflow-x-auto rounded-3xl border border-gray-200 dark:border-slate-700">
                                                <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                                                    <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-400">
                                                        <tr>
                                                            <th scope="col" className="px-4 py-3 font-semibold w-1/3">Feature</th>
                                                            <th scope="col" className="px-4 py-3 font-semibold text-center w-12">View</th>
                                                            <th scope="col" className="px-4 py-3 font-semibold text-center w-12">Create</th>
                                                            <th scope="col" className="px-4 py-3 font-semibold text-center w-12">Edit</th>
                                                            <th scope="col" className="px-4 py-3 font-semibold text-center w-12">Delete</th>
                                                            <th scope="col" className="px-4 py-3 font-semibold text-center w-16 border-l border-gray-200 dark:border-slate-700">All</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
                                                        {section.pages.map(page => {
                                                            const disabled = selectedRole.locked || (!adminRoleSlugs.includes(selectedRole.slug) && adminOnlyPages.includes(page.key));
                                                            const availableActions = page.available_actions || ['view', 'create', 'edit', 'delete'];
                                                            
                                                            const isAllChecked = availableActions.every(a => hasAccess(page.key, a));

                                                            return (
                                                                <tr key={page.key} className={disabled ? 'opacity-60 bg-gray-50 dark:bg-slate-800/50' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50 transition'}>
                                                                    <td className="px-4 py-4">
                                                                        <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                                            {page.label}
                                                                            {!adminRoleSlugs.includes(selectedRole.slug) && adminOnlyPages.includes(page.key) ? (
                                                                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/10 dark:text-amber-300">
                                                                                    Admin Only
                                                                                </span>
                                                                            ) : null}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                                                                            {page.description}
                                                                        </div>
                                                                    </td>
                                                                    {['view', 'create', 'edit', 'delete'].map(action => {
                                                                        const isAvailable = availableActions.includes(action);
                                                                        const isChecked = hasAccess(page.key, action);
                                                                        return (
                                                                            <td key={action} className="px-4 py-4 text-center align-middle">
                                                                                {isAvailable ? (
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={disabled}
                                                                                        onClick={() => togglePermission(page.key, action, availableActions)}
                                                                                        className={`inline-flex h-5 w-5 items-center justify-center rounded border transition ${
                                                                                            isChecked
                                                                                                ? 'border-primary-500 bg-primary-500 text-white'
                                                                                                : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-900 hover:border-primary-400'
                                                                                        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                                                                    >
                                                                                        {isChecked && <CheckSquare className="h-3.5 w-3.5" />}
                                                                                    </button>
                                                                                ) : (
                                                                                    <span className="text-gray-300 dark:text-slate-600">-</span>
                                                                                )}
                                                                            </td>
                                                                        );
                                                                    })}
                                                                    <td className="px-4 py-4 text-center align-middle border-l border-gray-200 dark:border-slate-700">
                                                                         <button
                                                                            type="button"
                                                                            disabled={disabled}
                                                                            onClick={() => toggleRow(page.key, availableActions, isAllChecked)}
                                                                            className={`inline-flex h-5 w-5 items-center justify-center rounded border transition ${
                                                                                isAllChecked
                                                                                    ? 'border-emerald-500 bg-emerald-500 text-white'
                                                                                    : 'border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-900 hover:border-emerald-400'
                                                                            } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                                                            title="Select All"
                                                                        >
                                                                            {isAllChecked && <CheckSquare className="h-3.5 w-3.5" />}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </section>
                                    ))}
                                </div>
JS;

$content = preg_replace('/<div className="mt-6 space-y-6">.*?<\/div>\s*<\/>/s', $tableHtml . "\n                            </>", $content);

file_put_contents($file, $content);
echo "Updated Access.jsx\n";
