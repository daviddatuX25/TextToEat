<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sms_inbound_webhook_events', function (Blueprint $table): void {
            $table->id();
            $table->string('outcome', 48);
            $table->string('from_phone', 32)->index();
            $table->string('gateway_message_id', 512)->nullable()->index();
            $table->text('message_body');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_inbound_webhook_events');
    }
};
