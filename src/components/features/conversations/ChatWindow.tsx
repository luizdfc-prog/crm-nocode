"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Mic, Paperclip, Send, X, Play, Pause, UserCog, ChevronRight } from "lucide-react";
import type { Conversation, Message, Lead, Profile, Pipeline } from "@/types";
import {
  getMessages,
  sendMessage,
  takeOverConversation,
  enableAI,
  closeConversation,
  markAsRead,
} from "@/actions/conversations";
import { getLead, updateLead, getWorkspaceMembers } from "@/actions/leads";
import { getPipelines } from "@/actions/pipeline";
import { createDeal } from "@/actions/deals";
import { LeadForm, type LeadFormData } from "@/components/features/leads/LeadForm";
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
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [attachPreview, setAttachPreview] = useState<{ file: File; url: string } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelLead, setPanelLead] = useState<Lead | null>(null);
  const [panelMembers, setPanelMembers] = useState<Pick<Profile, "id" | "name">[]>([]);
  const [panelPipelines, setPanelPipelines] = useState<Pipeline[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addToPipelineOpen, setAddToPipelineOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function refreshMessages() {
    const updated = await getMessages(conversation.id);
    setMessages(updated);
  }

  async function openPanel() {
    setPanelOpen(true);
    if (!panelLead && conversation.lead_id) {
      setPanelLoading(true);
      const [lead, members, pipelines] = await Promise.all([
        getLead(conversation.lead_id),
        getWorkspaceMembers(),
        getPipelines(),
      ]);
      setPanelLead(lead);
      setPanelMembers(members);
      setPanelPipelines(pipelines);
      setPanelLoading(false);
    }
  }

  async function handleLeadEdit(data: LeadFormData) {
    if (!panelLead) return;
    const result = await updateLead({
      id: panelLead.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      role: data.role,
      status: data.status,
      owner_id: data.owner_id || null,
    });
    if (result.success) {
      setPanelLead(result.data);
      onUpdate({ ...conversation, lead: result.data as Conversation["lead"] });
      setEditOpen(false);
    }
  }

  async function handleAddToPipeline(pipelineId: string, stageId: string) {
    if (!panelLead) return;
    await createDeal({
      title: panelLead.name,
      value: 0,
      stage: "novo_lead",
      pipeline_id: pipelineId,
      stage_id: stageId,
      lead_id: panelLead.id,
    });
    setAddToPipelineOpen(false);
  }

  async function handleSend() {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText("");
    setSending(true);
    try {
      await sendMessage(conversation.id, content);
      await refreshMessages();
    } finally {
      setSending(false);
    }
  }

  async function handleSendFile(file: File) {
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

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
        await handleSendFile(file);
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
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
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
  const isDisabled = sending || conversation.ai_active || conversation.status === "closed";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-sm font-medium text-[var(--text-sec)]">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-[var(--text)] text-sm">{name}</p>
              {conversation.lead && (
                <Link href={`/leads/${conversation.lead.id}`} className="text-xs text-[var(--accent)] hover:underline">
                  Ver lead →
                </Link>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)]">+{conversation.phone_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conversation.lead_id && (
            <button
              onClick={openPanel}
              title="Perfil do lead"
              className="text-xs px-3 py-1.5 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)] transition-colors flex items-center gap-1.5"
            >
              <UserCog className="w-3.5 h-3.5" />
              Perfil
            </button>
          )}
          {conversation.ai_active ? (
            <button onClick={handleTakeOver} className="text-xs px-3 py-1.5 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)] transition-colors">
              Assumir conversa
            </button>
          ) : (
            <button onClick={handleEnableAI} className="text-xs px-3 py-1.5 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-[var(--accent)] hover:border-[var(--accent)] transition-colors">
              Ativar IA
            </button>
          )}
          {conversation.status === "open" && (
            <button onClick={handleClose} className="text-xs px-3 py-1.5 rounded-md bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--negative)] hover:border-[var(--negative)] transition-colors">
              Encerrar
            </button>
          )}
        </div>
      </div>

      {/* Status IA */}
      <div className={`px-4 py-1.5 text-xs flex items-center gap-1.5 shrink-0 ${conversation.ai_active ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "bg-[var(--surface)] text-[var(--text-muted)]"}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {conversation.ai_active ? "Agente IA ativo — qualificando automaticamente" : "Atendimento humano — você está no controle"}
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[var(--bg)]">
        {loading ? (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">Carregando...</div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">Nenhuma mensagem ainda</div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Preview de anexo */}
      {attachPreview && (
        <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--surface-2)] flex items-center gap-3 shrink-0">
          {attachPreview.file.type.startsWith("image/") ? (
            <img src={attachPreview.url} alt="preview" className="h-14 w-14 object-cover rounded-lg border border-[var(--border)]" />
          ) : (
            <div className="h-14 w-14 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-2xl">📎</div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--text)] truncate">{attachPreview.file.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{(attachPreview.file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button onClick={() => setAttachPreview(null)} className="text-[var(--text-muted)] hover:text-[var(--negative)]">
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleSendFile(attachPreview.file)}
            disabled={sending}
            className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-black text-sm font-medium hover:opacity-90 disabled:opacity-40"
          >
            {sending ? "..." : "Enviar"}
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-[var(--border)] bg-[var(--surface)] shrink-0">
        {conversation.status === "closed" ? (
          <p className="text-center text-sm text-[var(--text-muted)]">Conversa encerrada</p>
        ) : recording ? (
          <div className="flex items-center gap-3">
            <button onClick={cancelRecording} className="text-[var(--negative)] hover:opacity-80">
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--negative)] animate-pulse" />
              <span className="text-sm text-[var(--text)]">Gravando... {recordingSeconds}s</span>
            </div>
            <button
              onClick={stopRecording}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] text-black text-sm font-medium hover:opacity-90 flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              Enviar
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            {/* Anexo */}
            <button
              onClick={handleAttachClick}
              disabled={isDisabled}
              title="Anexar arquivo"
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" />

            {/* Texto */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={conversation.ai_active ? "IA respondendo automaticamente..." : "Digite uma mensagem..."}
              disabled={isDisabled}
              rows={1}
              className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed resize-none max-h-32 overflow-y-auto"
              style={{ lineHeight: "1.5" }}
            />

            {/* Enviar texto ou microfone */}
            {text.trim() ? (
              <button
                onClick={handleSend}
                disabled={isDisabled}
                className="p-2 rounded-xl bg-[var(--accent)] text-black hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={isDisabled}
                title="Gravar áudio"
                className="p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {conversation.ai_active && conversation.status !== "closed" && (
          <p className="text-xs text-[var(--text-muted)] mt-1.5 text-center">
            Clique em "Assumir conversa" para responder manualmente.
          </p>
        )}
      </div>

      {/* Painel lateral de perfil do lead */}
      {panelOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPanelOpen(false)} />
          <div className="relative z-10 flex h-full w-full flex-col bg-[var(--surface)] shadow-2xl sm:max-w-sm overflow-y-auto">
            {/* Header do painel */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 shrink-0">
              <h2 className="font-semibold text-[var(--text)] text-sm">Perfil do Lead</h2>
              <button onClick={() => setPanelOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)] p-1 rounded-lg hover:bg-[var(--surface-2)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {panelLoading ? (
              <div className="flex flex-1 items-center justify-center text-[var(--text-muted)] text-sm">
                Carregando...
              </div>
            ) : panelLead ? (
              <div className="flex flex-col gap-5 px-5 py-5">
                {/* Avatar + nome */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-lg font-bold text-[var(--accent)]">
                    {panelLead.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text)]">{panelLead.name}</p>
                    {panelLead.company && <p className="text-xs text-[var(--text-muted)]">{panelLead.company}</p>}
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">+{conversation.phone_number}</p>
                  </div>
                </div>

                {/* Dados */}
                <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  {[
                    { label: "E-mail", value: panelLead.email },
                    { label: "Telefone", value: panelLead.phone },
                    { label: "Empresa", value: panelLead.company },
                    { label: "Cargo", value: panelLead.role },
                    { label: "Status", value: panelLead.status },
                  ].map(({ label, value }) => value ? (
                    <div key={label} className="flex justify-between gap-2">
                      <span className="text-xs text-[var(--text-muted)]">{label}</span>
                      <span className="text-xs text-[var(--text)] text-right">{value}</span>
                    </div>
                  ) : null)}
                </div>

                {/* Ações */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setEditOpen(true)}
                    className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)] hover:bg-[var(--surface-2)] transition-colors text-sm text-[var(--text)]"
                  >
                    <span>Editar perfil</span>
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                  </button>

                  <Link
                    href={`/leads/${panelLead.id}`}
                    className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)] transition-colors text-sm text-[var(--text)]"
                  >
                    <span>Ver página completa do lead</span>
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                  </Link>

                  <button
                    onClick={() => setAddToPipelineOpen(!addToPipelineOpen)}
                    className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)] transition-colors text-sm text-[var(--text)]"
                  >
                    <span>Adicionar ao pipeline</span>
                    <ChevronRight className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${addToPipelineOpen ? "rotate-90" : ""}`} />
                  </button>

                  {addToPipelineOpen && (
                    <div className="flex flex-col gap-2 pl-2">
                      {panelPipelines.filter(p => p.type !== "agent").map((pipeline) => (
                        <div key={pipeline.id} className="flex flex-col gap-1.5">
                          <p className="text-xs text-[var(--text-muted)] font-medium px-1">{pipeline.name}</p>
                          {(pipeline.stages ?? []).map((stage) => (
                            <button
                              key={stage.id}
                              onClick={() => handleAddToPipeline(pipeline.id, stage.id)}
                              className="text-left px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] hover:bg-[var(--surface-2)] text-xs text-[var(--text)] transition-colors"
                            >
                              + Adicionar em "{stage.name}"
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center text-[var(--text-muted)] text-sm px-5 text-center">
                Lead não encontrado. O contato ainda não foi associado.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de edição do lead */}
      {panelLead && (
        <LeadForm
          isOpen={editOpen}
          initialData={panelLead}
          members={panelMembers}
          onClose={() => setEditOpen(false)}
          onSubmit={handleLeadEdit}
        />
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === "outbound";

  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${isOutbound ? "bg-[var(--accent)] text-black rounded-br-sm" : "bg-[var(--surface-2)] text-[var(--text)] rounded-bl-sm border border-[var(--border)]"}`}>
        <MediaContent message={message} isOutbound={isOutbound} />
        <p className={`text-[10px] mt-1 ${isOutbound ? "text-black/60 text-right" : "text-[var(--text-muted)]"}`}>
          {formatTime(message.created_at)}
          {isOutbound && message.sender && <span className="ml-1">· {message.sender.name ?? "IA"}</span>}
        </p>
      </div>
    </div>
  );
}

function MediaContent({ message, isOutbound }: { message: Message; isOutbound: boolean }) {
  if (message.type === "audio") {
    return (
      <div className="flex flex-col gap-1">
        <AudioPlayer isOutbound={isOutbound} />
        {message.content && message.content !== "[audio]" && (
          <p className={`text-xs italic mt-1 ${isOutbound ? "text-black/70" : "text-[var(--text-muted)]"}`}>
            🎤 {message.content}
          </p>
        )}
      </div>
    );
  }

  if (message.type === "image" && message.media_url) {
    return (
      <div className="flex flex-col gap-1">
        <img src={message.media_url} alt="imagem" className="rounded-xl max-w-full max-h-64 object-cover" />
        {message.content && <p className="text-xs mt-1">{message.content}</p>}
      </div>
    );
  }

  if (message.type === "document") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xl">📎</span>
        <span className="text-sm truncate">{message.content ?? "Documento"}</span>
      </div>
    );
  }

  return <p className="whitespace-pre-wrap break-words">{message.content}</p>;
}

function AudioPlayer({ isOutbound }: { isOutbound: boolean }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <button
        onClick={() => setPlaying(!playing)}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isOutbound ? "bg-black/20 text-black" : "bg-[var(--accent)]/20 text-[var(--accent)]"}`}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <div className={`flex-1 h-1 rounded-full ${isOutbound ? "bg-black/20" : "bg-[var(--border)]"}`}>
        <div className={`h-full w-0 rounded-full ${isOutbound ? "bg-black/50" : "bg-[var(--accent)]"}`} />
      </div>
      <span className={`text-[10px] shrink-0 ${isOutbound ? "text-black/60" : "text-[var(--text-muted)]"}`}>🎵</span>
    </div>
  );
}
