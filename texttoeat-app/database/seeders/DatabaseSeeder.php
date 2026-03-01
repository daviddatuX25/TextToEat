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
            ['email' => 'staff@avelinalacasandile-eat.top'],
            ['name' => 'Staff', 'password' => Hash::make('Password1!'), 'role' => 'staff']
        );

        User::updateOrCreate(
            ['email' => 'admin@avelinalacasandile-eat.top'],
            ['name' => 'Admin', 'password' => Hash::make('Password1!'), 'role' => 'admin']
        );

        $this->call(BootstrapAdminSeeder::class);
        $this->call(PortalSeedDataSeeder::class);
        $this->call(FilipinoMealsSeeder::class);
    }
}
