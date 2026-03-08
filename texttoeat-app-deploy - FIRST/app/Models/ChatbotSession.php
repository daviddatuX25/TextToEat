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
     * Restrict to sessions relevant to human takeover (inbox only).
     */
    public function scopeForInbox(Builder $query): Builder
    {
        return $query
            ->whereIn('channel', ['sms', 'messenger'])
            ->where(function (Builder $q): void {
                $q->where('state->current_state', 'human_takeover')
                    ->orWhere('state->automation_disabled', true)
                    ->orWhereHas('conversations', function (Builder $q): void {
                        $q->where('status', 'human_takeover');
                    });
            });
    }

    /**
     * Filter by session state for inbox: active, pending, ended.
     * Uses Laravel JSON where (driver-agnostic for MySQL/PostgreSQL).
     * - pending: human_takeover, automation on, no messages in thread yet.
     * - active: (human_takeover or automation_disabled) and at least one message in thread.
     * - ended: back to bot.
     *
     * @param  array<int, string>  $statuses  One or more of: active, pending, ended
     */
    public function scopeSessionState(Builder $query, array $statuses): Builder
    {
        $statuses = array_values(array_intersect($statuses, ['active', 'pending', 'ended']));
        if ($statuses === []) {
            return $query;
        }

        return $query->where(function (Builder $q) use ($statuses): void {
            foreach ($statuses as $state) {
                if ($state === 'pending') {
                    $q->orWhere(function (Builder $q): void {
                        $q->where('state->current_state', 'human_takeover')
                            ->where(function (Builder $q): void {
                                $q->whereNull('state->automation_disabled')
                                    ->orWhere('state->automation_disabled', false);
                            })
                            ->whereDoesntHave('inboundMessages')
                            ->whereDoesntHave('outboundSms')
                            ->whereNotExists(function ($sub): void {
                                $sub->selectRaw('1')
                                    ->from('outbound_messenger')
                                    ->whereColumn('outbound_messenger.to', 'chatbot_sessions.external_id');
                            });
                    });
                } elseif ($state === 'active') {
                    $q->orWhere(function (Builder $q): void {
                        $q->where(function (Builder $q): void {
                            $q->where('state->current_state', 'human_takeover')
                                ->orWhere('state->automation_disabled', true);
                        })
                            ->where(function (Builder $q): void {
                                $q->whereHas('inboundMessages')
                                    ->orWhereHas('outboundSms')
                                    ->orWhereExists(function ($sub): void {
                                        $sub->selectRaw('1')
                                            ->from('outbound_messenger')
                                            ->whereColumn('outbound_messenger.to', 'chatbot_sessions.external_id');
                                    });
                            });
                    });
                } else {
                    $q->orWhere(function (Builder $q): void {
                        $q->where(function (Builder $q): void {
                            $q->where('state->current_state', '!=', 'human_takeover')
                                ->orWhereNull('state->current_state');
                        })
                            ->where(function (Builder $q): void {
                                $q->whereNull('state->automation_disabled')
                                    ->orWhere('state->automation_disabled', false);
                            });
                    });
                }
            }
        });
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

    public function inboundMessages(): HasMany
    {
        return $this->hasMany(InboundMessage::class);
    }

    public function outboundSms(): HasMany
    {
        return $this->hasMany(OutboundSms::class);
    }
}
