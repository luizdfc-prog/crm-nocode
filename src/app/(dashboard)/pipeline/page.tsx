import { getDeals } from "@/actions/deals"
import { getPipelines } from "@/actions/pipeline"
import { getLeads, getWorkspaceMembers } from "@/actions/leads"
import { PipelineClient } from "./PipelineClient"

export default async function PipelinePage() {
  const [pipelines, allDeals, leads, members] = await Promise.all([
    getPipelines(),
    getDeals(),
    getLeads(),
    getWorkspaceMembers(),
  ])

  return (
    <PipelineClient
      pipelines={pipelines}
      allDeals={allDeals}
      leads={leads}
      members={members}
    />
  )
}
