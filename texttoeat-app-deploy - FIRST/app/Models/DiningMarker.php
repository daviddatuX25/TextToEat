<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DiningMarker extends Model
{
    use HasFactory;

    protected $fillable = ['value', 'sort_order'];
}
