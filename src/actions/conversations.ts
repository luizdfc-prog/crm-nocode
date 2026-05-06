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

  if (conversation.phone_number_id.startsWith("baileys:")) {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp-qr/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: conversation.phone_number, text: content }),
    });
  } else {
    await sendWhatsAppMessage(
      conversation.phone_number_id,
      conversation.phone_number,
      content
    );
  }

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    workspace_id: workspaceId,
    direction: "outbound",
    type: "text",
    content,
    status: "sent",
    sender_id: user?.id ?? null,
  });

  await supabase
    .from("conversations")
    .update({ needs_reply: false, last_message_content: content, last_message_direction: "outbound" })
    .eq("id", conversationId)
    .eq("workspace_id", workspaceId);
}

export async function markAsReplied(conversationId: string): Promise<void> {
  const supabase = await createClient();
  const workspaceId = await getWorkspaceId();

  await supabase
    .from("conversations")
    .update({ needs_reply: false })
    .eq("id", conversationId)
    .eq("workspace_id", workspaceId);
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

  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("profile_id", user.id)
    .eq("workspace_id", workspaceId)
    .single();

  if (member?.role !== "admin") {
    return { error: "Apenas administradores podem excluir conversas." };
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Buscar lead_id vinculado antes de excluir
  const { data: conv } = await serviceClient
    .from("conversations")
    .select("lead_id")
    .eq("id", conversationId)
    .single();

  const { error: msgError } = await serviceClient
    .from("messages")
    .delete()
    .eq("conversation_id", conversationId);

  if (msgError) return { error: `Erro ao excluir mensagens: ${msgError.message}` };

  const { error: convError } = await serviceClient
    .from("conversations")
    .delete()
    .eq("id", conversationId)
    .eq("workspace_id", workspaceId);

  if (convError) return { error: `Erro ao excluir conversa: ${convError.message}` };

  // Excluir o lead vinculado junto
  if (conv?.lead_id) {
    await serviceClient
      .from("activities")
      .delete()
      .eq("lead_id", conv.lead_id);

    await serviceClient
      .from("leads")
      .delete()
      .eq("id", conv.lead_id)
      .eq("workspace_id", workspaceId);
  }

  return {};
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
