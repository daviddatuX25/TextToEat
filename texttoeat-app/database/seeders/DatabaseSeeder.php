<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seeded accounts for testing (password for both: password)
        User::updateOrCreate(
            ['email' => 'test@example.com'],
            ['name' => 'Test User', 'password' => Hash::make('password'), 'role' => 'staff']
        );

        User::updateOrCreate(
            ['email' => 'staff@texttoeat.test'],
            ['name' => 'Lacasandile Staff', 'password' => Hash::make('password'), 'role' => 'staff']
        );

        $this->call(BootstrapAdminSeeder::class);
        $this->call(PortalSeedDataSeeder::class);
        $this->call(FilipinoMealsSeeder::class);
    }
}
