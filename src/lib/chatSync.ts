import { supabase } from './supabase';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string | Date;
  modelId?: string;
  creditUsed?: number | boolean;
  createdAt?: Date;
  attachments?: any[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  isStarred?: boolean;
}

export class ChatSyncService {
  private static syncInProgress = false;
  private static syncQueue: Array<() => Promise<void>> = [];

  static async saveChatSession(
    sessionId: string,
    title: string,
    messages: ChatMessage[],
    isStarred: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        return { success: false, error: '로그인이 필요합니다.' };
      }

      const response = await fetch('/api/chat-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          sessionId,
          title,
          messages,
          isStarred
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || '저장 실패' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Chat sync error:', error);
      return { success: false, error: error.message };
    }
  }

  static async loadChatSessions(): Promise<{ success: boolean; sessions?: ChatSession[]; error?: string }> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        return { success: false, error: '로그인이 필요합니다.' };
      }

      const response = await fetch('/api/chat-sessions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || '불러오기 실패' };
      }

      const data = await response.json();
      
      const sessions: ChatSession[] = data.sessions.map((s: any) => ({
        id: s.session_id,
        title: s.title,
        messages: s.messages,
        createdAt: new Date(s.created_at),
        updatedAt: new Date(s.updated_at),
        isStarred: s.is_starred
      }));

      return { success: true, sessions };
    } catch (error: any) {
      console.error('Chat load error:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteChatSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        return { success: false, error: '로그인이 필요합니다.' };
      }

      const response = await fetch('/api/chat-sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || '삭제 실패' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Chat delete error:', error);
      return { success: false, error: error.message };
    }
  }

  static async syncChatSession(
    sessionId: string,
    title: string,
    messages: ChatMessage[],
    isStarred: boolean = false
  ): Promise<void> {
    const syncTask = async () => {
      await this.saveChatSession(sessionId, title, messages, isStarred);
    };

    this.syncQueue.push(syncTask);

    if (!this.syncInProgress) {
      this.processSyncQueue();
    }
  }

  private static async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;

    while (this.syncQueue.length > 0) {
      const task = this.syncQueue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error('Sync queue error:', error);
        }
      }
    }

    this.syncInProgress = false;
  }

  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => {
        func(...args);
      }, wait);
    };
  }
}

export const debouncedSyncChatSession = ChatSyncService.debounce(
  (sessionId: string, title: string, messages: ChatMessage[], isStarred: boolean = false) => {
    ChatSyncService.syncChatSession(sessionId, title, messages, isStarred);
  },
  2000
);
