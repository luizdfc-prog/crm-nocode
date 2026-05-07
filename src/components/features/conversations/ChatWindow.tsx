"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mic, Paperclip, Send, X, Play, Pause, ChevronRight, Trash2 } from "lucide-react";
import type { Activity, Conversation, Message, Lead, Profile, Pipeline } from "@/types";
import {
  getMessages,
  sendMessage,
  takeOverConversation,
  enableAI,
  closeConversation,
  markAsRead,
  markAsReplied,
  deleteConversation,
  getUserRole,
} from "@/actions/conversations";
import { getLead, updateLead, getWorkspaceMembers } from "@/actions/leads";
import { getPipelines } from "@/actions/pipeline";
import { createDeal } from "@/actions/deals";
import { getActivitiesForLead, createActivity } from "@/actions/activities";
import { getDeals } from "@/actions/deals";
import { getFieldValuesForLead, upsertFieldValues } from "@/actions/customFields";
import { LeadForm, type LeadFormData } from "@/components/features/leads/LeadForm";
import { ActivityTimeline } from "@/components/features/leads/ActivityTimeline";
import { ActivityForm } from "@/components/features/leads/ActivityForm";
import { CustomFieldsSection } from "@/components/features/leads/CustomFieldsSection";
import { formatTime } from "@/utils/date";
import type { LeadFieldWithValue } from "@/types";

type PanelTab = "perfil" | "atividades";

interface ChatWindowProps {
  conversation: Conversation;
  onUpdate: (conversation: Conversation) => void;
  panelWidth?: number;
  onPanelDragStart?: (e: React.MouseEvent) => void;
}

export function ChatWindow({ conversation, onUpdate, panelWidth, onPanelDragStart }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [attachPreview, setAttachPreview] = useState<{ file: File; url: string } | null>(null);

  // Painel lateral permanente
  const [panelLead, setPanelLead] = useState<Lead | null>(null);
  const [panelMembers, setPanelMembers] = useState<Pick<Profile, "id" | "name" | "email" | "avatar_url" | "created_at">[]>([]);
  const [panelPipelines, setPanelPipelines] = useState<Pipeline[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("perfil");
  const [editOpen, setEditOpen] = useState(false);
  const [addToPipelineOpen, setAddToPipelineOpen] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);

  const [userRole, setUserRole] = useState<"admin" | "member">("member");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pipelineSuccess, setPipelineSuccess] = useState<string | null>(null);
  const [leadDeals, setLeadDeals] = useState<import("@/types").Deal[]>([]);
  const [customFields, setCustomFields] = useState<LeadFieldWithValue[]>([]);
  const [aiTyping, setAiTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getUserRole().then(setUserRole);
  }, []);

  useEffect(() => {
    setLoading(true);
    markAsRead(conversation.id);
    getMessages(conversation.id).then((msgs) => {
      setMessages(msgs);
      setLoading(false);
      if (conversation.ai_active && msgs.length > 0) {
        const last = msgs[msgs.length - 1];
        setAiTyping(last.direction === "inbound");
      }
    });
    onUpdate({ ...conversation, unread_count: 0 });

    // Carregar dados do lead sempre que mudar de conversa
    if (conversation.lead_id) {
      setPanelLoading(true);
      setPanelLead(null);
      setActivitiesLoaded(false);
      setActivities([]);
      Promise.all([
        getLead(conversation.lead_id),
        getWorkspaceMembers(),
        getPipelines(),
        getDeals(),
        getFieldValuesForLead(conversation.lead_id),
      ]).then(([lead, members, pipelines, deals, fields]) => {
        setPanelLead(lead);
        setPanelMembers(members);
        setPanelPipelines(pipelines);
        setLeadDeals(deals.filter((d) => d.lead_id === conversation.lead_id));
        setCustomFields(fields);
        setPanelLoading(false);
      });
    } else {
      setPanelLead(null);
    }
  }, [conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Carregar atividades quando aba atividades é aberta
  useEffect(() => {
    if (panelTab === "atividades" && conversation.lead_id && !activitiesLoaded) {
      getActivitiesForLead(conversation.lead_id).then((acts) => {
        setActivities(acts);
        setActivitiesLoaded(true);
      });
    }
  }, [panelTab, conversation.lead_id, activitiesLoaded]);

  async function refreshMessages() {
    const updated = await getMessages(conversation.id);
    setMessages(updated);
    // Mostra "digitando" se última mensagem é inbound e IA está ativa
    if (conversation.ai_active && updated.length > 0) {
      const last = updated[updated.length - 1];
      setAiTyping(last.direction === "inbound");
    } else {
      setAiTyping(false);
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
      if (data.customValues && Object.keys(data.customValues).length > 0) {
        await upsertFieldValues(panelLead.id, data.customValues);
        setCustomFields((prev) =>
          prev.map((f) => f.id in data.customValues! ? { ...f, value: data.customValues![f.id] ?? null } : f)
        );
      }
      setPanelLead(result.data);
      onUpdate({ ...conversation, lead: result.data as Conversation["lead"] });
      setEditOpen(false);
    }
  }

  async function handleAddToPipeline(pipelineId: string, stageId: string) {
    if (!panelLead) return;
    const result = await createDeal({
      title: panelLead.name,
      value: 0,
      stage: "novo_lead",
      pipeline_id: pipelineId,
      stage_id: stageId,
      lead_id: panelLead.id,
    });
    setAddToPipelineOpen(false);
    if (result.success) {
      setLeadDeals((prev) => [...prev, result.data]);
      const pipeline = panelPipelines.find((p) => p.id === pipelineId);
      const stage = pipeline?.stages?.find((s) => s.id === stageId);
      const label = pipeline ? `${pipeline.name}${stage ? ` › ${stage.name}` : ""}` : "Pipeline";
      setPipelineSuccess(`Adicionado em "${label}"`);
      setTimeout(() => setPipelineSuccess(null), 4000);
    }
  }

  async function handleActivityCreate(data: {
    type: Activity["type"];
    description: string;
    activity_date: string;
  }) {
    if (!conversation.lead_id) return;
    const result = await createActivity({
      lead_id: conversation.lead_id,
      type: data.type,
      description: data.description,
      activity_date: data.activity_date,
    });
    if (result.success) {
      setActivities((prev) => [result.data, ...prev]);
    }
  }

  async function handleSend() {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText("");
    setSending(true);
    try {
      await sendMessage(conversation.id, content);
      onUpdate({ ...conversation, needs_reply: false });
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
      await markAsReplied(conversation.id);
      onUpdate({ ...conversation, needs_reply: false });
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

  async function handleDeleteConfirm() {
    setDeleting(true);
    const result = await deleteConversation(conversation.id);
    setDeleting(false);
    if (result.error) {
      alert(result.error);
      setDeleteModalOpen(false);
      return;
    }
    setDeleteModalOpen(false);
    onUpdate({ ...conversation, status: "closed" });
    window.location.reload();
  }

  async function handleMarkAsReplied() {
    await markAsReplied(conversation.id);
    onUpdate({ ...conversation, needs_reply: false });
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
  const hasLead = !!conversation.lead_id;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Área principal do chat */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
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
            {conversation.ai_active ? (
              <button onClick={handleTakeOver} className="text-xs px-3 py-1.5 rounded-md text-black font-medium hover:opacity-90 transition-opacity" style={{ backgroundColor: "#CAFF33" }}>
                Assumir conversa
              </button>
            ) : (
              <button onClick={handleEnableAI} className="text-xs px-3 py-1.5 rounded-md text-black font-medium hover:opacity-90 transition-opacity" style={{ backgroundColor: "#CAFF33" }}>
                Ativar IA
              </button>
            )}
            {conversation.needs_reply && (
              <button onClick={handleMarkAsReplied} className="text-xs px-3 py-1.5 rounded-md text-white font-medium hover:opacity-90 transition-opacity" style={{ backgroundColor: "#FF4757" }}>
                Respondido
              </button>
            )}
            {conversation.status === "open" && (
              <button onClick={handleClose} className="text-xs px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--negative)] hover:border-[var(--negative)] transition-colors">
                Encerrar
              </button>
            )}
            <button
              onClick={() => setDeleteModalOpen(true)}
              title={userRole !== "admin" ? "Apenas administradores podem excluir" : "Excluir conversa"}
              className="p-1.5 rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--negative)] hover:border-[var(--negative)] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
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
          {aiTyping && (
            <div className="flex justify-end">
              <div className="flex items-center gap-1 rounded-2xl rounded-br-sm px-4 py-3" style={{ backgroundColor: "#CAFF33" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-black/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-black/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-black/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
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
              className="px-3 py-1.5 rounded-lg text-black text-sm font-bold hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: "#CAFF33" }}
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
                className="px-4 py-2 rounded-lg text-black text-sm font-medium hover:opacity-90 flex items-center gap-1.5"
                style={{ backgroundColor: "#CAFF33" }}
              >
                <Send className="w-4 h-4" />
                Enviar
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <button
                onClick={handleAttachClick}
                disabled={isDisabled}
                title="Anexar arquivo"
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" />

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                onPaste={handlePaste}
                placeholder={conversation.ai_active ? "IA respondendo automaticamente..." : "Digite uma mensagem..."}
                disabled={isDisabled}
                rows={1}
                className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed resize-none max-h-32 overflow-y-auto"
                style={{ lineHeight: "1.5" }}
              />

              {text.trim() ? (
                <button
                  onClick={handleSend}
                  disabled={isDisabled}
                  className="p-2 rounded-xl text-black hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shrink-0"
                  style={{ backgroundColor: "#CAFF33" }}
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
      </div>

      {/* Painel lateral permanente */}
      {hasLead && (
        <>
          {/* Divisor arrastável — chat | painel */}
          <div
            onMouseDown={onPanelDragStart}
            className="w-1 shrink-0 hover:w-1.5 transition-all cursor-col-resize relative group"
            style={{ backgroundColor: "#2A2A2E" }}
            title="Arraste para redimensionar"
          >
            <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-[#CAFF33]/20 transition-colors" />
          </div>
        </>
      )}
      {hasLead && (
        <div
          className="shrink-0 border-l border-[var(--border)] flex flex-col bg-[var(--surface)] overflow-hidden"
          style={{ width: panelWidth ?? 288 }}
        >
          {/* Abas do painel */}
          <div className="flex border-b border-[var(--border)] shrink-0">
            <button
              onClick={() => setPanelTab("perfil")}
              className="flex-1 px-4 py-3 text-xs font-medium transition-opacity border-b-2 -mb-px"
              style={{
                borderColor: panelTab === "perfil" ? "#CAFF33" : "transparent",
                color: "#CAFF33",
                opacity: panelTab === "perfil" ? 1 : 0.5,
              }}
            >
              Perfil
            </button>
            <button
              onClick={() => setPanelTab("atividades")}
              className="flex-1 px-4 py-3 text-xs font-medium transition-opacity border-b-2 -mb-px"
              style={{
                borderColor: panelTab === "atividades" ? "#CAFF33" : "transparent",
                color: "#CAFF33",
                opacity: panelTab === "atividades" ? 1 : 0.5,
              }}
            >
              Atividades
            </button>
          </div>

          {/* Conteúdo do painel */}
          <div className="flex-1 overflow-y-auto">
            {panelLoading ? (
              <div className="flex items-center justify-center h-32 text-[var(--text-muted)] text-sm">
                Carregando...
              </div>
            ) : !panelLead ? (
              <div className="flex items-center justify-center h-32 text-[var(--text-muted)] text-sm px-4 text-center">
                Lead não encontrado.
              </div>
            ) : panelTab === "perfil" ? (
              <div className="flex flex-col gap-4 p-4">
                {/* Avatar + nome editável inline */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border flex items-center justify-center text-base font-bold shrink-0" style={{ backgroundColor: "rgba(202,255,51,0.15)", borderColor: "rgba(202,255,51,0.3)", color: "#CAFF33" }}>
                    {panelLead.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <InlineNameEditor
                      value={panelLead.name}
                      onSave={async (newName) => {
                        const result = await updateLead({
                          id: panelLead.id,
                          name: newName,
                          email: panelLead.email ?? undefined,
                          phone: panelLead.phone ?? undefined,
                          company: panelLead.company ?? undefined,
                          role: panelLead.role ?? undefined,
                          status: panelLead.status,
                          owner_id: panelLead.owner_id || null,
                        });
                        if (result.success) {
                          setPanelLead(result.data);
                          onUpdate({ ...conversation, lead: result.data as Conversation["lead"] });
                        }
                      }}
                    />
                    {panelLead.company && <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{panelLead.company}</p>}
                  </div>
                </div>

                {/* Dados */}
                <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  {[
                    { label: "Telefone", value: panelLead.phone || `+${conversation.phone_number}` },
                    { label: "E-mail", value: panelLead.email },
                    { label: "Cargo", value: panelLead.role },
                    { label: "Status", value: panelLead.status },
                  ].map(({ label, value }) => value ? (
                    <div key={label} className="flex justify-between gap-2">
                      <span className="text-xs text-[var(--text-muted)] shrink-0">{label}</span>
                      <span className="text-xs text-[var(--text)] text-right truncate">{value}</span>
                    </div>
                  ) : null)}
                </div>

                {/* Campos personalizados */}
                {customFields.length > 0 && (
                  <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Informações adicionais</p>
                    <CustomFieldsSection
                      fields={customFields}
                      leadId={panelLead.id}
                      onSaved={setCustomFields}
                    />
                  </div>
                )}

                {/* Ações */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setEditOpen(true)}
                    className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)] transition-colors text-xs text-[var(--text)]"
                  >
                    <span>Editar perfil</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  </button>

                  <Link
                    href={`/leads/${panelLead.id}`}
                    className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)] transition-colors text-xs text-[var(--text)]"
                  >
                    <span>Ver página completa</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  </Link>

                  {/* Etapa atual do lead no pipeline */}
                  {leadDeals.length > 0 && (() => {
                    const lastDeal = leadDeals[leadDeals.length - 1];
                    const pipeline = panelPipelines.find((p) => p.id === lastDeal.pipeline_id);
                    const stage = pipeline?.stages?.find((s) => s.id === lastDeal.stage_id);
                    return (
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs font-medium text-[var(--text-muted)] px-1">Etapa Atual</p>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage?.color ?? "#CAFF33" }} />
                          <p className="text-xs text-[var(--text)] truncate">{stage?.name ?? lastDeal.stage}</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Confirmação de adição */}
                  {pipelineSuccess && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-[rgba(202,255,51,0.08)]" style={{ borderColor: "rgba(202,255,51,0.3)" }}>
                      <span className="text-[var(--accent)] text-xs">✓</span>
                      <p className="text-xs text-[var(--accent)]">{pipelineSuccess}</p>
                    </div>
                  )}

                  <button
                    onClick={() => setAddToPipelineOpen(!addToPipelineOpen)}
                    className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)] transition-colors text-xs text-[var(--text)]"
                  >
                    <span>Adicionar ao pipeline</span>
                    <ChevronRight className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${addToPipelineOpen ? "rotate-90" : ""}`} />
                  </button>

                  {addToPipelineOpen && (
                    <div className="flex flex-col gap-1.5 pl-2">
                      {panelPipelines.filter((p) => p.type !== "agent").map((pipeline) => (
                        <div key={pipeline.id} className="flex flex-col gap-1">
                          <p className="text-xs text-[var(--text-muted)] font-medium px-1">{pipeline.name}</p>
                          {(pipeline.stages ?? []).map((stage) => (
                            <button
                              key={stage.id}
                              onClick={() => handleAddToPipeline(pipeline.id, stage.id)}
                              className="text-left px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] text-xs text-[var(--text)] transition-colors"
                            >
                              + {stage.name}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Aba Atividades */
              <div className="flex flex-col gap-3 p-4">
                <ActivityForm onSubmit={handleActivityCreate} />
                <div className="text-xs text-[var(--text-muted)]">
                  {activities.length} registro{activities.length !== 1 ? "s" : ""}
                </div>
                <ActivityTimeline activities={activities} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteModalOpen(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--negative)]/15 border border-[var(--negative)]/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-[var(--negative)]" />
              </div>
              <div>
                <p className="font-semibold text-[var(--text)] text-sm">Excluir conversa</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-sm text-[var(--text-sec)]">
              Tem certeza que deseja excluir <strong className="text-[var(--text)]">{name}</strong>?
            </p>
            <ul className="text-sm text-[var(--text-muted)] list-disc list-inside space-y-1">
              <li>Todas as mensagens da conversa</li>
              {conversation.lead_id && <li>O lead e suas atividades</li>}
            </ul>
            <p className="text-xs font-medium" style={{ color: "rgba(255,71,87,0.8)" }}>Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
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

      {/* Modal de edição do lead */}
      {panelLead && (
        <LeadForm
          isOpen={editOpen}
          initialData={panelLead}
          members={panelMembers}
          customFields={customFields}
          onClose={() => setEditOpen(false)}
          onSubmit={handleLeadEdit}
        />
      )}
    </div>
  );
}

function InlineNameEditor({ value, onSave }: { value: string; onSave: (name: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) { setEditing(false); setDraft(value); return; }
    setSaving(true);
    await onSave(trimmed);
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setDraft(value); } }}
        disabled={saving}
        className="w-full rounded-md px-2 py-0.5 text-sm font-semibold bg-[var(--surface-2)] border border-[var(--accent)] text-[var(--text)] outline-none"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="Clique para editar o nome"
      className="group flex items-center gap-1.5 w-full text-left"
    >
      <span className="font-semibold text-[var(--text)] text-sm truncate">{value}</span>
      <span className="text-[10px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">✎</span>
    </button>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === "outbound";
  // IA: outbound sem sender_id. Vendedor: outbound com sender_id.
  const isByHuman = isOutbound && message.sender_id !== null;

  const bubbleStyle: React.CSSProperties = isOutbound
    ? isByHuman
      ? { backgroundColor: "#FFFFFF", color: "#0C0C0E" }
      : { backgroundColor: "#CAFF33", color: "#0C0C0E" }
    : {};

  const bubbleClass = isOutbound
    ? "rounded-br-sm"
    : "bg-[var(--surface-2)] text-[var(--text)] rounded-bl-sm border border-[var(--border)]";

  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${bubbleClass}`} style={bubbleStyle}>
        <MediaContent message={message} isOutbound={isOutbound} />
        <p className="text-[10px] mt-1" style={{ color: isOutbound ? "rgba(12,12,14,0.5)" : "var(--text-muted)", textAlign: isOutbound ? "right" : "left" }}>
          {formatTime(message.created_at)}
          {isOutbound && message.sender && <span className="ml-1">· {message.sender.name}</span>}
          {isOutbound && !message.sender_id && <span className="ml-1">· IA</span>}
        </p>
      </div>
    </div>
  );
}

function MediaContent({ message, isOutbound }: { message: Message; isOutbound: boolean }) {
  if (message.type === "audio") {
    return (
      <div className="flex flex-col gap-1">
        <AudioPlayer url={message.media_url} isOutbound={isOutbound} />
        {message.content && message.content !== "[audio]" && !message.content.startsWith("[") && (
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
        <a href={message.media_url} target="_blank" rel="noopener noreferrer">
          <img src={message.media_url} alt="imagem" className="rounded-xl max-w-full max-h-64 object-cover cursor-zoom-in" />
        </a>
        {message.content && <p className="text-xs mt-1">{message.content}</p>}
      </div>
    );
  }

  if (message.type === "document" || (message.type !== "text" && message.type !== "audio" && message.type !== "image" && message.media_url)) {
    const name = message.filename ?? message.content ?? "Arquivo";
    const ext = name.split(".").pop()?.toUpperCase() ?? "DOC";
    return (
      <a
        href={message.media_url ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        download={name}
        className={`flex items-center gap-3 rounded-xl p-2.5 min-w-[180px] transition-opacity hover:opacity-80 ${isOutbound ? "bg-black/15" : "bg-[var(--surface)] border border-[var(--border)]"}`}
      >
        <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 text-[9px] font-bold gap-0.5 ${isOutbound ? "bg-black/20 text-black/70" : "bg-[var(--accent)]/15 text-[var(--accent)]"}`}>
          <span className="text-base leading-none">📄</span>
          <span>{ext}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-medium truncate ${isOutbound ? "text-black" : "text-[var(--text)]"}`}>{name}</p>
          <p className={`text-[10px] mt-0.5 ${isOutbound ? "text-black/60" : "text-[var(--text-muted)]"}`}>Clique para abrir</p>
        </div>
      </a>
    );
  }

  return <p className="whitespace-pre-wrap break-words">{message.content}</p>;
}

function AudioPlayer({ url, isOutbound }: { url: string | null; isOutbound: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  function formatDur(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  function togglePlay() {
    if (!url) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onloadedmetadata = () => setDuration(audioRef.current?.duration ?? 0);
      audioRef.current.ontimeupdate = () => {
        const a = audioRef.current!;
        setCurrentTime(a.currentTime);
        setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
      };
      audioRef.current.onended = () => { setPlaying(false); setProgress(0); setCurrentTime(0); };
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    if (!audioRef.current || !audioRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * audioRef.current.duration;
  }

  return (
    <div className="flex items-center gap-3 min-w-[220px]">
      <button
        onClick={togglePlay}
        disabled={!url}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-95 ${!url ? "opacity-40 cursor-not-allowed" : "cursor-pointer"} ${isOutbound ? "bg-black/40 text-black hover:bg-black/50" : "bg-[var(--accent)] text-black hover:bg-[var(--accent)]/90"}`}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div
          className={`h-2 rounded-full cursor-pointer select-none ${isOutbound ? "bg-black/25" : "bg-[var(--border)]"}`}
          onClick={seek}
        >
          <div
            className={`h-full rounded-full transition-all ${isOutbound ? "bg-black/70" : "bg-[var(--accent)]"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={`text-[10px] font-medium ${isOutbound ? "text-black/60" : "text-[var(--text-sec)]"}`}>
          {playing || currentTime > 0 ? formatDur(currentTime) : formatDur(duration)}
        </span>
      </div>
    </div>
  );
}
