<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UsersRoleHierarchyTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_a_staff_user(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $response = $this->actingAs($admin)->post('/portal/users', [
            'username' => 'newstaff',
            'name' => 'New Staff',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
            'role' => 'staff',
        ]);
        $response->assertRedirect();
        $this->assertDatabaseHas('users', ['username' => 'newstaff', 'role' => 'staff']);
    }

    public function test_admin_can_create_a_co_admin_user(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $response = $this->actingAs($admin)->post('/portal/users', [
            'username' => 'newadmin',
            'name' => 'New Admin',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
            'role' => 'admin',
        ]);
        $response->assertRedirect();
        $this->assertDatabaseHas('users', ['username' => 'newadmin', 'role' => 'admin']);
    }

    public function test_admin_cannot_create_a_superadmin_user(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin)->post('/portal/users', [
            'username' => 'badsuperadmin',
            'name' => 'Bad Superadmin',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
            'role' => 'superadmin',
        ]);
        $this->assertDatabaseMissing('users', ['username' => 'badsuperadmin']);
    }

    public function test_staff_cannot_access_the_users_page(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);
        $this->actingAs($staff)->get('/portal/users')->assertForbidden();
    }
}
