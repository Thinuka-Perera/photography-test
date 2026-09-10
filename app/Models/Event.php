<?php

namespace App\Models;

use App\Models\Concerns\BelongsToShop;
use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    use BelongsToShop;

    protected $fillable = [
        'shop_id',
        'title',
        'event_type',
        'client_name',
        'client_phone',
        'event_date',
        'location',
        'wedding_location',
        'saloon_location',
        'photo_shoot_location',
        'status',
        'expected_guests',
        'total_amount',
        'notes',
        'custom_sections',
        'photography_packages',
        'videography_packages',
    ];

    protected $casts = [
        'event_date' => 'date',
        'expected_guests' => 'integer',
        'total_amount' => 'decimal:2',
        'custom_sections' => 'array',
        'photography_packages' => 'array',
        'videography_packages' => 'array',
    ];

    public function payments()
    {
        return $this->hasMany(EventPayment::class);
    }
}
