"use client";

import { useEffect, useState, useRef } from "react";
import { Bot, UserCheck, CheckCheck, Trash2, Send, Loader2, Mic, Paperclip, X, Play, Pause } from "lucide-react";
import type { Conversation, Message } from "@/types";
import {
  getConversationByLeadId,
  getMessages,
  sendMessage,
  takeOverConversation,
  enableAI,
  markAsReplied,
  closeConversation,
  deleteConversation,
  getUserRole,
} from "@/actions/conversations";
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
  const [userRole, setUserRole] = useState<"admin" | "member">("member");

  // Gravação de áudio
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Anexo
  const [attachPreview, setAttachPreview] = useState<{ file: File; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview de áudio gravado
  const [audioPreview, setAudioPreview] = useState<{ blob: Blob; url: string } | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    Promise.all([
      getConversationByLeadId(leadId),
      getUserRole(),
    ]).then(async ([conv, role]) => {
      setConversation(conv);
      setUserRole(role);
      if (conv) {
        const msgs = await getMessages(conv.id);
        setMessages(msgs);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "instant" }), 50);
      }
      setLoading(false);
    });
  }, [leadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function refreshMessages() {
    if (!conversation) return;
    const updated = await getMessages(conversation.id);
    setMessages(updated);
  }

  async function handleSend() {
    if (!text.trim() || sending || !conversation) return;
    const content = text.trim();
    setText("");
    setSending(true);
    try {
      await sendMessage(conversation.id, content);
      await refreshMessages();
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function handleSendFile(file: File) {
    if (!conversation) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conversationId", conversation.id);
      await fetch("/api/whatsapp/send-media", { method: "POST", body: formData });
      await refreshMessages();
    } finally {
      setSending(false);
      setAttachPreview(null);
      setAudioPreview(null);
    }
  }

  function handleAttachClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAttachPreview({ file, url });
    e.target.value = "";
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith("image/"));
    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (!file) return;
      const named = new File([file], `screenshot-${Date.now()}.png`, { type: file.type });
      const url = URL.createObjectURL(named);
      setAttachPreview({ file: named, url });
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioPreview({ blob, url });
        setRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      alert("Não foi possível acessar o microfone.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  function cancelRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
    }
    setRecording(false);
    setRecordingSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function toggleAudioPlay() {
    if (!audioPreview) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioPreview.url);
      audioRef.current.onended = () => setAudioPlaying(false);
    }
    if (audioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
    } else {
      audioRef.current.play();
      setAudioPlaying(true);
    }
  }

  async function sendAudioPreview() {
    if (!audioPreview) return;
    const file = new File([audioPreview.blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
    await handleSendFile(file);
    setAudioPreview(null);
    setAudioPlaying(false);
    audioRef.current = null;
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

  async function handleMarkReplied() {
    if (!conversation) return;
    await markAsReplied(conversation.id);
    setConversation({ ...conversation, needs_reply: false });
  }

  async function handleClose() {
    if (!conversation) return;
    await closeConversation(conversation.id);
    setConversation({ ...conversation, status: "closed" });
  }

  async function handleDelete() {
    if (!conversation) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteConversation(conversation.id);
    if (result.error) {
      setDeleteError(result.error);
      setDeleting(false);
    } else {
      setConversation(null);
      setMessages([]);
      setDeleteModalOpen(false);
      setDeleting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
        <Loader2 className="size-4 animate-spin" />
        Carregando...
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
        <p className="text-4xl">📱</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nenhuma conversa WhatsApp encontrada para este lead.</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Quando o lead enviar uma mensagem, ela aparecerá aqui.</p>
      </div>
    );
  }

  const isAI = conversation.ai_active;
  const isClosed = conversation.status === "closed";
  const isDisabled = sending || isAI || isClosed;
  const name = conversation.lead?.name ?? `+${conversation.phone_number}`;
  const initials = name.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col overflow-hidden h-full min-h-[400px]" style={{ background: "var(--bg)" }}>

      {/* ── Header (idêntico ao ChatWindow) ── */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        {/* Esquerda: avatar + nome + telefone */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full border flex items-center justify-center text-sm font-medium shrink-0"
            style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-sec)" }}
          >
            {initials}
          </div>
          <div>
            <p className="font-medium text-sm" style={{ color: "var(--text)" }}>{name}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>+{conversation.phone_number}</p>
          </div>
        </div>

        {/* Direita: botões de ação */}
        <div className="flex items-center gap-2">
          {isAI ? (
            <button
              onClick={handleTakeOver}
              className="text-xs px-3 py-1.5 rounded-md font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#CAFF33", color: "#0C0C0E" }}
            >
              Assumir conversa
            </button>
          ) : (
            <button
              onClick={handleEnableAI}
              className="text-xs px-3 py-1.5 rounded-md font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#CAFF33", color: "#0C0C0E" }}
            >
              Ativar IA
            </button>
          )}

          {conversation.needs_reply && (
            <button
              onClick={handleMarkReplied}
              className="text-xs px-3 py-1.5 rounded-md font-medium text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#FF4757" }}
            >
              Respondido
            </button>
          )}

          {!isClosed && (
            <button
              onClick={handleClose}
              className="text-xs px-3 py-1.5 rounded-md border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#FF4757";
                e.currentTarget.style.borderColor = "#FF4757";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              Encerrar
            </button>
          )}

          {userRole === "admin" && (
            <button
              onClick={() => setDeleteModalOpen(true)}
              title="Excluir conversa"
              className="p-1.5 rounded-md border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#FF4757";
                e.currentTarget.style.borderColor = "#FF4757";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Barra de status IA ── */}
      <div
        className="px-4 py-1.5 text-xs flex items-center gap-1.5 shrink-0"
        style={
          isAI
            ? { backgroundColor: "rgba(202,255,51,0.1)", color: "#CAFF33" }
            : { background: "var(--surface)", color: "var(--text-muted)" }
        }
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {isAI ? "Agente IA ativo — qualificando automaticamente" : "Atendimento humano — você está no controle"}
      </div>

      {/* ── Mensagens ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ background: "var(--bg)" }}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm" style={{ color: "var(--text-muted)" }}>
            Nenhuma mensagem ainda
          </div>
        ) : (
          messages.map((msg) => {
            const isOut = msg.direction === "outbound";
            const isByHuman = isOut && msg.sender_id !== null;

            const bubbleStyle: React.CSSProperties = isOut
              ? isByHuman
                ? { backgroundColor: "#FFFFFF", color: "#0C0C0E" }
                : { backgroundColor: "#CAFF33", color: "#0C0C0E" }
              : { background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" };

            return (
              <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${isOut ? "rounded-br-sm" : "rounded-bl-sm"}`}
                  style={bubbleStyle}
                >
                  {msg.type === "audio" && msg.media_url ? (
                    <AudioPlayer url={msg.media_url} outbound={isOut} humanSent={isByHuman} />
                  ) : msg.type === "image" && msg.media_url ? (
                    <img src={msg.media_url} alt="imagem" className="max-w-full rounded-lg max-h-48 object-contain" />
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                  <p
                    className="text-[10px] mt-1"
                    style={{
                      color: "rgba(12,12,14,0.5)",
                      textAlign: "right",
                      display: isOut ? undefined : "none",
                    }}
                  >
                    {formatTime(msg.created_at)}
                    {isByHuman && msg.sender && <span className="ml-1">· {msg.sender.name}</span>}
                    {!isByHuman && isOut && <span className="ml-1">· IA</span>}
                  </p>
                  {!isOut && (
                    <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                      {formatTime(msg.created_at)}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Preview de anexo ── */}
      {attachPreview && (
        <div
          className="px-4 py-2 border-t flex items-center gap-3 shrink-0"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
          {attachPreview.file.type.startsWith("image/") ? (
            <img src={attachPreview.url} alt="preview" className="h-14 w-14 object-cover rounded-lg border" style={{ borderColor: "var(--border)" }} />
          ) : (
            <div className="h-14 w-14 rounded-lg border flex items-center justify-center text-2xl" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>📎</div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate" style={{ color: "var(--text)" }}>{attachPreview.file.name}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{(attachPreview.file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button onClick={() => setAttachPreview(null)} style={{ color: "var(--text-muted)" }} className="hover:text-red-400">
            <X className="size-4" />
          </button>
          <button
            onClick={() => handleSendFile(attachPreview.file)}
            disabled={sending}
            className="px-3 py-1.5 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "#CAFF33", color: "#0C0C0E" }}
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : "Enviar"}
          </button>
        </div>
      )}

      {/* ── Preview de áudio gravado ── */}
      {audioPreview && !recording && (
        <div
          className="px-4 py-2 border-t flex items-center gap-3 shrink-0"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
          <button
            onClick={toggleAudioPlay}
            className="flex size-9 items-center justify-center rounded-full shrink-0"
            style={{ backgroundColor: "#CAFF33", color: "#0C0C0E" }}
          >
            {audioPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <div className="flex-1">
            <p className="text-xs" style={{ color: "var(--text)" }}>Áudio gravado</p>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{recordingSeconds}s</p>
          </div>
          <button onClick={() => { setAudioPreview(null); audioRef.current = null; }} style={{ color: "var(--text-muted)" }} className="hover:text-red-400">
            <X className="size-4" />
          </button>
          <button
            onClick={sendAudioPreview}
            disabled={sending}
            className="px-3 py-1.5 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "#CAFF33", color: "#0C0C0E" }}
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : "Enviar"}
          </button>
        </div>
      )}

      {/* ── Input ── */}
      <div className="p-3 border-t shrink-0" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        {isClosed ? (
          <p className="text-center text-sm py-1" style={{ color: "var(--text-muted)" }}>Conversa encerrada</p>
        ) : recording ? (
          <div className="flex items-center gap-3">
            <button onClick={cancelRecording} className="hover:opacity-80" style={{ color: "var(--negative)" }}>
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-1 items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--negative)" }} />
              <span className="text-sm" style={{ color: "var(--text)" }}>Gravando... {recordingSeconds}s</span>
            </div>
            <button
              onClick={stopRecording}
              className="flex size-9 items-center justify-center rounded-xl shrink-0 hover:opacity-90"
              style={{ backgroundColor: "#CAFF33", color: "#0C0C0E" }}
            >
              <Send className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <button
              onClick={handleAttachClick}
              disabled={isDisabled}
              title="Anexar arquivo"
              className="p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => { if (!isDisabled) e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
            />

            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              onPaste={handlePaste}
              placeholder={isAI ? "IA respondendo automaticamente..." : "Digite uma mensagem..."}
              disabled={isDisabled}
              rows={1}
              className="flex-1 resize-none rounded-xl px-3 py-2 text-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed leading-5 max-h-32 overflow-y-auto border"
              style={{
                background: "var(--surface-2)",
                borderColor: "var(--border)",
                color: "var(--text)",
                scrollbarWidth: "none",
              }}
            />

            {text.trim() ? (
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex size-9 items-center justify-center rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90 shrink-0"
                style={{ backgroundColor: "#CAFF33", color: "#0C0C0E" }}
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={isDisabled}
                title="Gravar áudio"
                className="p-2 rounded-xl border transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-muted)" }}
                onMouseEnter={(e) => {
                  if (!isDisabled) {
                    e.currentTarget.style.color = "#CAFF33";
                    e.currentTarget.style.borderColor = "#CAFF33";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-muted)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Modal de exclusão ── */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deleting && setDeleteModalOpen(false)} />
          <div
            className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border p-6 shadow-2xl flex flex-col gap-4"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            {/* Ícone + título */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: "rgba(255,71,87,0.15)", border: "1px solid rgba(255,71,87,0.3)" }}
              >
                <Trash2 className="w-5 h-5" style={{ color: "#FF4757" }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>Excluir conversa</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Esta ação não pode ser desfeita</p>
              </div>
            </div>

            {/* Pergunta */}
            <p className="text-sm" style={{ color: "var(--text-sec)" }}>
              Tem certeza que deseja excluir{" "}
              <strong style={{ color: "var(--text)" }}>{name}</strong>?
            </p>

            {/* Lista do que será excluído */}
            <ul className="text-sm space-y-1 list-disc list-inside" style={{ color: "var(--text-muted)" }}>
              <li>Todas as mensagens da conversa</li>
              <li>O lead e suas atividades</li>
            </ul>

            <p className="text-xs font-medium" style={{ color: "rgba(255,71,87,0.8)" }}>
              Esta ação não pode ser desfeita.
            </p>

            {deleteError && (
              <p className="text-xs rounded-lg px-3 py-2" style={{ color: "#FF4757", backgroundColor: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.2)" }}>
                {deleteError}
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setDeleteModalOpen(false); setDeleteError(null); }}
                disabled={deleting}
                className="px-4 py-2 rounded-lg border text-sm transition-colors disabled:opacity-50 hover:bg-[var(--surface-2)]"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                style={{ backgroundColor: "#FF4757" }}
              >
                {deleting ? "Excluindo..." : "Sim, excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Player de áudio inline ─────────────────────────────────────────────────

function AudioPlayer({ url, outbound, humanSent = false }: { url: string; outbound: boolean; humanSent?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // IA: verde. Vendedor humano: preto sobre branco. Inbound: verde sobre surface.
  const btnBg = !outbound ? "rgba(202,255,51,0.15)" : humanSent ? "rgba(0,0,0,0.12)" : "rgba(12,12,14,0.2)";
  const btnColor = !outbound ? "#CAFF33" : "#0C0C0E";
  const trackBg = !outbound ? "var(--border)" : humanSent ? "rgba(0,0,0,0.15)" : "rgba(12,12,14,0.2)";
  const fillColor = !outbound ? "#CAFF33" : "#0C0C0E";

  function toggle() {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  }

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <button
        onClick={toggle}
        className="flex size-8 items-center justify-center rounded-full shrink-0 transition-opacity hover:opacity-80"
        style={{ backgroundColor: btnBg, color: btnColor }}
      >
        {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
      </button>
      <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: trackBg }}>
        <div className="h-full w-1/3 rounded-full" style={{ backgroundColor: fillColor }} />
      </div>
    </div>
  );
}
