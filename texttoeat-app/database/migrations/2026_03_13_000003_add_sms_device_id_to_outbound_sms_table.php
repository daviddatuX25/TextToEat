<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('outbound_sms', function (Blueprint $table): void {
            $table->foreignId('sms_device_id')
                ->nullable()
                ->after('chatbot_session_id')
                ->constrained('sms_devices')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('outbound_sms', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('sms_device_id');
        });
    }
};

