"use server";

import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { sendWhatsAppMessage } from "@/lib/whatsapp/client";
import type { Conversation, Message } from "@/types";
import { getMyPermissions } from "./permissions";

async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("profile_id", user.id)
    .limit(1)
    .single();

  if (!data) throw new Error("Workspace não encontrado");
  return { user, workspaceId: data.workspace_id };
}

async function getWorkspaceId(): Promise<string> {
  const { workspaceId } = await getAuthContext();
  return workspaceId;
}

export async function getConversations(): Promise<Conversation[]> {
  const { user, workspaceId } = await getAuthContext();
  const db = getServiceClient();

  const perms = await getMyPermissions();
  if (perms?.convs_view === "none") return [];

  let query = db
    .from("conversations")
    .select(`
      *,
      lead:leads(id, name, phone, company, status),
      assignee:profiles!conversations_assigned_to_fkey(id, name, avatar_url)
    `)
    .eq("workspace_id", workspaceId)
    .order("last_message_at", { ascending: false });

  if (perms?.convs_view === "own") {
    query = query.eq("assigned_to", user.id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Conversation[];
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const { workspaceId } = await getAuthContext();
  const db = getServiceClient();

  const { data, error } = await db
    .from("conversations")
    .select(`
      *,
      lead:leads(id, name, phone, company, status),
      assignee:profiles!conversations_assigned_to_fkey(id, name, avatar_url)
    `)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();

  if (error) return null;
  return data as unknown as Conversation;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const { workspaceId } = await getAuthContext();
  const db = getServiceClient();

  const { data, error } = await db
    .from("messages")
    .select(`*, sender:profiles!messages_sender_id_fkey(id, name, avatar_url)`)
    .eq("conversation_id", conversationId)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as Message[];
}

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<void> {
  const { user, workspaceId } = await getAuthContext();
  const db = getServiceClient();

  const { data: conversation } = await db
    .from("conversations")
    .select("phone_number, phone_number_id")
    .eq("id", conversationId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!conversation) throw new Error("Conversa não encontrada");

  if (conversation.phone_number_id.startsWith("baileys:")) {
    const baileysUrl = process.env.BAILEYS_SERVER_URL?.replace(/\/$/, "");
    const toJid = conversation.phone_number.includes("@")
      ? conversation.phone_number
      : `${conversation.phone_number}@s.whatsapp.net`;
    await fetch(`${baileysUrl}/send/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": process.env.BAILEYS_API_SECRET ?? "",
      },
      body: JSON.stringify({ to: toJid, text: content }),
    });
  } else {
    await sendWhatsAppMessage(
      conversation.phone_number_id,
      conversation.phone_number,
      content
    );
  }

  await db.from("messages").insert({
    conversation_id: conversationId,
    workspace_id: workspaceId,
    direction: "outbound",
    type: "text",
    content,
    status: "sent",
    sender_id: user.id ?? null,
  });

  await db
    .from("conversations")
    .update({ needs_reply: false, last_message_content: content, last_message_direction: "outbound" })
    .eq("id", conversationId)
    .eq("workspace_id", workspaceId);
}

export async function markAsReplied(conversationId: string): Promise<void> {
  const { workspaceId } = await getAuthContext();
  const db = getServiceClient();

  await db
    .from("conversations")
    .update({ needs_reply: false })
    .eq("id", conversationId)
    .eq("workspace_id", workspaceId);
}

export async function takeOverConversation(conversationId: string): Promise<void> {
  const { user, workspaceId } = await getAuthContext();
  const db = getServiceClient();

  await db
    .from("conversations")
    .update({ ai_active: false, assigned_to: user.id ?? null })
    .eq("id", conversationId)
    .eq("workspace_id", workspaceId);
}

export async function enableAI(conversationId: string): Promise<void> {
  const { workspaceId } = await getAuthContext();
  const db = getServiceClient();

  await db
    .from("conversations")
    .update({ ai_active: true, assigned_to: null })
    .eq("id", conversationId)
    .eq("workspace_id", workspaceId);
}

export async function markAsRead(conversationId: string): Promise<void> {
  const { workspaceId } = await getAuthContext();
  const db = getServiceClient();

  await db
    .from("conversations")
    .update({ unread_count: 0 })
    .eq("id", conversationId)
    .eq("workspace_id", workspaceId);
}

export async function closeConversation(conversationId: string): Promise<void> {
  const { workspaceId } = await getAuthContext();
  const db = getServiceClient();

  await db
    .from("conversations")
    .update({ status: "closed" })
    .eq("id", conversationId)
    .eq("workspace_id", workspaceId);
}

export async function getUserRole(): Promise<"admin" | "member"> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "member";

  const workspaceId = await getWorkspaceId();
  const { data } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("profile_id", user.id)
    .eq("workspace_id", workspaceId)
    .single();

  return (data?.role as "admin" | "member") ?? "member";
}

export async function deleteConversation(conversationId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const workspaceId = await getWorkspaceId();
  const db = getServiceClient();

  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("profile_id", user.id)
    .eq("workspace_id", workspaceId)
    .single();

  if (member?.role !== "admin") {
    return { error: "Apenas administradores podem excluir conversas." };
  }

  const { data: conv } = await db
    .from("conversations")
    .select("lead_id")
    .eq("id", conversationId)
    .single();

  const { error: msgError } = await db
    .from("messages")
    .delete()
    .eq("conversation_id", conversationId);

  if (msgError) return { error: `Erro ao excluir mensagens: ${msgError.message}` };

  const { error: convError } = await db
    .from("conversations")
    .delete()
    .eq("id", conversationId)
    .eq("workspace_id", workspaceId);

  if (convError) return { error: `Erro ao excluir conversa: ${convError.message}` };

  if (conv?.lead_id) {
    await db.from("activities").delete().eq("lead_id", conv.lead_id);
    await db.from("deals").delete().eq("lead_id", conv.lead_id).eq("workspace_id", workspaceId);
    await db.from("leads").delete().eq("id", conv.lead_id).eq("workspace_id", workspaceId);
  }

  return {};
}

export async function getConversationByLeadId(leadId: string): Promise<Conversation | null> {
  const { workspaceId } = await getAuthContext();
  const db = getServiceClient();

  const { data } = await db
    .from("conversations")
    .select("*")
    .eq("lead_id", leadId)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data as unknown as Conversation | null;
}
