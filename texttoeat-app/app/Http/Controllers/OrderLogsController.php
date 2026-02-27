<?php

namespace App\Http\Controllers;

use App\Models\ActionLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderLogsController extends Controller
{
    public function index(Request $request): Response
    {
        $logs = ActionLog::query()
            ->with('user:id,name')
            ->where('model', 'Order')
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map(function (ActionLog $log) {
                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'model_id' => $log->model_id,
                    'payload' => $log->payload,
                    'user_name' => $log->user?->name,
                    'created_at' => $log->created_at?->toIso8601String(),
                ];
            });

        return Inertia::render('OrderLogs', [
            'logs' => $logs,
        ]);
    }
}
