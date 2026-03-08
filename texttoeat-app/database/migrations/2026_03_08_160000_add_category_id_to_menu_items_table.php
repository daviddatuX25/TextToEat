<?php

use App\Models\Category;
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
        Schema::table('menu_items', function (Blueprint $table) {
            $table->foreignId('category_id')->nullable()->after('price')->constrained('categories')->nullOnDelete();
        });

        $distinctCategories = DB::table('menu_items')->distinct()->pluck('category')->filter();

        foreach ($distinctCategories as $name) {
            $category = Category::firstOrCreate(
                ['name' => $name],
                ['sort_order' => null]
            );

            DB::table('menu_items')->where('category', $name)->update(['category_id' => $category->id]);
        }

        Schema::table('menu_items', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('menu_items', function (Blueprint $table) {
            $table->string('category')->nullable()->after('price');
        });

        $items = DB::table('menu_items')->join('categories', 'menu_items.category_id', '=', 'categories.id')
            ->select('menu_items.id', 'categories.name')
            ->get();

        foreach ($items as $row) {
            DB::table('menu_items')->where('id', $row->id)->update(['category' => $row->name]);
        }

        Schema::table('menu_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('category_id');
        });
    }
};
