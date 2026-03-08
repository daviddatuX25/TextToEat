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
        Schema::create('inbound_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chatbot_session_id')->constrained('chatbot_sessions')->cascadeOnDelete();
            $table->text('body');
            $table->string('channel')->nullable();
            $table->timestamps();

            $table->index(['chatbot_session_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inbound_messages');
    }
};
