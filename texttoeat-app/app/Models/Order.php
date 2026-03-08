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
     * Ensure pickup_slot does not exceed max length (e.g. slot10 = 6 chars).
     */
    public function setPickupSlotAttribute(?string $value): void
    {
        $this->attributes['pickup_slot'] = $value !== null && $value !== ''
            ? mb_substr($value, 0, PickupSlot::MAX_VALUE_LENGTH)
            : null;
    }

    /**
     * Ensure order_marker does not exceed max length (e.g. dine10 = 6 chars).
     */
    public function setOrderMarkerAttribute(?string $value): void
    {
        $this->attributes['order_marker'] = $value !== null && $value !== ''
            ? mb_substr($value, 0, DiningMarker::MAX_VALUE_LENGTH)
            : null;
    }

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

    /**
     * ActionLog entries for status changes (order_updated) on this order.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<ActionLog>
     */
    public function statusChangeLogs(): HasMany
    {
        return $this->hasMany(ActionLog::class, 'model_id')
            ->where('model', 'Order')
            ->where('action', 'order_updated');
    }
}
