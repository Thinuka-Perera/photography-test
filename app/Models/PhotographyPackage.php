<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;

class PhotographyPackage extends Model
{
    use BelongsToShop;

    protected $fillable = [
        'shop_id',
        'name',
        'category',
        'event_type',
        'services',
        'deliverables',
        'total_price',
        'notes',
        'status',
        'products',
    ];

    protected $casts = [
        'services' => 'array',
        'deliverables' => 'array',
        'total_price' => 'decimal:2',
        'products' => 'array',
    ];
}
