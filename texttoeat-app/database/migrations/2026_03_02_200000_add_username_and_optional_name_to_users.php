<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 191)->nullable()->unique();
        });

        $users = DB::table('users')->get();
        $used = [];
        foreach ($users as $user) {
            $base = $user->email
                ? preg_replace('/[^a-zA-Z0-9_-]/', '_', Str::before($user->email, '@'))
                : '';
            $base = $base !== '' ? $base : 'user';
            $username = $base;
            $suffix = 0;
            while (isset($used[$username])) {
                $suffix++;
                $username = $base . '_' . $suffix;
            }
            $used[$username] = true;
            DB::table('users')->where('id', $user->id)->update(['username' => $username]);
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 191)->nullable(false)->change();
            $table->string('name')->nullable()->change();
            $table->string('email')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('name')->nullable(false)->change();
            $table->string('email')->nullable(false)->change();
            $table->dropColumn('username');
        });
    }
};
