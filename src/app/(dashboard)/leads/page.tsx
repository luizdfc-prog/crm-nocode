import { getLeads, getWorkspaceMembers } from "@/actions/leads"
import { LeadsClient } from "./LeadsClient"

export default async function LeadsPage() {
  const [leads, members] = await Promise.all([
    getLeads(),
    getWorkspaceMembers(),
  ])

  return <LeadsClient initialLeads={leads} members={members} />
}
