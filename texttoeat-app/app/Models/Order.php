<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'reference',
        'channel',
        'status',
        'payment_status',
        'customer_name',
        'customer_phone',
        'total',
        'delivery_type',
        'delivery_place',
        'delivery_fee',
        'pickup_slot',
        'order_marker',
        'external_id',
    ];

    /**
     * @return HasMany<OrderItem>
     */
    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class, 'order_id');
    }

    /**
     * Alias for orderItems (frontend may expect order_items).
     */
    public function order_items(): HasMany
    {
        return $this->orderItems();
    }
}
