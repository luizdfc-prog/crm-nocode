import { NextRequest, NextResponse } from "next/server"
import { getServiceClient } from "@/lib/supabase/service"
import { pickNextPipeline } from "@/lib/distributor-utils"
import type { DistributorConfig, WhatsAppAccount } from "@/types"

// Redireciona o CTA do catálogo para o WhatsApp certo
// Se o distribuidor estiver ativo, faz rodízio ponderado entre pipelines
// Caso contrário, usa o número configurado diretamente no catálogo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = getServiceClient()

  // Buscar workspace pelo slug do catálogo
  const { data: catalog } = await supabase
    .from("catalog_configs")
    .select("workspace_id, whatsapp_number, enabled")
    .eq("slug", slug)
    .single()

  if (!catalog || !catalog.enabled) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  const workspaceId = catalog.workspace_id

  // Buscar workspace — routing_config e routing_last_pipeline_id
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("routing_config, routing_last_pipeline_id")
    .eq("id", workspaceId)
    .single()

  const routingConfig = workspace?.routing_config as DistributorConfig | null

  // Verificar se o distribuidor está ativo
  if (routingConfig?.enabled && routingConfig.pipelines.length > 0) {
    // Buscar contas WhatsApp com pipeline vinculado
    const { data: accounts } = await supabase
      .from("whatsapp_accounts")
      .select("id, pipeline_id, phone_number, active_in_routing, status")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")

    const activeAccounts = (accounts ?? []) as WhatsAppAccount[]

    const nextPipelineId = pickNextPipeline(
      routingConfig,
      activeAccounts,
      workspace?.routing_last_pipeline_id ?? null
    )

    if (nextPipelineId) {
      // Encontrar o número de WhatsApp do pipeline sorteado
      const account = activeAccounts.find(
        (a) => a.pipeline_id === nextPipelineId && a.active_in_routing
      )

      if (account?.phone_number) {
        // Salvar qual pipeline foi usado (rodízio determinístico)
        await supabase
          .from("workspaces")
          .update({ routing_last_pipeline_id: nextPipelineId })
          .eq("id", workspaceId)

        // Preservar parâmetros de UTM e mensagem do link original
        const { searchParams } = new URL(request.url)
        const text = searchParams.get("text") ?? ""
        const phone = account.phone_number.replace(/\D/g, "")
        const waUrl = `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ""}`
        return NextResponse.redirect(waUrl)
      }
    }
  }

  // Fallback: usar número configurado no catálogo
  const phone = catalog.whatsapp_number.replace(/\D/g, "")
  const { searchParams } = new URL(request.url)
  const text = searchParams.get("text") ?? ""
  const waUrl = `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ""}`
  return NextResponse.redirect(waUrl)
}
