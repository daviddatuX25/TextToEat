<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sms_gateway_settings', function (Blueprint $table) {
            $table->string('api_key', 128)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('sms_gateway_settings', function (Blueprint $table) {
            $table->string('api_key', 128)->nullable(false)->change();
        });
    }
};
