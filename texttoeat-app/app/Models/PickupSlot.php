<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PickupSlot extends Model
{
    use HasFactory;

    /** Max length for value (e.g. slot10). Enforced in seeders and request validation. */
    public const MAX_VALUE_LENGTH = 6;

    protected $fillable = ['value', 'sort_order'];
}
