"use client";

import type { Conversation } from "@/types";
import { formatDistanceToNow } from "@/utils/date";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          Nenhuma conversa ainda.<br />
          As mensagens do WhatsApp aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conversation) => {
        const isSelected = conversation.id === selectedId;
        const hasUnread = conversation.unread_count > 0;
        const name = conversation.lead?.name ?? `+${conversation.phone_number}`;

        return (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            className={`w-full text-left px-4 py-3 border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-2)] ${
              isSelected ? "bg-[var(--surface-2)] border-l-2 border-l-[var(--accent)]" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shrink-0 text-sm font-medium text-[var(--text-sec)]">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm truncate ${hasUnread ? "font-semibold text-[var(--text)]" : "text-[var(--text)]"}`}>
                    {name}
                  </p>
                  {conversation.lead?.company && (
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {conversation.lead.company}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {conversation.last_message_at && (
                  <span className="text-xs text-[var(--text-muted)]">
                    {formatDistanceToNow(conversation.last_message_at)}
                  </span>
                )}
                {hasUnread && (
                  <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-black text-xs font-bold flex items-center justify-center">
                    {conversation.unread_count > 9 ? "9+" : conversation.unread_count}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 mt-1 ml-11">
              {conversation.ai_active ? (
                <span className="text-xs text-[var(--accent)]">● IA ativa</span>
              ) : (
                <span className="text-xs text-[var(--text-muted)]">● Atendimento humano</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
