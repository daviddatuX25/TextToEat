<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inbound_messages', function (Blueprint $table): void {
            $table->foreignId('conversation_id')
                ->nullable()
                ->after('chatbot_session_id')
                ->constrained('conversations')
                ->nullOnDelete();
        });

        Schema::table('outbound_sms', function (Blueprint $table): void {
            $table->foreignId('conversation_id')
                ->nullable()
                ->after('chatbot_session_id')
                ->constrained('conversations')
                ->nullOnDelete();
        });

        Schema::table('outbound_messenger', function (Blueprint $table): void {
            $table->foreignId('conversation_id')
                ->nullable()
                ->after('id')
                ->constrained('conversations')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('inbound_messages', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('conversation_id');
        });
        Schema::table('outbound_sms', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('conversation_id');
        });
        Schema::table('outbound_messenger', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('conversation_id');
        });
    }
};
