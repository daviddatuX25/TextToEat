<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class ActionLog extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'action_log';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'action',
        'model',
        'model_id',
        'payload',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'model_id' => 'integer',
            'payload' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'model_id');
    }

    /**
     * @param  Builder<ActionLog>  $query
     * @return Builder<ActionLog>
     */
    public function scopeForTakeover(Builder $query): Builder
    {
        return $query
            ->where('model', 'ChatbotSession')
            ->whereIn('action', ['takeover_resolved', 'takeover_automation_disabled', 'takeover_automation_enabled']);
    }

    /**
     * @param  Builder<ActionLog>  $query
     * @return Builder<ActionLog>
     */
    public function scopeForOrders(Builder $query): Builder
    {
        return $query->where('model', 'Order');
    }

    /**
     * @param  Builder<ActionLog>  $query
     * @param  array<string, mixed>  $filters
     * @return Builder<ActionLog>
     */
    public function scopeFilterForLogs(Builder $query, array $filters): Builder
    {
        $dateFrom = $filters['date_from'] ?? null;
        $dateTo = $filters['date_to'] ?? null;
        $customer = $filters['customer'] ?? null;
        $orderReference = $filters['order_reference'] ?? null;
        $statuses = $filters['status'] ?? null;
        $channels = $filters['channel'] ?? null;
        $staffId = $filters['staff_id'] ?? null;

        return $query
            ->when($dateFrom, function (Builder $q, string $from): void {
                $q->whereDate('created_at', '>=', $from);
            })
            ->when($dateTo, function (Builder $q, string $to): void {
                $q->whereDate('created_at', '<=', $to);
            })
            ->when($staffId, function (Builder $q, int $id): void {
                $q->where('user_id', $id);
            })
            ->when($customer, function (Builder $q, string $value): void {
                $q->whereHas('order', function (Builder $orderQuery) use ($value): void {
                    $orderQuery->where(function (Builder $subQuery) use ($value): void {
                        $like = '%' . $value . '%';
                        $subQuery
                            ->where('customer_name', 'ilike', $like)
                            ->orWhere('customer_phone', 'ilike', $like);
                    });
                });
            })
            ->when($orderReference, function (Builder $q, string $reference): void {
                $q->whereHas('order', function (Builder $orderQuery) use ($reference): void {
                    $orderQuery->where('reference', 'ilike', '%' . $reference . '%');
                });
            })
            ->when(is_array($statuses) && $statuses !== [], function (Builder $q) use ($statuses): void {
                $q->whereHas('order', function (Builder $orderQuery) use ($statuses): void {
                    $orderQuery->whereIn('status', $statuses);
                });
            })
            ->when(is_array($channels) && $channels !== [], function (Builder $q) use ($channels): void {
                $q->whereHas('order', function (Builder $orderQuery) use ($channels): void {
                    $orderQuery->whereIn('channel', $channels);
                });
            });
    }
}
