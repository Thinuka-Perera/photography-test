<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InvoiceItem extends Model
{
    protected $fillable = [
        'invoice_id',
        'description',
        'product_id',
        'product_sku',
        'quantity',
        'unit_price',
        'discount_pct',
        'line_total',
    ];

    protected $appends = ['returned_quantity'];

    public function getReturnedQuantityAttribute()
    {
        $query = \Illuminate\Support\Facades\DB::table('product_return_items')
            ->join('product_returns', 'product_return_items.product_return_id', '=', 'product_returns.id')
            ->where('product_returns.invoice_id', $this->invoice_id)
            ->where('product_returns.status', 'completed');

        if ($this->product_id) {
            $query->where('product_return_items.product_id', $this->product_id);
        } elseif ($this->product_sku) {
            $query->where('product_return_items.product_sku', $this->product_sku);
        } else {
            return 0;
        }

        return (int) $query->sum('quantity');
    }

    protected $casts = [
        'unit_price'   => 'decimal:2',
        'discount_pct' => 'decimal:2',
        'line_total'   => 'decimal:2',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_id');
    }
}