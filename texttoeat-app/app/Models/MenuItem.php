<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MenuItem extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'price',
        'category_id',
        'image_url',
        'units_today',
        'is_sold_out',
        'menu_date',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'units_today' => 'integer',
            'is_sold_out' => 'boolean',
            'menu_date' => 'date',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * Scope: today's menu (menu_date = today), exclude sold-out, ordered by id.
     *
     * @param  \Illuminate\Database\Eloquent\Builder<MenuItem>  $query
     * @return \Illuminate\Database\Eloquent\Builder<MenuItem>
     */
    public function scopeForToday($query)
    {
        return $query
            ->whereDate('menu_date', today())
            ->where('is_sold_out', false)
            ->orderBy('id');
    }
}
