<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sms_gateway_settings', function (Blueprint $table) {
            $table->id();
            $table->string('api_key', 128)->nullable();
            $table->timestamps();
        });

        DB::table('sms_gateway_settings')->insert([
            'api_key' => Str::random(64),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_gateway_settings');
    }
};
