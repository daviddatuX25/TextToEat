<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Session;

class DismissDailyGreetingController extends Controller
{
    public function __invoke(): RedirectResponse
    {
        Session::put('daily_greeting_dismissed_date', Carbon::today()->toDateString());

        return redirect()->route('portal.menu-items');
    }
}
