<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('menu_items')) {
            return;
        }

        // Dedupe any existing duplicates so we can add the unique index safely.
        // Keep the lowest id per (name, menu_date), delete the rest.
        $dupeKeys = DB::table('menu_items')
            ->select('name', 'menu_date')
            ->groupBy('name', 'menu_date')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($dupeKeys as $key) {
            $keepId = (int) DB::table('menu_items')
                ->where('name', $key->name)
                ->where('menu_date', $key->menu_date)
                ->min('id');

            if ($keepId === 0) {
                continue;
            }

            $duplicateIds = DB::table('menu_items')
                ->where('name', $key->name)
                ->where('menu_date', $key->menu_date)
                ->where('id', '!=', $keepId)
                ->pluck('id')
                ->all();

            if ($duplicateIds === []) {
                continue;
            }

            if (Schema::hasTable('order_items')) {
                DB::table('order_items')
                    ->whereIn('menu_item_id', $duplicateIds)
                    ->update(['menu_item_id' => $keepId]);
            }

            DB::table('menu_items')
                ->whereIn('id', $duplicateIds)
                ->delete();
        }

        Schema::table('menu_items', function (Blueprint $table) {
            $table->unique(['name', 'menu_date'], 'menu_items_name_menu_date_unique');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('menu_items')) {
            return;
        }

        Schema::table('menu_items', function (Blueprint $table) {
            $table->dropUnique('menu_items_name_menu_date_unique');
        });
    }
};
