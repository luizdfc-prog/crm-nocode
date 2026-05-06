"use client";

import { useEffect, useState } from "react";
import type { Conversation, Message } from "@/types";
import { getConversationByLeadId, getMessages, sendMessage, takeOverConversation, enableAI } from "@/actions/conversations";
import { formatTime } from "@/utils/date";

interface LeadChatTabProps {
  leadId: string;
}

export function LeadChatTab({ leadId }: LeadChatTabProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = { current: null as HTMLDivElement | null };

  useEffect(() => {
    getConversationByLeadId(leadId).then(async (conv) => {
      setConversation(conv);
      if (conv) {
        const msgs = await getMessages(conv.id);
        setMessages(msgs);
      }
      setLoading(false);
    });
  }, [leadId]);

  async function handleSend() {
    if (!text.trim() || sending || !conversation) return;
    const content = text.trim();
    setText("");
    setSending(true);
    try {
      await sendMessage(conversation.id, content);
      const updated = await getMessages(conversation.id);
      setMessages(updated);
    } finally {
      setSending(false);
    }
  }

  async function handleTakeOver() {
    if (!conversation) return;
    await takeOverConversation(conversation.id);
    setConversation({ ...conversation, ai_active: false });
  }

  async function handleEnableAI() {
    if (!conversation) return;
    await enableAI(conversation.id);
    setConversation({ ...conversation, ai_active: true });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[var(--text-muted)]">
        Carregando...
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
        <p className="text-4xl">📱</p>
        <p className="text-sm text-[var(--text-muted)]">
          Nenhuma conversa WhatsApp encontrada para este lead.
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Quando o lead enviar uma mensagem, ela aparecerá aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col border border-[var(--border)] rounded-xl overflow-hidden" style={{ height: 480 }}>
      {/* Status bar */}
      <div className={`px-4 py-2 flex items-center justify-between text-xs ${conversation.ai_active ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "bg-[var(--surface-2)] text-[var(--text-muted)]"}`}>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {conversation.ai_active ? "Agente IA respondendo automaticamente" : "Atendimento humano"}
        </span>
        <div className="flex gap-2">
          {conversation.ai_active ? (
            <button onClick={handleTakeOver} className="underline hover:no-underline">
              Assumir
            </button>
          ) : (
            <button onClick={handleEnableAI} className="underline hover:no-underline text-[var(--accent)]">
              Ativar IA
            </button>
          )}
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[var(--surface)]">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-[var(--text-muted)]">
            Nenhuma mensagem ainda
          </div>
        ) : (
          messages.map((msg) => {
            const isOutbound = msg.direction === "outbound";
            return (
              <div key={msg.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${isOutbound ? "bg-[var(--accent)] text-black rounded-br-sm" : "bg-[var(--surface-2)] text-[var(--text)] rounded-bl-sm border border-[var(--border)]"}`}>
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isOutbound ? "text-black/60 text-right" : "text-[var(--text-muted)]"}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={(el) => { bottomRef.current = el; }} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[var(--border)] bg-[var(--surface)] flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder={conversation.ai_active ? "IA respondendo automaticamente..." : "Digite uma mensagem..."}
          disabled={sending || conversation.ai_active || conversation.status === "closed"}
          className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim() || conversation.ai_active || conversation.status === "closed"}
          className="px-3 py-2 rounded-lg bg-[var(--accent)] text-black text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {sending ? "..." : "Enviar"}
        </button>
      </div>
    </div>
  );
}
