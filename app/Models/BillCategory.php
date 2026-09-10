<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;

class BillCategory extends Model
{
    protected $table = 'bill_categories';

    use BelongsToShop;

    protected $fillable = [
        'shop_id',
        'name',
        'default_description',
        'no_commission',
        'is_active',
    ];

    protected $casts = [
        'no_commission' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function billItems()
    {
        return $this->hasMany(BillItem::class, 'category_id');
    }
}
