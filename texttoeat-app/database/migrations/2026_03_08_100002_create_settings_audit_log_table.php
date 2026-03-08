<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings_audit_log', function (Blueprint $table) {
            $table->id();
            $table->string('setting_key', 255);
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('changed_at');
            $table->string('action', 32)->default('updated'); // 'updated', 'created', etc.
            $table->index(['setting_key', 'changed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings_audit_log');
    }
};
