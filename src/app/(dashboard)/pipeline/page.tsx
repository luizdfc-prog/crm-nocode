import { getDeals } from "@/actions/deals"
import { getPipelines } from "@/actions/pipeline"
import { getLeads, getWorkspaceMembers } from "@/actions/leads"
import { getConversations } from "@/actions/conversations"
import { PipelineClient } from "./PipelineClient"

export default async function PipelinePage() {
  const [pipelines, allDeals, leads, members, conversations] = await Promise.all([
    getPipelines(),
    getDeals(),
    getLeads(),
    getWorkspaceMembers(),
    getConversations(),
  ])

  const unreadLeadIds = new Set(
    conversations
      .filter((c) => c.unread_count > 0 && c.lead_id)
      .map((c) => c.lead_id as string)
  )

  return (
    <PipelineClient
      pipelines={pipelines}
      allDeals={allDeals}
      leads={leads}
      members={members}
      unreadLeadIds={unreadLeadIds}
    />
  )
}
