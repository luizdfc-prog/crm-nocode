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
  const [passed, setPassed] = useState(false)

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
          onPass={() => setPassed(true)}
        />
      )}
      {children}
    </>
  )
}
