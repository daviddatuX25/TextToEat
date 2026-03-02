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
        // Seeded accounts (password for both: Password1!)
        User::updateOrCreate(
            ['username' => 'staff'],
            ['name' => 'Staff', 'email' => 'staff@avelinalacasandile-eat.top', 'password' => Hash::make('Password1!'), 'role' => 'staff']
        );

        User::updateOrCreate(
            ['username' => 'admin'],
            ['name' => 'Admin', 'email' => 'admin@avelinalacasandile-eat.top', 'password' => Hash::make('Password1!'), 'role' => 'admin']
        );

        $this->call(BootstrapAdminSeeder::class);
        $this->call(PortalSeedDataSeeder::class);
        $this->call(FilipinoMealsSeeder::class);
    }
}
