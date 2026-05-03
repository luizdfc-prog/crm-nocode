"use client"

import { useState } from "react"
import { Building2, Users, CreditCard } from "lucide-react"
import { WorkspaceTab } from "./WorkspaceTab"
import { MembersTab } from "./MembersTab"
import { PlanTab } from "./PlanTab"
import type { WorkspaceRow } from "@/types/supabase"

type TabKey = "workspace" | "members" | "plan"

interface TabDef {
  key: TabKey
  label: string
  icon: "building" | "users" | "credit-card"
}

interface SettingsTabsProps {
  workspace: WorkspaceRow
  currentUserId: string
  currentUserRole: "admin" | "member"
  initialTab: TabKey
  tabs: TabDef[]
  upgradeSuccess?: boolean
}

const ICONS: Record<TabDef["icon"], React.ElementType> = {
  building: Building2,
  users: Users,
  "credit-card": CreditCard,
}

export function SettingsTabs({
  workspace: initialWorkspace,
  currentUserId,
  currentUserRole,
  initialTab,
  tabs,
  upgradeSuccess,
}: SettingsTabsProps) {
  const [active, setActive] = useState<TabKey>(initialTab)
  const [workspace, setWorkspace] = useState(initialWorkspace)

  const isAdmin = currentUserRole === "admin"

  function handleWorkspaceNameUpdate(name: string) {
    setWorkspace((prev) => ({ ...prev, name }))
  }

  return (
    <div className="flex flex-col gap-0 rounded-2xl border border-pf-border bg-pf-surface overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-pf-border">
        {tabs.map((tab) => {
          const Icon = ICONS[tab.icon]
          const isActive = active === tab.key
          // Membros e Workspace — apenas admins
          const isRestricted =
            (tab.key === "workspace" || tab.key === "members") && !isAdmin

          return (
            <button
              key={tab.key}
              onClick={() => !isRestricted && setActive(tab.key)}
              disabled={isRestricted}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
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
      </div>
    </div>
  )
}
