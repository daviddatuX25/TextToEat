<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('delivery_type')->default('pickup')->after('total');
            $table->string('delivery_place')->nullable()->after('delivery_type');
            $table->decimal('delivery_fee', 10, 2)->nullable()->after('delivery_place');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['delivery_type', 'delivery_place', 'delivery_fee']);
        });
    }
};
