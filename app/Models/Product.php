<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

/**
 * Product Model
 *
 * Represents a base/parent product definition — the "family" of items.
 * One Product can have MANY ProductVariants (different sizes, grades, etc.).
 *
 * Example:
 *   Product: "Photo Frame"
 *     → Variants: 4x6 Grade A, 4x6 Grade B, 8x10 Grade A, etc.
 *
 * The metadata JSON column stores flexible extra information:
 *   e.g. for inks: {"compatible_machines": ["Epson P7000", "L18050"], "colors": 6}
 *
 * @property int         $id
 * @property string      $name
 * @property int         $category_id
 * @property string|null $description
 * @property string      $uom          Unit of measure: 'sheet', 'unit', 'bottle', 'roll'
 * @property string|null $image        Relative path in storage/app/public/products/
 * @property array|null  $metadata     JSON decoded as array
 * @property string|null $image_url    Computed: full URL for the image (via accessor)
 */
class Product extends Model
{
    use BelongsToShop;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'shop_id',
        'name',
        'category_id',
        'description',
        'uom',
        'image',    // Relative path to product image stored in storage/app/public/products/
        'location',
        'metadata',
    ];

    /**
     * Type cast the metadata column from JSON string to a PHP array automatically.
     * This means $product->metadata returns an array, not a raw JSON string.
     */
    protected $casts = [
        'metadata' => 'array',
    ];

    /**
     * Append computed attributes to every serialized response.
     * 'image_url' is included so React gets a full resolved URL
     * instead of relying on the /storage/ symlink directly.
     */
    protected $appends = ['image_url'];

    // ─────────────────────────────────────────────
    // Accessors
    // ─────────────────────────────────────────────

    /**
     * Return the full public URL for the product image.
     * Uses Laravel's Storage::url() which resolves correctly regardless
     * of whether the public storage symlink is working (e.g. on Windows dev).
     *
     * Returns null if no image has been uploaded.
     * Usage in React: product.image_url → "http://127.0.0.1:8000/storage/products/xyz.jpg"
     */
    public function getImageUrlAttribute(): ?string
    {
        return $this->image ? Storage::disk('public')->url($this->image) : null;
    }

    // ─────────────────────────────────────────────
    // Relationships
    // ─────────────────────────────────────────────

    /**
     * A product belongs to one category.
     * e.g. "Photo Frame" belongs to "Photo Frames" category (type: frame)
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * A product has many variants.
     * Each variant is a unique stocked combination (size + grade).
     * e.g. Photo Frame → [4x6 Grade A, 4x6 Grade B, 8x10 Grade A]
     */
    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->orderBy('sort_order')->orderBy('id');
    }

    /**
     * Scope a query to search products by name, description, category, or variant identifiers.
     */
    public function scopeSearch($query, $search)
    {
        if (empty($search)) {
            return $query;
        }

        $term = '%' . $search . '%';

        return $query->where(function ($q) use ($term) {
            $q->where('products.name', 'like', $term)
              ->orWhere('products.description', 'like', $term)
              ->orWhere('products.location', 'like', $term)
              ->orWhereHas('category', function ($cq) use ($term) {
                  $cq->where('name', 'like', $term);
              })
              ->orWhereHas('variants', function ($vq) use ($term) {
                  $vq->where('sku', 'like', $term)
                     ->orWhere('barcode', 'like', $term)
                     ->orWhere('size', 'like', $term)
                     ->orWhere('grade_type', 'like', $term);
              });
        });
    }
}
