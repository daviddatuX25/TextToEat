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
        Schema::table('action_log', function (Blueprint $table): void {
            $table->index(['model', 'created_at'], 'action_log_model_created_at_index');
            $table->index(['model', 'model_id'], 'action_log_model_model_id_index');
            $table->index('user_id', 'action_log_user_id_index');
        });

        Schema::table('orders', function (Blueprint $table): void {
            $table->index('status', 'orders_status_index');
            $table->index('channel', 'orders_channel_index');
            $table->index('reference', 'orders_reference_index');
            $table->index('customer_name', 'orders_customer_name_index');
            $table->index('customer_phone', 'orders_customer_phone_index');
        });

        Schema::table('chatbot_sessions', function (Blueprint $table): void {
            $table->index('last_activity_at', 'chatbot_sessions_last_activity_at_index');
            $table->index('channel', 'chatbot_sessions_channel_index');
            $table->index('saved_customer_name', 'chatbot_sessions_saved_customer_name_index');
        });

        Schema::table('conversations', function (Blueprint $table): void {
            $table->index('chatbot_session_id', 'conversations_chatbot_session_id_index');
            $table->index('status', 'conversations_status_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('action_log', function (Blueprint $table): void {
            $table->dropIndex('action_log_model_created_at_index');
            $table->dropIndex('action_log_model_model_id_index');
            $table->dropIndex('action_log_user_id_index');
        });

        Schema::table('orders', function (Blueprint $table): void {
            $table->dropIndex('orders_status_index');
            $table->dropIndex('orders_channel_index');
            $table->dropIndex('orders_reference_index');
            $table->dropIndex('orders_customer_name_index');
            $table->dropIndex('orders_customer_phone_index');
        });

        Schema::table('chatbot_sessions', function (Blueprint $table): void {
            $table->dropIndex('chatbot_sessions_last_activity_at_index');
            $table->dropIndex('chatbot_sessions_channel_index');
            $table->dropIndex('chatbot_sessions_saved_customer_name_index');
        });

        Schema::table('conversations', function (Blueprint $table): void {
            $table->dropIndex('conversations_chatbot_session_id_index');
            $table->dropIndex('conversations_status_index');
        });
    }
};

