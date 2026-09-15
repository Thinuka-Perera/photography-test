import ProductGrid from '@/Components/POS/ProductGrid';

export default function StockTab({
    products = [],
    categories = [],
    onAddToCart,
    focusSearchTrigger,
}) {
    return (
        <div className="h-full">
            <ProductGrid
                products={products}
                categories={categories}
                onAddToCart={onAddToCart}
                focusSearchTrigger={focusSearchTrigger}
            />
        </div>
    );
}