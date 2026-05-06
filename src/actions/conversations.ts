"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage } from "@/lib/whatsapp/client";
import type { Conversation, Message } from "@/types";
import type { Database } from "@/types/database";

async function getWorkspaceId(): Promise<string> {
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
  return data.workspace_id;
}

export async function getConversations(): Promise<Conversation[]> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId();

  const { data, error } = await supabase
    .from("conversations")
    .select(`
      *,
      lead:leads(id, name, phone, company, status),
      assignee:profiles!conversations_assigned_to_fkey(id, name, avatar_url)
    `)
    .eq("workspace_id", workspaceId)
    .order("last_message_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Conversation[];
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId();

  const { data, error } = await supabase
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
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId();

  const { data, error } = await supabase
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
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("phone_number, phone_number_id")
    .eq("id", conversationId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!conversation) throw new Error("Conversa não encontrada");

  await sendWhatsAppMessage(
    conversation.phone_number_id,
    conversation.phone_number,
    content
  );

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    workspace_id: workspaceId,
    direction: "outbound",
    type: "text",
    content,
    status: "sent",
    sender_id: user?.id ?? null,
  });
}

export async function takeOverConversation(conversationId: string): Promise<void> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase
    .from("conversations")
    .update({ ai_active: false, assigned_to: user?.id ?? null })
    .eq("id", conversationId)
    .eq("workspace_id", workspaceId);
}

export async function enableAI(conversationId: string): Promise<void> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId();

  await supabase
    .from("conversations")
    .update({ ai_active: true, assigned_to: null })
    .eq("id", conversationId)
    .eq("workspace_id", workspaceId);
}

export async function markAsRead(conversationId: string): Promise<void> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId();

  await supabase
    .from("conversations")
    .update({ unread_count: 0 })
    .eq("id", conversationId)
    .eq("workspace_id", workspaceId);
}

export async function closeConversation(conversationId: string): Promise<void> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId();

  await supabase
    .from("conversations")
    .update({ status: "closed" })
    .eq("id", conversationId)
    .eq("workspace_id", workspaceId);
}

export async function getConversationByLeadId(leadId: string): Promise<Conversation | null> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId();

  const { data } = await supabase
    .from("conversations")
    .select("*")
    .eq("lead_id", leadId)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data as unknown as Conversation | null;
}
