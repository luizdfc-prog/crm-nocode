"use client"

import { useState, useEffect, useRef } from "react"
import type { CatalogQuiz, CatalogQuizQuestion } from "@/types"
import { recordQuizEvent } from "@/actions/catalogQuiz"

interface CatalogQuizProps {
  quiz: CatalogQuiz
  workspaceId: string
  accentColor: string
  whatsappNumber: string
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  onPass: (capturedPhone?: string) => void
}

export function CatalogQuiz({
  quiz,
  workspaceId,
  accentColor,
  whatsappNumber,
  utmSource,
  utmMedium,
  utmCampaign,
  onPass,
}: CatalogQuizProps) {
  const [step, setStep] = useState<"quiz" | "disqualified" | "whatsapp">("quiz")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [animating, setAnimating] = useState(false)
  const [started, setStarted] = useState(false)
  const [phone, setPhone] = useState("")
  const [savingPhone, setSavingPhone] = useState(false)
  const [phoneError, setPhoneError] = useState(false)
  const abandonedRef = useRef(false)
  const stepRef = useRef<"quiz" | "disqualified" | "whatsapp">("quiz")
  const currentIndexRef = useRef(0)

  const questions: CatalogQuizQuestion[] = quiz.questions ?? []
  const currentQuestion = questions[currentIndex]
  const progress = questions.length > 0 ? ((currentIndex) / questions.length) * 100 : 0

  // Mantém refs sincronizadas para uso no visibilitychange
  useEffect(() => { stepRef.current = step }, [step])
  useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])

  useEffect(() => {
    if (!started) {
      setStarted(true)
      recordQuizEvent({
        workspace_id: workspaceId,
        event_type: "quiz_start",
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      })
    }
  }, [started, workspaceId, utmSource, utmMedium, utmCampaign])

  // Detecta abandono quando o usuário sai da aba antes de terminar
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden" && !abandonedRef.current) {
        const s = stepRef.current
        if (s === "quiz") {
          abandonedRef.current = true
          recordQuizEvent({
            workspace_id: workspaceId,
            event_type: "quiz_abandon",
            quiz_question_index: currentIndexRef.current,
            utm_source: utmSource,
            utm_medium: utmMedium,
            utm_campaign: utmCampaign,
          })
        }
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [workspaceId, utmSource, utmMedium, utmCampaign])

  async function handleAnswer(option: CatalogQuizQuestion["options"][0]) {
    if (animating) return
    setSelectedOption(option.id)
    setAnimating(true)

    await recordQuizEvent({
      workspace_id: workspaceId,
      event_type: "quiz_answer",
      quiz_question_index: currentIndex,
      quiz_question_text: currentQuestion.text,
      quiz_answer_label: option.label,
      quiz_passed: option.qualifies,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
    })

    await new Promise(r => setTimeout(r, 500))

    if (!option.qualifies) {
      await recordQuizEvent({
        workspace_id: workspaceId,
        event_type: "quiz_fail",
        quiz_answer_label: option.label,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      })
      setStep("disqualified")
      setAnimating(false)
      return
    }

    const isLast = currentIndex === questions.length - 1
    if (isLast) {
      await recordQuizEvent({
        workspace_id: workspaceId,
        event_type: "quiz_pass",
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      })
      // Se captura de WhatsApp está ativa, vai para essa etapa
      if (quiz.capture_whatsapp) {
        setStep("whatsapp")
        setAnimating(false)
        return
      }
      onPass()
      return
    }

    setCurrentIndex(i => i + 1)
    setSelectedOption(null)
    setAnimating(false)
  }

  async function handleWhatsappSubmit() {
    const cleaned = phone.replace(/\D/g, "")
    if (cleaned.length < 10) {
      setPhoneError(true)
      return
    }
    setPhoneError(false)
    setSavingPhone(true)
    await recordQuizEvent({
      workspace_id: workspaceId,
      event_type: "quiz_whatsapp_captured",
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
    })
    setSavingPhone(false)
    onPass(cleaned)
  }

  function handleSkipWhatsapp() {
    onPass(undefined)
  }

  // ── Tela desqualificado ──────────────────────────────────────
  if (step === "disqualified") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0C0C0E] px-6">
        <div className="max-w-sm w-full text-center">
          <div className="text-5xl mb-6">😔</div>
          <p className="text-[#E8E8E8] text-lg font-heading font-bold mb-3 leading-snug">
            {quiz.disqualified_message}
          </p>
          {quiz.show_contact_anyway && (
            <div className="mt-8 space-y-3">
              <p className="text-[#8A8A8F] text-sm">
                Mesmo assim, você pode explorar nosso catálogo.
              </p>
              <button
                onClick={() => onPass()}
                className="block w-full py-3 px-6 rounded-xl font-semibold text-sm text-[#0C0C0E] transition-opacity hover:opacity-90"
                style={{ backgroundColor: accentColor }}
              >
                Ir para o catálogo mesmo assim
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Tela de captura de WhatsApp ──────────────────────────────
  if (step === "whatsapp") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0C0C0E] px-6">
        <div className="max-w-sm w-full">
          {/* Ícone */}
          <div className="mb-6 flex justify-center">
            <div className="flex size-16 items-center justify-center rounded-2xl" style={{ background: "rgba(46,213,115,0.12)", border: "1px solid rgba(46,213,115,0.25)" }}>
              <svg viewBox="0 0 24 24" className="size-8 fill-current" style={{ color: "#2ED573" }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
          </div>

          <h2 className="font-heading font-bold text-2xl text-[#E8E8E8] text-center mb-2 leading-snug">
            Ótimo! Você está qualificado 🎉
          </h2>
          <p className="text-[#8A8A8F] text-sm text-center mb-8 leading-relaxed">
            Para uma experiência ainda melhor, informe seu WhatsApp — assim podemos te avisar sobre novidades e itens que você deixou no catálogo.
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <input
                type="tel"
                value={phone}
                onChange={e => { setPhone(e.target.value); setPhoneError(false) }}
                placeholder="(11) 99999-9999"
                className="w-full rounded-xl border px-4 py-3.5 text-sm text-[#E8E8E8] outline-none transition-colors placeholder:text-[#555559]"
                style={{ background: "#141416", borderColor: phoneError ? "#FF4757" : phone.replace(/\D/g, "").length >= 10 ? "#2ED573" : "#2A2A2E" }}
                autoFocus
              />
              {phoneError && (
                <p className="text-xs text-[#FF4757] px-1">Informe um número válido com DDD ou clique em "Pular".</p>
              )}
            </div>

            <button
              onClick={handleWhatsappSubmit}
              disabled={savingPhone}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#2ED573", color: "#0C0C0E" }}
            >
              {savingPhone ? "Acessando..." : "Acessar o catálogo"}
            </button>

            <button
              onClick={handleSkipWhatsapp}
              className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ color: "#555559" }}
            >
              Pular, acessar sem informar
            </button>
          </div>

          <p className="mt-4 text-center text-[10px] text-[#555559] leading-relaxed">
            Seu número não será compartilhado com terceiros. Você pode ignorar, nada muda no acesso ao catálogo.
          </p>
        </div>
      </div>
    )
  }

  // ── Tela do quiz ─────────────────────────────────────────────
  if (!currentQuestion) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0C0C0E] px-6 py-8">
      {/* Barra de progresso */}
      <div className="w-full h-1 bg-[#2A2A2E] rounded-full mb-8 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: accentColor }}
        />
      </div>

      {/* Contador */}
      <p className="text-[#555559] text-xs font-mono text-center mb-2">
        {currentIndex + 1} de {questions.length}
      </p>

      {/* Pergunta */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <h2 className="font-heading font-bold text-2xl md:text-3xl text-[#E8E8E8] text-center mb-10 leading-snug max-w-sm">
          {currentQuestion.text}
        </h2>

        {/* Opções */}
        <div className="w-full max-w-sm space-y-3">
          {currentQuestion.options.map(option => {
            const isSelected = selectedOption === option.id
            return (
              <button
                key={option.id}
                onClick={() => handleAnswer(option)}
                disabled={animating}
                className="w-full py-4 px-5 rounded-xl border text-left font-semibold text-sm transition-all duration-200 disabled:opacity-60 flex items-center justify-between gap-2"
                style={{
                  backgroundColor: isSelected ? accentColor : "#141416",
                  borderColor: isSelected ? accentColor : "#2A2A2E",
                  color: isSelected ? "#0C0C0E" : "#E8E8E8",
                }}
              >
                <span>{option.label}</span>
                {isSelected && animating && (
                  <span className="text-xs font-medium opacity-80 shrink-0">Aguarde...</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-[#555559] text-xs mt-6">
        {animating ? "Aguarde..." : "Responda para continuar"}
      </p>
    </div>
  )
}
