<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

/**
 * ProductVariant Model
 *
 * Represents ONE specific, stocked, sellable combination of a product.
 * e.g. "Photo Frame" → "4x6 Grade A" is a single ProductVariant.
 *
 * Key Behaviours (handled via model boot events):
 *
 * 1. AUTO SKU GENERATION
 *    On create, if no SKU is provided, one is generated automatically.
 *    Format: [CATEGORY_PREFIX]-[SIZE]-GRA-[GRADE]
 *    e.g.    FRM-4X6-GRA-A
 *    The user can still manually override the SKU from the UI.
 *
 * 2. AUTO BARCODE GENERATION
 *    On create, a barcode string is generated from the SKU.
 *    The user can regenerate the barcode at any time from the UI.
 *
 * 3. AUTO INVENTORY RECORD CREATION
 *    On create, an Inventory row is automatically created for this variant
 *    so that current_stock tracking is available immediately.
 *
 * @property int         $id
 * @property int         $product_id
 * @property string|null $size          e.g. "4x6", "8x10", "A4"
 * @property string|null $grade_type    e.g. "A", "B", "C"
 * @property string      $sku           Unique, auto-generated, editable
 * @property string|null $barcode       Auto-generated barcode string
 * @property float       $cost_price
 * @property float       $selling_price
 */
class ProductVariant extends Model
{
    use BelongsToShop;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'shop_id',
        'product_id',
        'sort_order',
        'size',
        'grade_type',
        'sku',
        'barcode',
        'cost_price',
        'selling_price',
    ];

    /**
     * Cast numeric price fields to float for accurate arithmetic.
     */
    protected $casts = [
        'cost_price'    => 'float',
        'selling_price' => 'float',
    ];

    // ─────────────────────────────────────────────
    // Model Boot — Auto-generation Logic
    // ─────────────────────────────────────────────

    /**
     * Boot method runs once when the model class is loaded.
     * Registers lifecycle hooks (creating, created) for auto-generation.
     */
    protected static function boot(): void
    {
        parent::boot();

        /**
         * BEFORE INSERT:
         * Auto-generate SKU and barcode if they are not provided by the user.
         * SKU format: [PREFIX]-[SIZE]-GRA-[GRADE]
         * e.g.        FRM-4X6-GRA-A
         *
         * Prefix is derived from the product's category name:
         *   "Photo Frames" → "FRM"
         *   "Inks"         → "INK"
         *   (falls back to first 3 chars of product name if category unavailable)
         */
        static::creating(function (ProductVariant $variant) {
            // Inherit shop_id from the parent product if the caller didn't set it.
            // Keeps the catalog tightly scoped to a single shop without forcing every
            // call site to re-state the shop_id explicitly.
            if (empty($variant->shop_id) && $variant->product_id) {
                $variant->shop_id = Product::query()
                    ->whereKey($variant->product_id)
                    ->value('shop_id');
            }

            if (empty($variant->sku)) {
                $variant->sku = static::generateSku($variant);
            }
            if (empty($variant->barcode)) {
                // Barcode is the SKU encoded — stored as a plain string for barcode libraries to render
                $variant->barcode = strtoupper(Str::slug($variant->sku, ''));
            }
        });

        /**
         * AFTER INSERT:
         * Automatically create a companion Inventory record for this variant.
         * This ensures current_stock tracking is ready immediately after creation.
         * The inventory row inherits the variant's shop_id so per-shop stock
         * counters stay in sync from day one.
         * Default: current_stock = 0, low_stock_threshold = 10
         */
        static::created(function (ProductVariant $variant) {
            $variant->inventory()->create([
                'shop_id'             => $variant->shop_id,
                'current_stock'       => 0,
                'low_stock_threshold' => 10,
            ]);
        });
    }

    // ─────────────────────────────────────────────
    // SKU Generation Helper
    // ─────────────────────────────────────────────

    /**
     * Generate a unique SKU string for a new variant.
     * Format: [CATEGORY_PREFIX]-[SIZE]-GRA-[GRADE]
     * e.g.    FRM-4X6-GRA-A
     *
     * If a conflict exists (duplicate SKU in DB), a numeric suffix is appended:
     * e.g.    FRM-4X6-GRA-A-2
     */
    protected static function generateSku(ProductVariant $variant): string
    {
        // Load the parent product and its category for the prefix
        $product  = Product::with('category')->find($variant->product_id);
        $category = $product?->category;

        // Derive 3-char prefix from category name, or fall back to product name
        $prefix = $category
            ? strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $category->name), 0, 3))
            : strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $product?->name ?? 'GEN'), 0, 3));

        // Build the size and grade parts, stripping spaces and special chars
        $sizePart  = $variant->size       ? strtoupper(str_replace([' ', 'x', 'X'], ['', 'X', 'X'], $variant->size)) : 'STD';
        $gradePart = $variant->grade_type ? strtoupper(preg_replace('/[^A-Z0-9]/', '', $variant->grade_type)) : 'STD';

        $base = "{$prefix}-{$sizePart}-GRA-{$gradePart}";

        // Uniqueness is enforced per-shop — the same SKU may legitimately exist
        // in two different shops since each shop owns its own catalog.
        $shopId = $variant->shop_id;
        $sku    = $base;
        $count  = 2;
        while (static::query()
            ->where('sku', $sku)
            ->when($shopId, fn ($q) => $q->where('shop_id', $shopId))
            ->exists()
        ) {
            $sku = "{$base}-{$count}";
            $count++;
        }

        return $sku;
    }

    // ─────────────────────────────────────────────
    // Accessors
    // ─────────────────────────────────────────────

    /**
     * Calculated balance accessor.
     * Returns the live balance for this variant:
     *   Balance = SUM(stock_logs IN) - SUM(stock_logs OUT)
     *
     * Usage: $variant->balance
     * Note: This queries the DB each time it's called. For bulk lists,
     * prefer computing balance via StockService::getBalance($shopId, $variantId)
     * with eager loading.
     */
    public function getBalanceAttribute(): int
    {
        $in  = $this->stockLogs()->where('type', 'IN')->sum('quantity');
        $out = $this->stockLogs()->where('type', 'OUT')->sum('quantity');
        return $in - $out;
    }

    // ─────────────────────────────────────────────
    // Relationships
    // ─────────────────────────────────────────────

    /**
     * A variant belongs to one parent product.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * A variant has one inventory record (current stock snapshot).
     * Created automatically on variant creation via the 'created' boot hook above.
     */
    public function inventory(): HasOne
    {
        return $this->hasOne(Inventory::class, 'variant_id');
    }

    /**
     * A variant has many stock log entries (full IN/OUT audit trail).
     * All stock movements are recorded here — never deleted or edited.
     */
    public function stockLogs(): HasMany
    {
        return $this->hasMany(StockLog::class, 'variant_id');
    }
}
