"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Conversation } from "@/types";
import { ConversationList } from "@/components/features/conversations/ConversationList";
import { ChatWindow } from "@/components/features/conversations/ChatWindow";
import { getConversations, getUserRole } from "@/actions/conversations";

interface ConversationsClientProps {
  initialConversations: Conversation[];
}

const LIST_MIN = 200;
const LIST_MAX = 520;
const LIST_DEFAULT = 320;

const PANEL_MIN = 220;
const PANEL_MAX = 480;
const PANEL_DEFAULT = 288;

function useDrag(
  initial: number,
  min: number,
  max: number,
  direction: "right" | "left"
) {
  const [size, setSize] = useState(initial);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startSize = useRef(initial);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startSize.current = size;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function onMove(ev: MouseEvent) {
      if (!dragging.current) return;
      const delta = direction === "right"
        ? ev.clientX - startX.current
        : startX.current - ev.clientX;
      setSize(Math.min(max, Math.max(min, startSize.current + delta)));
    }

    function onUp() {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [size, min, max, direction]);

  return { size, onMouseDown };
}

export function ConversationsClient({ initialConversations }: ConversationsClientProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversations[0]?.id ?? null
  );
  const [userRole, setUserRole] = useState<"admin" | "member">("member");

  const listDrag = useDrag(LIST_DEFAULT, LIST_MIN, LIST_MAX, "right");
  const panelDrag = useDrag(PANEL_DEFAULT, PANEL_MIN, PANEL_MAX, "left");

  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const hasPanel = !!selected?.lead_id;

  useEffect(() => {
    getUserRole().then(setUserRole);
  }, []);

  useEffect(() => {
    let running = false;
    const interval = setInterval(async () => {
      if (running) return;
      running = true;
      try {
        const fresh = await getConversations();
        setConversations(fresh);
      } catch {
        // silencioso
      } finally {
        running = false;
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  function handleConversationUpdate(updated: Conversation) {
    setConversations((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  }

  function handleConversationDelete(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Lista de conversas */}
      <div
        className="shrink-0 flex flex-col overflow-hidden"
        style={{ width: listDrag.size, backgroundColor: "#E8E8E8" }}
      >
        <div className="p-4 border-b shrink-0" style={{ borderColor: "#C8C8C8" }}>
          <h1 className="font-semibold font-[Syne]" style={{ color: "#0C0C0E" }}>Conversas</h1>
          <p className="text-xs mt-0.5" style={{ color: "#555559" }}>
            {conversations.filter((c) => c.needs_reply).length} aguardando resposta
          </p>
        </div>
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          userRole={userRole}
          onSelect={setSelectedId}
          onDelete={handleConversationDelete}
        />
      </div>

      {/* Divisor arrastável — lista | chat */}
      <div
        onMouseDown={listDrag.onMouseDown}
        className="w-1 shrink-0 hover:w-1.5 transition-all cursor-col-resize relative group"
        style={{ backgroundColor: "#2A2A2E" }}
        title="Arraste para redimensionar"
      >
        <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-[#CAFF33]/20 transition-colors" />
      </div>

      {/* Janela de chat */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selected ? (
          <ChatWindow
            conversation={selected}
            onUpdate={handleConversationUpdate}
            panelWidth={hasPanel ? panelDrag.size : 0}
            onPanelDragStart={panelDrag.onMouseDown}
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
