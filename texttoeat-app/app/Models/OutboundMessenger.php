<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OutboundMessenger extends Model
{
    protected $table = 'outbound_messenger';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'to',
        'body',
    ];
}
