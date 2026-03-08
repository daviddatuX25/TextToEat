<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MenuItemDailyStock extends Model
{
    protected $table = 'menu_item_daily_stock';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'menu_item_id',
        'menu_date',
        'units_set',
        'units_sold',
        'units_leftover',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'menu_date' => 'date',
            'units_set' => 'integer',
            'units_sold' => 'integer',
            'units_leftover' => 'integer',
        ];
    }

    public function menuItem(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class);
    }
}
