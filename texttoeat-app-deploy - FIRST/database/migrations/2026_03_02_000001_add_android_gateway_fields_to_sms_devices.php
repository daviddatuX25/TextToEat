<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sms_devices', function (Blueprint $table) {
            $table->string('device_id', 64)->nullable()->unique()->after('id');
            $table->string('brand')->nullable()->after('name');
            $table->string('model')->nullable()->after('brand');
            $table->string('os')->nullable()->after('model');
            $table->unsignedInteger('app_version_code')->nullable()->after('os');
            $table->json('sim_info')->nullable()->after('app_version_code');
            $table->boolean('enabled')->default(true)->after('sim_info');
            $table->timestamp('last_heartbeat_at')->nullable()->after('last_used_at');
            $table->json('last_heartbeat_payload')->nullable()->after('last_heartbeat_at');
        });
    }

    public function down(): void
    {
        Schema::table('sms_devices', function (Blueprint $table) {
            $table->dropColumn([
                'device_id',
                'brand',
                'model',
                'os',
                'app_version_code',
                'sim_info',
                'enabled',
                'last_heartbeat_at',
                'last_heartbeat_payload',
            ]);
        });
    }
};
