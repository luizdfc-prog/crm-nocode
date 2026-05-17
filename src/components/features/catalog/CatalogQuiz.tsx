"use client"

import { useState, useEffect } from "react"
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
  onPass: () => void
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
  const [step, setStep] = useState<"quiz" | "disqualified">("quiz")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [animating, setAnimating] = useState(false)
  const [started, setStarted] = useState(false)

  const questions: CatalogQuizQuestion[] = quiz.questions ?? []
  const currentQuestion = questions[currentIndex]
  const progress = questions.length > 0 ? ((currentIndex) / questions.length) * 100 : 0

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
      onPass()
      return
    }

    setCurrentIndex(i => i + 1)
    setSelectedOption(null)
    setAnimating(false)
  }

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
                onClick={onPass}
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
                className="w-full py-4 px-5 rounded-xl border text-left font-semibold text-sm transition-all duration-200 disabled:opacity-60"
                style={{
                  backgroundColor: isSelected ? accentColor : "#141416",
                  borderColor: isSelected ? accentColor : "#2A2A2E",
                  color: isSelected ? "#0C0C0E" : "#E8E8E8",
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-[#555559] text-xs mt-6">
        Responda para continuar
      </p>
    </div>
  )
}
