<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->string('category_name')->nullable()->after('name');
        });

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('
                UPDATE order_items
                INNER JOIN menu_items ON order_items.menu_item_id = menu_items.id
                INNER JOIN categories ON menu_items.category_id = categories.id
                SET order_items.category_name = categories.name
            ');
        } elseif ($driver === 'pgsql') {
            DB::statement('
                UPDATE order_items
                SET category_name = categories.name
                FROM menu_items
                JOIN categories ON menu_items.category_id = categories.id
                WHERE order_items.menu_item_id = menu_items.id
            ');
        } else {
            $rows = DB::table('order_items')
                ->join('menu_items', 'order_items.menu_item_id', '=', 'menu_items.id')
                ->join('categories', 'menu_items.category_id', '=', 'categories.id')
                ->whereNotNull('order_items.menu_item_id')
                ->select('order_items.id', 'categories.name as category_name')
                ->get();
            foreach ($rows as $row) {
                DB::table('order_items')->where('id', $row->id)->update(['category_name' => $row->category_name]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('category_name');
        });
    }
};
