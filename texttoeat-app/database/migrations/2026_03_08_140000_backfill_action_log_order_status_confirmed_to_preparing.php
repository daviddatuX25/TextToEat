<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Backfill action_log payloads: replace from_status/to_status 'confirmed' with 'preparing'
     * so Track timeline and any consumers of historical logs show the new status label.
     */
    public function up(): void
    {
        $logs = DB::table('action_log')
            ->where('model', 'Order')
            ->where('action', 'order_updated')
            ->get(['id', 'payload']);

        foreach ($logs as $log) {
            $payload = $log->payload;
            if (! \is_string($payload)) {
                $payload = json_encode($payload ?? [], JSON_THROW_ON_ERROR);
            }
            $decoded = json_decode($payload, true, 512, JSON_THROW_ON_ERROR);
            if (! \is_array($decoded)) {
                continue;
            }
            $changed = false;
            if (isset($decoded['from_status']) && $decoded['from_status'] === 'confirmed') {
                $decoded['from_status'] = 'preparing';
                $changed = true;
            }
            if (isset($decoded['to_status']) && $decoded['to_status'] === 'confirmed') {
                $decoded['to_status'] = 'preparing';
                $changed = true;
            }
            if ($changed) {
                DB::table('action_log')
                    ->where('id', $log->id)
                    ->update(['payload' => json_encode($decoded)]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $logs = DB::table('action_log')
            ->where('model', 'Order')
            ->where('action', 'order_updated')
            ->get(['id', 'payload']);

        foreach ($logs as $log) {
            $payload = $log->payload;
            if (! \is_string($payload)) {
                $payload = json_encode($payload ?? [], JSON_THROW_ON_ERROR);
            }
            $decoded = json_decode($payload, true, 512, JSON_THROW_ON_ERROR);
            if (! \is_array($decoded)) {
                continue;
            }
            $changed = false;
            if (isset($decoded['from_status']) && $decoded['from_status'] === 'preparing') {
                $decoded['from_status'] = 'confirmed';
                $changed = true;
            }
            if (isset($decoded['to_status']) && $decoded['to_status'] === 'preparing') {
                $decoded['to_status'] = 'confirmed';
                $changed = true;
            }
            if ($changed) {
                DB::table('action_log')
                    ->where('id', $log->id)
                    ->update(['payload' => json_encode($decoded)]);
            }
        }
    }
};
