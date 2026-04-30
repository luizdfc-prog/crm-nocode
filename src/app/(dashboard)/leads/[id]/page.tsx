import { notFound } from "next/navigation"
import { getLead, getWorkspaceMembers } from "@/actions/leads"
import { getActivitiesForLead } from "@/actions/activities"
import { LeadDetailClient } from "./LeadDetailClient"

interface LeadDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params

  const [lead, activities, members] = await Promise.all([
    getLead(id),
    getActivitiesForLead(id),
    getWorkspaceMembers(),
  ])

  if (!lead) notFound()

  return <LeadDetailClient lead={lead} initialActivities={activities} members={members} />
}
