"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import type { Conversation } from "@/types";
import { formatPhone } from "@/utils/phone";
import { formatDistanceToNow } from "@/utils/date";
import { deleteConversation } from "@/actions/conversations";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  userRole: "admin" | "member";
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ConversationList({ conversations, selectedId, userRole, onSelect, onDelete }: ConversationListProps) {
  const [modalId, setModalId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const modalConversation = conversations.find((c) => c.id === modalId);

  async function handleDeleteConfirm() {
    if (!modalId) return;
    setDeleting(true);
    const result = await deleteConversation(modalId);
    setDeleting(false);
    if (result.error) {
      alert(result.error);
      return;
    }
    const deletedId = modalId;
    setModalId(null);
    onDelete(deletedId);
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center" style={{ backgroundColor: "#E8E8E8" }}>
        <p className="text-sm" style={{ color: "#555559" }}>
          Nenhuma conversa ainda.<br />
          As mensagens do WhatsApp aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#E8E8E8" }}>
        {conversations.map((conversation) => {
          const isSelected = conversation.id === selectedId;
          const needsReply = conversation.needs_reply;
          const name = conversation.lead?.name ?? formatPhone(conversation.phone_number);

          return (
            <div
              key={conversation.id}
              className="group relative w-full text-left px-4 py-3 border-b cursor-pointer transition-colors"
              style={{
                borderColor: "#C8C8C8",
                borderLeftWidth: "2px",
                borderLeftColor: isSelected ? "#CAFF33" : needsReply ? "#FF4757" : "transparent",
                backgroundColor: isSelected
                  ? "#D0D0D0"
                  : needsReply
                  ? "rgba(255,71,87,0.08)"
                  : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#D4D4D4";
              }}
              onMouseLeave={(e) => {
                if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor =
                  needsReply ? "rgba(255,71,87,0.08)" : "transparent";
              }}
              onClick={() => onSelect(conversation.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full border flex items-center justify-center shrink-0 text-sm font-medium"
                    style={{
                      backgroundColor: needsReply ? "rgba(255,71,87,0.12)" : "#C8C8C8",
                      borderColor: needsReply ? "rgba(255,71,87,0.3)" : "#AAAAAA",
                      color: needsReply ? "#FF4757" : "#0C0C0E",
                    }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm truncate" style={{ color: "#0C0C0E", fontWeight: needsReply ? 600 : 400 }}>
                      {name}
                    </p>
                    {conversation.last_message_content ? (
                      <p className="text-xs truncate" style={{ color: "#555559" }}>
                        {conversation.last_message_direction === "outbound" && (
                          <span style={{ color: "#7AAA00" }}>Você: </span>
                        )}
                        {conversation.last_message_content}
                      </p>
                    ) : conversation.lead?.company ? (
                      <p className="text-xs truncate" style={{ color: "#555559" }}>{conversation.lead.company}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {conversation.last_message_at && (
                    <span className="text-xs" style={{ color: "#777779" }}>
                      {formatDistanceToNow(conversation.last_message_at)}
                    </span>
                  )}
                  {needsReply && (
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#FF4757" }} />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-1 ml-11">
                <span className="text-xs" style={{ color: conversation.ai_active ? "#7AAA00" : "#777779" }}>
                  ● {conversation.ai_active ? "IA ativa" : "Atendimento humano"}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setModalId(conversation.id); }}
                  title={userRole !== "admin" ? "Apenas administradores podem excluir" : "Excluir conversa"}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:text-[#FF4757]"
                  style={{ color: "#777779" }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de confirmação de exclusão */}
      {modalId && modalConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalId(null)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(255,71,87,0.15)", border: "1px solid rgba(255,71,87,0.3)" }}>
                  <Trash2 className="w-5 h-5" style={{ color: "#FF4757" }} />
                </div>
                <div>
                  <p className="font-semibold text-[var(--text)] text-sm">Excluir conversa</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              <button onClick={() => setModalId(null)} className="text-[var(--text-muted)] hover:text-[var(--text)] p-1 rounded-lg hover:bg-[var(--surface-2)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-[var(--text-sec)]">
              Tem certeza que deseja excluir <strong className="text-[var(--text)]">{modalConversation.lead?.name ?? formatPhone(modalConversation.phone_number)}</strong>?
            </p>
            <ul className="text-sm text-[var(--text-muted)] list-disc list-inside space-y-1">
              <li>Todas as mensagens da conversa</li>
              {modalConversation.lead_id && <li>O lead e suas atividades</li>}
            </ul>
            <p className="text-xs text-[var(--negative)]/80 font-medium">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setModalId(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "#FF4757" }}
              >
                {deleting ? "Excluindo..." : "Sim, excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
