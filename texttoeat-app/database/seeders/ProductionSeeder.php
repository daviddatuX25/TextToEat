<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ProductionSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed production-ready data: 1 admin, 2 staff, pickup slots,
     * dining markers (counts from config/seed.php), delivery areas,
     * categories, and today's menu.
     */
    public function run(): void
    {
        $this->seedUsers();
        $this->call(BootstrapAdminSeeder::class);
        $this->call(PortalSeedDataSeeder::class);
        $this->call(CategorySeeder::class);
        $this->call(FilipinoMealsSeeder::class);
    }

    private function seedUsers(): void
    {
        // Seeded accounts (password for all: Password1!)
        User::updateOrCreate(
            ['username' => 'admin'],
            ['name' => 'Admin', 'email' => 'admin@avelinalacasandile-eat.top', 'password' => Hash::make('Password1!'), 'role' => 'admin']
        );
        User::updateOrCreate(
            ['username' => 'staff'],
            ['name' => 'Staff', 'email' => 'staff@avelinalacasandile-eat.top', 'password' => Hash::make('Password1!'), 'role' => 'staff']
        );
        User::updateOrCreate(
            ['username' => 'staff2'],
            ['name' => 'Staff Two', 'email' => 'staff2@avelinalacasandile-eat.top', 'password' => Hash::make('Password1!'), 'role' => 'staff']
        );
    }
}
