<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('portal.orders', function ($user) {
    return $user !== null;
});

Broadcast::channel('portal.conversations', function ($user) {
    return $user !== null;
});
