<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SaleItem extends Model
{
    protected $fillable = [
        'sale_id',
        'product_id',
        'product_name',
        'product_sku',
        'unit_price',
        'quantity',
        'discount_pct',
        'line_discount_amount',
        'line_total',
    ];

    protected $appends = ['returned_quantity'];

    public function getReturnedQuantityAttribute()
    {
        $saleNumber = $this->sale->sale_number ?? '';
        if (str_starts_with($saleNumber, 'SALE-')) {
            $billNumber = substr($saleNumber, 5);
            $billId = \App\Models\Bill::where('bill_number', $billNumber)->value('id');
            if ($billId) {
                $query = \Illuminate\Support\Facades\DB::table('product_return_items')
                    ->join('product_returns', 'product_return_items.product_return_id', '=', 'product_returns.id')
                    ->where('product_returns.sale_id', $billId)
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
        }
        return 0;
    }

    protected $casts = [
        'unit_price' => 'decimal:2',
        'discount_pct' => 'decimal:2',
        'line_discount_amount' => 'decimal:2',
        'line_total' => 'decimal:2',
    ];

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }
}
