<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    public function menuItems(): HasMany
    {
        return $this->hasMany(MenuItem::class, 'category_id');
    }

    /**
     * Scope: only non-trashed (for dropdowns and active listing).
     *
     * @param  \Illuminate\Database\Eloquent\Builder<Category>  $query
     * @return \Illuminate\Database\Eloquent\Builder<Category>
     */
    public function scopeActive($query)
    {
        return $query->whereNull('deleted_at');
    }
}
