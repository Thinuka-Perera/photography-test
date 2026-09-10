import '../css/app.css';
import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { route } from 'ziggy-js';

const appName =
    import.meta.env.VITE_APP_NAME || "Photography Shop Management System";

const originalPost = router.post.bind(router);

const flattenedCompatibilityRoutes = [
    {
        pattern: /^\/categories\/([^/?#]+)\/?$/,
        basePath: '/categories',
        idKey: 'category_id',
    },
    {
        pattern: /^\/employees\/([^/?#]+)\/?$/,
        basePath: '/employees',
        idKey: 'employee_id',
    },
    {
        pattern: /^\/attendance\/([^/?#]+)\/?$/,
        basePath: '/attendance',
        idKey: 'attendance_id',
    },
    {
        pattern: /^\/settings\/bill-categories\/([^/?#]+)\/?$/,
        basePath: '/settings/bill-categories',
        idKey: 'bill_category_id',
    },
];

function getActiveShopSlug() {
    if (typeof window === 'undefined') {
        return null;
    }

    if (typeof window.__activeShopSlug === 'string' && window.__activeShopSlug !== '') {
        return window.__activeShopSlug;
    }

    try {
        return new URL(window.location.href).searchParams.get('shop');
    } catch {
        return null;
    }
}

function appendCompatibilityAction(url, action) {
    if (typeof url !== 'string' || url.length === 0) {
        return url;
    }

    try {
        const parsed = new URL(url, window.location.origin);
        const trimmedPath = parsed.pathname !== '/'
            ? parsed.pathname.replace(/\/$/, '')
            : parsed.pathname;

        if (!trimmedPath.endsWith(`/${action}`)) {
            parsed.pathname = `${trimmedPath}/${action}`;
        }

        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        const [base, hash = ''] = url.split('#');
        const [path, search = ''] = base.split('?');
        const trimmedPath = path.replace(/\/$/, '');
        const nextPath = trimmedPath.endsWith(`/${action}`)
            ? trimmedPath
            : `${trimmedPath}/${action}`;
        const nextSearch = search ? `?${search}` : '';
        const nextHash = hash ? `#${hash}` : '';

        return `${nextPath}${nextSearch}${nextHash}`;
    }
}

function attachCompatibilityIdentifier(data, idKey, rawId) {
    if (!idKey || rawId == null || rawId === '') {
        return data;
    }

    if (typeof FormData !== 'undefined' && data instanceof FormData) {
        if (!data.has(idKey)) {
            data.append(idKey, rawId);
        }

        return data;
    }

    if (data == null) {
        return { [idKey]: rawId };
    }

    if (typeof data === 'object' && !Array.isArray(data) && data[idKey] === undefined) {
        return { ...data, [idKey]: rawId };
    }

    return data;
}

function normalizeCompatibilityRequest(url, data, action) {
    if (typeof url !== 'string' || url.length === 0) {
        return {
            url,
            data,
        };
    }

    try {
        const parsed = new URL(url, window.location.origin);

        for (const routeConfig of flattenedCompatibilityRoutes) {
            const match = parsed.pathname.match(routeConfig.pattern);

            if (!match) {
                continue;
            }

            parsed.pathname = `${routeConfig.basePath}/${action}`;

            return {
                url: `${parsed.pathname}${parsed.search}${parsed.hash}`,
                data: attachCompatibilityIdentifier(data, routeConfig.idKey, match[1]),
            };
        }
    } catch {
        // Fall through to the default compatibility path rewrite.
    }

    return {
        url: appendCompatibilityAction(url, action),
        data,
    };
}

function appendShopQuery(url) {
    const slug = getActiveShopSlug();
    if (!slug || typeof url !== 'string' || url.length === 0) {
        return url;
    }

    try {
        const parsed = new URL(url, window.location.origin);

        if (!parsed.searchParams.has('shop')) {
            parsed.searchParams.set('shop', slug);
        }

        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
        if (/[?&]shop=/.test(url)) {
            return url;
        }

        return `${url}${url.includes('?') ? '&' : '?'}shop=${encodeURIComponent(slug)}`;
    }
}

function attachShopToData(data) {
    const slug = getActiveShopSlug();
    if (!slug || data == null) {
        return data;
    }

    if (typeof FormData !== 'undefined' && data instanceof FormData) {
        if (!data.has('shop')) {
            data.append('shop', slug);
        }

        return data;
    }

    if (typeof data === 'object' && !Array.isArray(data) && data.shop === undefined) {
        return { ...data, shop: slug };
    }

    return data;
}

router.put = (url, data = {}, options = {}) =>
    (() => {
        const normalized = normalizeCompatibilityRequest(url, data, 'update');

        return originalPost(
            appendShopQuery(normalized.url),
            attachShopToData(normalized.data),
            options,
        );
    })();

router.patch = (url, data = {}, options = {}) =>
    (() => {
        const normalized = normalizeCompatibilityRequest(url, data, 'update');

        return originalPost(
            appendShopQuery(normalized.url),
            attachShopToData(normalized.data),
            options,
        );
    })();

router.delete = (url, options = {}) => {
    const { data = {}, ...visitOptions } = options ?? {};
    const normalized = normalizeCompatibilityRequest(url, data, 'delete');

    return originalPost(
        appendShopQuery(normalized.url),
        attachShopToData(normalized.data),
        visitOptions,
    );
};

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        // Make Ziggy's route() available globally so all React pages can use route('name')
        // without importing it in every file.
        window.Ziggy = props.initialPage.props.ziggy;

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});
