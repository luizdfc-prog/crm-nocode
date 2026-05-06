"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Conversation, Message } from "@/types";
import {
  getMessages,
  sendMessage,
  takeOverConversation,
  enableAI,
  closeConversation,
  markAsRead,
} from "@/actions/conversations";
import { formatTime } from "@/utils/date";

interface ChatWindowProps {
  conversation: Conversation;
  onUpdate: (conversation: Conversation) => void;
}

export function ChatWindow({ conversation, onUpdate }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    markAsRead(conversation.id);
    getMessages(conversation.id).then((msgs) => {
      setMessages(msgs);
      setLoading(false);
    });
    onUpdate({ ...conversation, unread_count: 0 });
  }, [conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!text.trim() || sending) return;
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
    await takeOverConversation(conversation.id);
    onUpdate({ ...conversation, ai_active: false });
  }

  async function handleEnableAI() {
    await enableAI(conversation.id);
    onUpdate({ ...conversation, ai_active: true });
  }

  async function handleClose() {
    await closeConversation(conversation.id);
    onUpdate({ ...conversation, status: "closed" });
  }

  const name = conversation.lead?.name ?? `+${conversation.phone_number}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-sm font-medium text-[var(--text-sec)]">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-[var(--text)] text-sm">{name}</p>
              {conversation.lead && (
                <Link
                  href={`/leads/${conversation.lead.id}`}
                  className="text-xs text-[var(--accent)] hover:underline"
                >
                  Ver lead →
                </Link>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)]">+{conversation.phone_number}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversation.ai_active ? (
            <button
              onClick={handleTakeOver}
              className="text-xs px-3 py-1.5 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] transition-colors"
            >
              Assumir conversa
            </button>
          ) : (
            <button
              onClick={handleEnableAI}
              className="text-xs px-3 py-1.5 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
            >
              Ativar IA
            </button>
          )}
          {conversation.status === "open" && (
            <button
              onClick={handleClose}
              className="text-xs px-3 py-1.5 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--negative)] hover:border-[var(--negative)] transition-colors"
            >
              Encerrar
            </button>
          )}
        </div>
      </div>

      {/* Status da IA */}
      <div className={`px-4 py-1.5 text-xs flex items-center gap-1.5 ${conversation.ai_active ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "bg-[var(--surface)] text-[var(--text-muted)]"}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {conversation.ai_active
          ? "Agente IA ativo — qualificando o lead automaticamente"
          : "Atendimento humano — você está no controle"}
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
            Carregando mensagens...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
            Nenhuma mensagem ainda
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)]">
        {conversation.status === "closed" ? (
          <p className="text-center text-sm text-[var(--text-muted)]">Conversa encerrada</p>
        ) : (
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Digite uma mensagem..."
              disabled={sending || conversation.ai_active}
              className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSend}
              disabled={sending || !text.trim() || conversation.ai_active}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] text-black text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {sending ? "..." : "Enviar"}
            </button>
          </div>
        )}
        {conversation.ai_active && conversation.status !== "closed" && (
          <p className="text-xs text-[var(--text-muted)] mt-1.5 text-center">
            IA respondendo automaticamente. Clique em "Assumir conversa" para responder manualmente.
          </p>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === "outbound";

  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
          isOutbound
            ? "bg-[var(--accent)] text-black rounded-br-sm"
            : "bg-[var(--surface-2)] text-[var(--text)] rounded-bl-sm border border-[var(--border)]"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p className={`text-[10px] mt-1 ${isOutbound ? "text-black/60 text-right" : "text-[var(--text-muted)]"}`}>
          {formatTime(message.created_at)}
          {isOutbound && message.sender && (
            <span className="ml-1">· {message.sender.name ?? "IA"}</span>
          )}
        </p>
      </div>
    </div>
  );
}
