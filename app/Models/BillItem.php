<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillItem extends Model
{
    protected $table = 'bill_items';

    protected $fillable = [
        'bill_id',
        'category_id',
        'pos_tab_id',
        'is_stock_item',
        'stock_item_id',
        'description',
        'quantity',
        'unit_price',
        'cost',
        'line_total',
        'discount_type',
        'discount_value',
        'discount_amount',
    ];

    protected $appends = ['returned_quantity', 'category_name'];

    public function getCategoryNameAttribute()
    {
        if ($this->category?->name) {
            return $this->category->name;
        }

        return $this->stockItem?->variant?->product?->category?->name;
    }

    public function getReturnedQuantityAttribute()
    {
        $variantId = $this->stockItem->variant_id ?? null;
        if (!$variantId) return 0;

        return (int) \Illuminate\Support\Facades\DB::table('product_return_items')
            ->join('product_returns', 'product_return_items.product_return_id', '=', 'product_returns.id')
            ->where('product_returns.sale_id', $this->bill_id)
            ->where('product_returns.status', 'completed')
            ->where('product_return_items.product_id', $variantId)
            ->sum('quantity');
    }

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'cost' => 'decimal:2',
        'line_total' => 'decimal:2',
        'discount_value' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'is_stock_item' => 'boolean',
    ];

    // ── Relationships ──────────────────────────────────────────────

    public function bill()
    {
        return $this->belongsTo(Bill::class);
    }

    public function category()
    {
        return $this->belongsTo(BillCategory::class, 'category_id');
    }

    public function stockItem()
    {
        return $this->belongsTo(Inventory::class, 'stock_item_id');
    }
}
