import { getConversations } from "@/actions/conversations";
import { ConversationsClient } from "./ConversationsClient";

export default async function ConversationsPage() {
  const conversations = await getConversations();

  return <ConversationsClient initialConversations={conversations} />;
}
