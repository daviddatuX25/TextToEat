import { usePortalConversationsEcho } from './usePortalConversationsEcho';
import { usePortalRefresh } from './usePortalRefresh';

/**
 * Realtime conversations: Echo when available (Pusher/Reverb), else polling fallback (30s).
 * Use on ConversationInbox, ConversationInboxShow.
 */
export function usePortalConversationsLive() {
    usePortalConversationsEcho();
    const usePolling = typeof window !== 'undefined' && !window.Echo;
    usePortalRefresh(usePolling, 30000);
}
