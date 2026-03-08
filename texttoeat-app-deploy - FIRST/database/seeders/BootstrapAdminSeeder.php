<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class BootstrapAdminSeeder extends Seeder
{
    /**
     * Set the first user as admin if no admin exists.
     */
    public function run(): void
    {
        if (User::where('role', 'admin')->exists()) {
            return;
        }
        $first = User::orderBy('id')->first();
        if ($first) {
            $first->update(['role' => 'admin']);
        }
    }
}
