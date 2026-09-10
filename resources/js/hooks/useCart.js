import { useState, useMemo, useCallback } from 'react';

// All money math in integer cents — prevents floating point errors
const toCents = (amount) => Math.round(parseFloat(amount) * 100);
const fromCents = (cents) => (cents / 100).toFixed(2);

export function useCart(taxRate = 0) {
    const [items, setItems] = useState([]);
    const [cartDiscountPct, setCartDiscountPct] = useState(0);

    // ── Item operations ───────────────────────────────────────────

    const addItem = useCallback((product) => {
        setItems((prev) => {
            const existing = prev.find((i) => i.product_id === product.id);

            if (existing) {
                // Already in cart — increment quantity (respect stock cap)
                return prev.map((i) =>
                    i.product_id === product.id
                        ? { ...i, quantity: Math.min(i.quantity + 1, i.stock) }
                        : i,
                );
            }

            // New item snapshot — price/name captured at add time
            return [
                ...prev,
                {
                    product_id: product.id,
                    product_name: product.name,
                    product_sku: product.sku ?? null,
                    unit_price: parseFloat(product.price),
                    quantity: 1,
                    discount_pct: 0,
                    stock: product.stock, // for max qty guard
                },
            ];
        });
    }, []);

    const removeItem = useCallback((productId) => {
        setItems((prev) => prev.filter((i) => i.product_id !== productId));
    }, []);

    const updateQuantity = useCallback(
        (productId, qty) => {
            const newQty = parseInt(qty);
            if (isNaN(newQty) || newQty < 1) {
                removeItem(productId);
                return;
            }
            setItems((prev) =>
                prev.map((i) =>
                    i.product_id === productId
                        ? { ...i, quantity: Math.min(newQty, i.stock) }
                        : i,
                ),
            );
        },
        [removeItem],
    );

    const updateItemDiscount = useCallback((productId, discountPct) => {
        const pct = Math.min(100, Math.max(0, parseFloat(discountPct) || 0));
        setItems((prev) =>
            prev.map((i) =>
                i.product_id === productId ? { ...i, discount_pct: pct } : i,
            ),
        );
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
        setCartDiscountPct(0);
    }, []);

    // ── Totals (memoized — only recalculates when items/discounts change) ──

    const totals = useMemo(() => {
        let subtotalCents = 0;

        // Step 1: calculate each line total in cents
        const processedItems = items.map((item) => {
            const unitCents = toCents(item.unit_price);
            const lineRawCents = unitCents * item.quantity;
            const itemDiscCents = Math.round(
                lineRawCents * (item.discount_pct / 100),
            );
            const lineTotalCents = lineRawCents - itemDiscCents;

            subtotalCents += lineTotalCents;

            return {
                ...item,
                line_discount_amount: fromCents(itemDiscCents),
                line_total: fromCents(lineTotalCents),
            };
        });

        // Step 2: cart-level discount on sum of all line totals
        const cartDiscCents = Math.round(subtotalCents * (cartDiscountPct / 100));
        const afterDiscCents = subtotalCents - cartDiscCents;

        // Step 3: tax applied after all discounts
        const taxCents = Math.round(afterDiscCents * (taxRate / 100));
        const totalCents = afterDiscCents + taxCents;

        return {
            subtotal: fromCents(subtotalCents),
            discount_amount: fromCents(cartDiscCents),
            tax_amount: fromCents(taxCents),
            total_amount: fromCents(totalCents),
            processedItems, // items enriched with computed line totals
        };
    }, [items, cartDiscountPct, taxRate]);

    return {
        items,
        cartDiscountPct,
        setCartDiscountPct,
        totals,
        addItem,
        removeItem,
        updateQuantity,
        updateItemDiscount,
        clearCart,
        isEmpty: items.length === 0,
        itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    };
}
