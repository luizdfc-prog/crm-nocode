"use client"

import { useState } from "react"
import type { CatalogQuiz } from "@/types"
import { CatalogQuiz as CatalogQuizComponent } from "./CatalogQuiz"

interface CatalogQuizWrapperProps {
  quiz: CatalogQuiz | null
  workspaceId: string
  accentColor: string
  whatsappNumber: string
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  children: React.ReactNode
}

export function CatalogQuizWrapper({
  quiz,
  workspaceId,
  accentColor,
  whatsappNumber,
  utmSource,
  utmMedium,
  utmCampaign,
  children,
}: CatalogQuizWrapperProps) {
  const sessionKey = `quiz_passed_${workspaceId}`
  const [passed, setPassed] = useState(() => {
    if (typeof window === "undefined") return false
    return sessionStorage.getItem(sessionKey) === "1"
  })

  function handlePass(capturedPhone?: string) {
    sessionStorage.setItem(sessionKey, "1")
    // Salva número capturado no localStorage para recuperação de carrinho
    if (capturedPhone) {
      try {
        localStorage.setItem(`quiz_phone_${workspaceId}`, capturedPhone)
      } catch { /* silencioso */ }
    }
    setPassed(true)
  }

  const showQuiz = quiz && quiz.enabled && quiz.questions.length > 0 && !passed

  return (
    <>
      {showQuiz && (
        <CatalogQuizComponent
          quiz={quiz}
          workspaceId={workspaceId}
          accentColor={accentColor}
          whatsappNumber={whatsappNumber}
          utmSource={utmSource}
          utmMedium={utmMedium}
          utmCampaign={utmCampaign}
          onPass={handlePass}
        />
      )}
      {children}
    </>
  )
}
