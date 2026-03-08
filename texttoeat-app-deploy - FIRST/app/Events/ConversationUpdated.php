<?php

namespace App\Events;

use App\Models\ChatbotSession;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ConversationUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public ChatbotSession $session,
        public string $event = 'updated'
    ) {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('portal.conversations')];
    }

    public function broadcastAs(): string
    {
        return 'conversation.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'session_id' => $this->session->id,
            'channel' => $this->session->channel,
            'event' => $this->event,
        ];
    }
}
