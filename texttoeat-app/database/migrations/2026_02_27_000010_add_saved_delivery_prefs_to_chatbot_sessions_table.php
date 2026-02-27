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
        Schema::table('chatbot_sessions', function (Blueprint $table) {
            $table->string('saved_delivery_type')->nullable()->after('saved_customer_name');
            $table->string('saved_delivery_place')->nullable()->after('saved_delivery_type');
            $table->decimal('saved_delivery_fee', 8, 2)->nullable()->after('saved_delivery_place');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('chatbot_sessions', function (Blueprint $table) {
            $table->dropColumn(['saved_delivery_type', 'saved_delivery_place', 'saved_delivery_fee']);
        });
    }
};

