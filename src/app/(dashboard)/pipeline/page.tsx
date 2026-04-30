import { getDeals } from "@/actions/deals"
import { getLeads, getWorkspaceMembers } from "@/actions/leads"
import { PipelineClient } from "./PipelineClient"

export default async function PipelinePage() {
  const [deals, leads, members] = await Promise.all([
    getDeals(),
    getLeads(),
    getWorkspaceMembers(),
  ])

  return <PipelineClient initialDeals={deals} leads={leads} members={members} />
}
