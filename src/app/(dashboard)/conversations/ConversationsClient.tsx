"use client";

import { useState } from "react";
import type { Conversation } from "@/types";
import { ConversationList } from "@/components/features/conversations/ConversationList";
import { ChatWindow } from "@/components/features/conversations/ChatWindow";

interface ConversationsClientProps {
  initialConversations: Conversation[];
}

export function ConversationsClient({ initialConversations }: ConversationsClientProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversations[0]?.id ?? null
  );

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  function handleConversationUpdate(updated: Conversation) {
    setConversations((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Lista de conversas */}
      <div className="w-80 shrink-0 border-r border-[var(--border)] flex flex-col">
        <div className="p-4 border-b border-[var(--border)]">
          <h1 className="font-semibold text-[var(--text)] font-[Syne]">Conversas</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {conversations.filter((c) => c.unread_count > 0).length} não lidas
          </p>
        </div>
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      {/* Janela de chat */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <ChatWindow
            conversation={selected}
            onUpdate={handleConversationUpdate}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--text-muted)]">
            <div className="text-center">
              <p className="text-4xl mb-3">💬</p>
              <p>Selecione uma conversa</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
