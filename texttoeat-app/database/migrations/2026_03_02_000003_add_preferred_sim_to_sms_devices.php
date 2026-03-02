<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sms_devices', function (Blueprint $table) {
            $table->integer('preferred_sim_subscription_id')->nullable()->after('sim_info');
        });
    }

    public function down(): void
    {
        Schema::table('sms_devices', function (Blueprint $table) {
            $table->dropColumn('preferred_sim_subscription_id');
        });
    }
};
