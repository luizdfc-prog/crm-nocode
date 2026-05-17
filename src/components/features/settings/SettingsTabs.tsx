"use client"

import { useState } from "react"
import { Building2, Users, CreditCard, Bot, GitBranch, MessageCircle, ListFilter, Bell, ShoppingBag, RefreshCcw } from "lucide-react"
import { WorkspaceTab } from "./WorkspaceTab"
import { MembersTab } from "./MembersTab"
import { PlanTab } from "./PlanTab"
import { AgentTab } from "./AgentTab"
import { FollowUpTab } from "./FollowUpTab"
import { PipelinesTab } from "./PipelinesTab"
import { WhatsAppMetaTab } from "./WhatsAppMetaTab"
import { CustomFieldsTab } from "./CustomFieldsTab"
import { CatalogTab } from "./CatalogTab"
import { RecuperadorTab } from "./RecuperadorTab"
import type { WorkspaceRow } from "@/types/supabase"
import type { Pipeline, LeadFieldDefinition, FollowUpConfig, RoutingConfig } from "@/types"

type TabKey = "workspace" | "members" | "plan" | "agent" | "followup" | "pipelines" | "whatsapp" | "fields" | "catalog" | "recuperador"

interface TabDef {
  key: TabKey
  label: string
  icon: "building" | "users" | "credit-card" | "bot" | "bell" | "git-branch" | "message-circle" | "list-filter" | "shopping-bag" | "refresh-ccw"
}

interface SettingsTabsProps {
  workspace: WorkspaceRow
  currentUserId: string
  currentUserRole: "admin" | "member"
  initialTab: TabKey
  tabs: TabDef[]
  upgradeSuccess?: boolean
  initialPipelines?: Pipeline[]
  initialCustomFields?: LeadFieldDefinition[]
  initialFollowUpConfig?: FollowUpConfig
  initialRoutingConfig?: RoutingConfig
}

const ICONS: Record<TabDef["icon"], React.ElementType> = {
  building: Building2,
  users: Users,
  "credit-card": CreditCard,
  bot: Bot,
  bell: Bell,
  "git-branch": GitBranch,
  "message-circle": MessageCircle,
  "list-filter": ListFilter,
  "shopping-bag": ShoppingBag,
  "refresh-ccw": RefreshCcw,
}

const DEFAULT_FOLLOW_UP: FollowUpConfig = {
  silence_hours: 2,
  steps: [
    { stage: "Follow-up 01", enabled: true,  delay_hours: 4,  message: "Olá! Tudo bem? Ainda posso te ajudar? 😊" },
    { stage: "Follow-up 02", enabled: true,  delay_hours: 8,  message: "Ei, percebi que você não respondeu ainda. Fico por aqui! 👋" },
    { stage: "Follow-up 03", enabled: false, delay_hours: 24, message: "" },
    { stage: "Follow-up 04", enabled: false, delay_hours: 48, message: "" },
    { stage: "Follow-up 05", enabled: false, delay_hours: 72, message: "" },
  ],
}

export function SettingsTabs({
  workspace: initialWorkspace,
  currentUserId,
  currentUserRole,
  initialTab,
  tabs,
  upgradeSuccess,
  initialPipelines = [],
  initialCustomFields = [],
  initialFollowUpConfig = DEFAULT_FOLLOW_UP,
  initialRoutingConfig,
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
            (tab.key === "workspace" || tab.key === "members" || tab.key === "agent" || tab.key === "followup" || tab.key === "pipelines" || tab.key === "whatsapp" || tab.key === "fields" || tab.key === "catalog") && !isAdmin

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
            pipelines={initialPipelines}
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
          <AgentTab
            workspace={workspace}
            salesPipelines={initialPipelines.filter((p) => p.type !== "agent")}
            initialRoutingConfig={initialRoutingConfig}
          />
        )}
        {active === "followup" && (
          <FollowUpTab initialConfig={initialFollowUpConfig} />
        )}
        {active === "pipelines" && (
          <PipelinesTab
            initialPipelines={initialPipelines}
            isPro={isPro}
            isAdmin={isAdmin}
          />
        )}
        {active === "whatsapp" && <WhatsAppMetaTab />}
        {active === "fields" && (
          <CustomFieldsTab
            initialFields={initialCustomFields}
            isAdmin={isAdmin}
            pipelines={initialPipelines}
          />
        )}
        {active === "catalog" && <CatalogTab />}
        {active === "recuperador" && <RecuperadorTab />}
      </div>
    </div>
  )
}
