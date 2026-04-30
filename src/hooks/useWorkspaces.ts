"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WorkspaceRow } from '@/types/supabase'

interface UseWorkspacesReturn {
  workspaces: WorkspaceRow[]
  activeWorkspace: WorkspaceRow | null
  setActiveWorkspaceId: (id: string) => void
  loading: boolean
}

export function useWorkspaces(): UseWorkspacesReturn {
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('workspaces')
        .select(`
          id, name, plan, stripe_customer_id, stripe_subscription_id, created_at,
          workspace_members!inner(profile_id)
        `)
        .eq('workspace_members.profile_id', user.id)
        .order('created_at', { ascending: true })

      if (data && data.length > 0) {
        // Remove o join aninhado — queremos só as colunas de workspaces
        const rows = data.map((item) => ({
          id: item.id,
          name: item.name,
          plan: item.plan,
          stripe_customer_id: item.stripe_customer_id,
          stripe_subscription_id: item.stripe_subscription_id,
          created_at: item.created_at,
        })) as WorkspaceRow[]
        setWorkspaces(rows)
        setActiveWorkspaceId((prev) => prev ?? rows[0].id)
      }

      setLoading(false)
    }

    load()
  }, [])

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? null

  return { workspaces, activeWorkspace, setActiveWorkspaceId, loading }
}
