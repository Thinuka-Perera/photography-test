<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;

class EventPayment extends Model
{
    use BelongsToShop;

    protected $fillable = [
        'shop_id',
        'event_id',
        'amount',
        'payment_method',
        'reference_no',
        'notes',
        'paid_on',
        'recorded_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_on' => 'date',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }
}
