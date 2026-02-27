<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatbotSession extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'channel',
        'external_id',
        'language',
        'saved_customer_name',
        'saved_delivery_type',
        'saved_delivery_place',
        'saved_delivery_fee',
        'state',
        'last_activity_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'state' => 'array',
            'last_activity_at' => 'datetime',
            'saved_delivery_fee' => 'float',
        ];
    }

    public function scopeRecent(Builder $query): Builder
    {
        return $query
            ->orderByDesc('last_activity_at')
            ->orderByDesc('created_at');
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function scopeFilterForLogs(Builder $query, array $filters): Builder
    {
        $dateFrom = $filters['date_from'] ?? null;
        $dateTo = $filters['date_to'] ?? null;
        $customer = $filters['customer'] ?? null;
        $statuses = $filters['status'] ?? null;
        $channels = $filters['channel'] ?? null;
        $hasHumanTakeover = $filters['has_human_takeover'] ?? null;

        return $query
            ->when($dateFrom, function (Builder $query, string $dateFrom): void {
                $query->where(function (Builder $query) use ($dateFrom): void {
                    $query->whereNotNull('last_activity_at')
                        ->whereDate('last_activity_at', '>=', $dateFrom)
                        ->orWhere(function (Builder $query) use ($dateFrom): void {
                            $query->whereNull('last_activity_at')
                                ->whereDate('created_at', '>=', $dateFrom);
                        });
                });
            })
            ->when($dateTo, function (Builder $query, string $dateTo): void {
                $query->where(function (Builder $query) use ($dateTo): void {
                    $query->whereNotNull('last_activity_at')
                        ->whereDate('last_activity_at', '<=', $dateTo)
                        ->orWhere(function (Builder $query) use ($dateTo): void {
                            $query->whereNull('last_activity_at')
                                ->whereDate('created_at', '<=', $dateTo);
                        });
                });
            })
            ->when($channels && \is_array($channels), function (Builder $query) use ($channels): void {
                $query->whereIn('channel', $channels);
            })
            ->when($customer, function (Builder $query, string $customer): void {
                $like = '%' . $customer . '%';

                $query->where(function (Builder $query) use ($like): void {
                    $query->where('saved_customer_name', 'like', $like)
                        ->orWhere('state->customer_name', 'like', $like);
                });
            })
            ->when($statuses && \is_array($statuses), function (Builder $query) use ($statuses): void {
                $query->whereIn('state->current_state', $statuses);
            })
            ->when($hasHumanTakeover, function (Builder $query): void {
                $query->where(function (Builder $query): void {
                    $query->where('state->current_state', 'human_takeover')
                        ->orWhereHas('conversations', function (Builder $query): void {
                            $query->where('status', 'human_takeover');
                        });
                });
            });
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }
}
