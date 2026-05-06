"use client"

import { useState } from "react"
import { Building2, Users, CreditCard, Bot, GitBranch, MessageCircle } from "lucide-react"
import { WorkspaceTab } from "./WorkspaceTab"
import { MembersTab } from "./MembersTab"
import { PlanTab } from "./PlanTab"
import { AgentTab } from "./AgentTab"
import { PipelinesTab } from "./PipelinesTab"
import { WhatsAppQRTab } from "./WhatsAppQRTab"
import type { WorkspaceRow } from "@/types/supabase"
import type { Pipeline } from "@/types"

type TabKey = "workspace" | "members" | "plan" | "agent" | "pipelines" | "whatsapp"

interface TabDef {
  key: TabKey
  label: string
  icon: "building" | "users" | "credit-card" | "bot" | "git-branch" | "message-circle"
}

interface SettingsTabsProps {
  workspace: WorkspaceRow
  currentUserId: string
  currentUserRole: "admin" | "member"
  initialTab: TabKey
  tabs: TabDef[]
  upgradeSuccess?: boolean
  initialPipelines?: Pipeline[]
}

const ICONS: Record<TabDef["icon"], React.ElementType> = {
  building: Building2,
  users: Users,
  "credit-card": CreditCard,
  bot: Bot,
  "git-branch": GitBranch,
  "message-circle": MessageCircle,
}

export function SettingsTabs({
  workspace: initialWorkspace,
  currentUserId,
  currentUserRole,
  initialTab,
  tabs,
  upgradeSuccess,
  initialPipelines = [],
}: SettingsTabsProps) {
  const [active, setActive] = useState<TabKey>(initialTab)
  const [workspace, setWorkspace] = useState(initialWorkspace)

  const isAdmin = currentUserRole === "admin"
  const isPro = workspace.plan === "pro"

  function handleWorkspaceNameUpdate(name: string) {
    setWorkspace((prev) => ({ ...prev, name }))
  }

  return (
    <div className="flex flex-col gap-0 rounded-2xl border border-pf-border bg-pf-surface overflow-hidden">
      {/* Tab bar — horizontal scroll em mobile */}
      <div className="flex overflow-x-auto border-b border-pf-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const Icon = ICONS[tab.icon]
          const isActive = active === tab.key
          // Tabs restritas a admins
          const isRestricted =
            (tab.key === "workspace" || tab.key === "members" || tab.key === "agent" || tab.key === "pipelines" || tab.key === "whatsapp") && !isAdmin

          return (
            <button
              key={tab.key}
              onClick={() => !isRestricted && setActive(tab.key)}
              disabled={isRestricted}
              className={`flex shrink-0 items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                isActive
                  ? "border-pf-accent text-pf-accent"
                  : isRestricted
                  ? "border-transparent text-pf-text-muted cursor-not-allowed opacity-40"
                  : "border-transparent text-pf-text-sec hover:text-pf-text"
              }`}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {active === "workspace" && (
          <WorkspaceTab
            workspace={workspace}
            onUpdate={handleWorkspaceNameUpdate}
          />
        )}
        {active === "members" && (
          <MembersTab
            workspace={workspace}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        )}
        {active === "plan" && (
          <PlanTab
            workspace={workspace}
            currentUserRole={currentUserRole}
            upgradeSuccess={upgradeSuccess}
          />
        )}
        {active === "agent" && (
          <AgentTab workspace={workspace} />
        )}
        {active === "pipelines" && (
          <PipelinesTab
            initialPipelines={initialPipelines}
            isPro={isPro}
            isAdmin={isAdmin}
          />
        )}
        {active === "whatsapp" && <WhatsAppQRTab />}
      </div>
    </div>
  )
}
