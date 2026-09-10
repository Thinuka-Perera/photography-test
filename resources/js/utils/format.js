/**
 * Format a number as Sri Lankan Rupees.
 * Uses Intl.NumberFormat for locale-correct output.
 * Falls back gracefully on null/undefined/NaN.
 *
 * Output: "Rs. 1,250.00"
 */
/**
 * Format receipt quantities without unnecessary decimals (e.g. 1.00 → "1", 1.5 → "1.5").
 * Thermal/WhatsApp receipts use this instead of raw numeric values.
 */
export const formatReceiptQuantity = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) {
        return '0';
    }
    if (Number.isInteger(num) || Math.abs(num - Math.round(num)) < 0.0001) {
        return String(Math.round(num));
    }
    return String(parseFloat(num.toFixed(2)));
};

export const formatMoney = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return 'Rs. 0.00';

    return new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
    })
        .format(num)
        .replace('LKR', 'Rs.')
        .trim();
};

/**
 * Format a date/datetime string for display.
 * Uses en-LK locale for correct Sri Lanka formatting.
 */
export const formatDate = (dateStr, options = {}) => {
    const defaults = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    };

    return new Date(dateStr).toLocaleDateString('en-LK', {
        ...defaults,
        ...options,
    });
};

export const formatDateTime = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-LK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const formatDateShort = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-LK', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

/**
 * Calendar date only (avoids UTC midnight shifting the day).
 * Accepts Y-m-d, ISO datetime, etc.
 */
export const formatDateOnly = (dateStr, options = {}) => {
    if (!dateStr) {
        return '—';
    }

    const str = String(dateStr);
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (match) {
        const [, year, month, day] = match;
        const date = new Date(Number(year), Number(month) - 1, Number(day));

        return date.toLocaleDateString('en-LK', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            weekday: 'short',
            ...options,
        });
    }

    return formatDate(str, options);
};

/**
 * Time-of-day for DB time / ISO strings (e.g. 09:30:00 → 9:30 AM).
 */
export const formatTimeOnly = (timeStr) => {
    if (!timeStr) {
        return '—';
    }

    const str = String(timeStr);
    const match = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);

    if (!match) {
        return str;
    }

    const hour = Number(match[1]);
    const minute = match[2];
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;

    return `${hour12}:${minute} ${period}`;
};

/** Y-m-d for date inputs from API values. */
export const toDateInputValue = (value) => {
    if (!value) {
        return '';
    }

    const str = String(value);
    const match = str.match(/^(\d{4}-\d{2}-\d{2})/);

    if (match) {
        return match[1];
    }

    const date = new Date(str);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toISOString().slice(0, 10);
};

/**
 * Strips size notation (e.g. "(3X4)", "(0.75")") from item description
 * to prevent duplicate size display in invoice/quotation tables.
 */
export const getCleanDescription = (description, size) => {
    if (!description) return '-';
    let clean = String(description).trim();

    if (size && size !== '-') {
        const escapedSize = String(size).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const sizeRegex = new RegExp(`\\s*\\(\\s*${escapedSize}\\s*\\)$`, 'i');
        if (sizeRegex.test(clean)) {
            clean = clean.replace(sizeRegex, '');
        }
    }

    // Generic dimension pattern in trailing parentheses: e.g. " (3X4)", " (0.75")"
    clean = clean.replace(/\s*\(\s*\d+(\.\d+)?\s*["″xX]\s*\d*(\.\d+)?["″]?\s*\)$/i, '');

    return clean.trim() || description;
};

