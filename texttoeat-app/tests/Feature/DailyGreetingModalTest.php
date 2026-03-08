<?php

namespace Tests\Feature;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class DailyGreetingModalTest extends TestCase
{
    use RefreshDatabase;

    public function test_show_daily_greeting_when_reset_ran_today_and_not_dismissed(): void
    {
        $user = User::factory()->create();
        Cache::put('menu_reset_date', Carbon::today()->toDateString(), now()->endOfDay());

        $response = $this->actingAs($user)->get('/portal');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page->where('show_daily_greeting', true));
    }

    public function test_hide_daily_greeting_when_dismissed(): void
    {
        $user = User::factory()->create();
        Cache::put('menu_reset_date', Carbon::today()->toDateString(), now()->endOfDay());

        $this->actingAs($user)->post('/portal/dismiss-daily-greeting')
            ->assertRedirect(route('portal.menu-items'));

        $response = $this->actingAs($user)->get('/portal');
        $response->assertInertia(fn ($page) => $page->where('show_daily_greeting', false));
    }

    public function test_dismiss_redirects_to_menu(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/portal/dismiss-daily-greeting')
            ->assertRedirect(route('portal.menu-items'));
    }

    public function test_dismiss_requires_auth(): void
    {
        $this->post('/portal/dismiss-daily-greeting')
            ->assertRedirect(route('login'));
    }
}
