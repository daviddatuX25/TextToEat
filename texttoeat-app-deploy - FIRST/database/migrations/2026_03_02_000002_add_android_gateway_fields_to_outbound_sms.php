<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('outbound_sms', function (Blueprint $table) {
            $table->string('sms_batch_id', 64)->nullable()->after('chatbot_session_id');
            $table->string('error_code')->nullable()->after('failure_reason');
            $table->text('error_message')->nullable()->after('error_code');
            $table->timestamp('delivered_at')->nullable()->after('sent_at');
        });
    }

    public function down(): void
    {
        Schema::table('outbound_sms', function (Blueprint $table) {
            $table->dropColumn(['sms_batch_id', 'error_code', 'error_message', 'delivered_at']);
        });
    }
};
