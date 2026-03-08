<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menu_item_daily_stock', function (Blueprint $table) {
            $table->id();
            $table->foreignId('menu_item_id')->constrained()->cascadeOnDelete();
            $table->date('menu_date');
            $table->unsignedInteger('units_set')->default(0);
            $table->unsignedInteger('units_sold')->default(0);
            $table->unsignedInteger('units_leftover')->default(0);
            $table->timestamps();
            $table->unique(['menu_item_id', 'menu_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_item_daily_stock');
    }
};
