"use server"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = { from: (table: string) => any; auth: any }

import { createClient } from "@/lib/supabase/server"
import type { CatalogQuiz, CatalogQuizQuestion, CatalogQuizStats, CatalogEventType } from "@/types"
import { v4 as uuid } from "uuid"

// ── Helpers ──────────────────────────────────────────────────

async function getAdminContext() {
  const supabase = (await createClient()) as unknown as AnyClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  if (!membership || membership.role !== "admin") return null
  return { supabase, workspace_id: membership.workspace_id }
}

async function getWorkspaceId(): Promise<string | null> {
  const supabase = (await createClient()) as unknown as AnyClient
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single()
  return data?.workspace_id ?? null
}

// ── CRUD do Quiz ─────────────────────────────────────────────

export async function getCatalogQuiz(): Promise<CatalogQuiz | null> {
  const workspace_id = await getWorkspaceId()
  if (!workspace_id) return null

  const supabase = (await createClient()) as unknown as AnyClient
  const { data } = await supabase
    .from("catalog_quiz")
    .select("*")
    .eq("workspace_id", workspace_id)
    .maybeSingle()

  return (data as CatalogQuiz | null) ?? null
}

export async function upsertCatalogQuiz(input: {
  enabled: boolean
  questions: CatalogQuizQuestion[]
  disqualified_message: string
  show_contact_anyway: boolean
}): Promise<{ success: boolean; error?: string }> {
  const ctx = await getAdminContext()
  if (!ctx) return { success: false, error: "Sem permissão" }

  if (input.questions.length > 3) {
    return { success: false, error: "Máximo de 3 perguntas permitidas" }
  }

  for (const q of input.questions) {
    if (!q.text.trim()) return { success: false, error: "Todas as perguntas precisam ter texto" }
    if (q.options.length < 2) return { success: false, error: "Cada pergunta precisa de pelo menos 2 opções" }
    const hasQualifying = q.options.some(o => o.qualifies)
    if (!hasQualifying) return { success: false, error: `A pergunta "${q.text}" precisa de pelo menos uma opção que qualifica` }
  }

  // Garante IDs em todas as perguntas e opções
  const questions = input.questions.map(q => ({
    ...q,
    id: q.id || uuid(),
    options: q.options.map(o => ({ ...o, id: o.id || uuid() })),
  }))

  const { error } = await ctx.supabase
    .from("catalog_quiz")
    .upsert({
      workspace_id: ctx.workspace_id,
      enabled: input.enabled,
      questions,
      disqualified_message: input.disqualified_message,
      show_contact_anyway: input.show_contact_anyway,
      updated_at: new Date().toISOString(),
    }, { onConflict: "workspace_id" })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ── Registro de eventos do quiz (público, sem auth) ──────────

export async function recordQuizEvent(input: {
  workspace_id: string
  event_type: CatalogEventType
  quiz_question_index?: number | null
  quiz_question_text?: string | null
  quiz_answer_label?: string | null
  quiz_passed?: boolean | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
}): Promise<void> {
  try {
    const supabase = (await createClient()) as unknown as AnyClient
    await supabase.from("catalog_events").insert(input)
  } catch {
    // silencioso — nunca bloquear o catálogo por falha de tracking
  }
}

// ── Estatísticas do Quiz ──────────────────────────────────────

export async function getCatalogQuizStats(days = 30): Promise<CatalogQuizStats | null> {
  const workspace_id = await getWorkspaceId()
  if (!workspace_id) return null

  const supabase = (await createClient()) as unknown as AnyClient
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data: events } = await supabase
    .from("catalog_events")
    .select("event_type, quiz_question_index, quiz_question_text, quiz_answer_label, quiz_passed")
    .eq("workspace_id", workspace_id)
    .in("event_type", ["quiz_start", "quiz_answer", "quiz_pass", "quiz_fail"])
    .gte("created_at", since)

  if (!events || events.length === 0) {
    return { total_started: 0, total_passed: 0, total_failed: 0, pass_rate: 0, questions: [] }
  }

  const total_started = events.filter((e: { event_type: string }) => e.event_type === "quiz_start").length
  const total_passed = events.filter((e: { event_type: string }) => e.event_type === "quiz_pass").length
  const total_failed = events.filter((e: { event_type: string }) => e.event_type === "quiz_fail").length
  const pass_rate = total_started > 0 ? Math.round((total_passed / total_started) * 100) : 0

  // Agrupa respostas por pergunta
  const answerEvents = events.filter((e: { event_type: string }) => e.event_type === "quiz_answer")
  const questionMap = new Map<number, { text: string; answers: Map<string, { count: number; qualifies: boolean }> }>()

  for (const e of answerEvents) {
    const idx = e.quiz_question_index ?? 0
    if (!questionMap.has(idx)) {
      questionMap.set(idx, { text: e.quiz_question_text ?? `Pergunta ${idx + 1}`, answers: new Map() })
    }
    const q = questionMap.get(idx)!
    const label = e.quiz_answer_label ?? "?"
    if (!q.answers.has(label)) {
      q.answers.set(label, { count: 0, qualifies: e.quiz_passed ?? false })
    }
    q.answers.get(label)!.count++
  }

  const questions = Array.from(questionMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([index, q]) => {
      const total = Array.from(q.answers.values()).reduce((s, a) => s + a.count, 0)
      return {
        index,
        text: q.text,
        answers: Array.from(q.answers.entries())
          .map(([label, data]) => ({
            label,
            count: data.count,
            qualifies: data.qualifies,
            percentage: total > 0 ? Math.round((data.count / total) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count),
      }
    })

  return { total_started, total_passed, total_failed, pass_rate, questions }
}
