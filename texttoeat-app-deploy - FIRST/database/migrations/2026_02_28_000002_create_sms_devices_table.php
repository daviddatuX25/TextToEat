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
        Schema::create('sms_devices', function (Blueprint $table) {
            $table->id();
            $table->text('device_token');
            $table->string('name')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->unique('device_token');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sms_devices');
    }
};
