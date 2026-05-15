"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, XCircle, Users, TrendingUp } from "lucide-react"
import { getCatalogQuizStats } from "@/actions/catalogQuiz"
import type { CatalogQuizStats } from "@/types"

const PERIOD_OPTIONS = [
  { label: "7 dias", value: 7 },
  { label: "30 dias", value: 30 },
  { label: "90 dias", value: 90 },
]

export function CatalogQuizWidget() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<CatalogQuizStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getCatalogQuizStats(days).then(stats => {
      setData(stats)
      setLoading(false)
    })
  }, [days])

  if (loading) {
    return (
      <div className="py-12 text-center text-[#555559] text-sm animate-pulse">
        Carregando dados do quiz...
      </div>
    )
  }

  if (!data || data.total_started === 0) {
    return (
      <div className="bg-[#141416] border border-[#2A2A2E] rounded-xl p-6 text-center">
        <p className="text-[#555559] text-sm">Nenhum dado de quiz no período.</p>
        <p className="text-[#555559] text-xs mt-1">O quiz precisa estar ativo no catálogo para registrar respostas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Cabeçalho + filtro */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-heading font-bold text-base text-[#E8E8E8]">Quiz de Qualificação</h3>
          <p className="text-xs text-[#555559] mt-0.5">Análise de pré-qualificação dos leads do catálogo</p>
        </div>
        <div className="flex gap-1">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
              style={days === opt.value
                ? { backgroundColor: "#CAFF33", color: "#0C0C0E" }
                : { backgroundColor: "#1A1A1E", color: "#8A8A8F" }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#141416] border border-[#2A2A2E] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-3.5 h-3.5 text-[#555559]" />
            <span className="text-xs text-[#555559]">Iniciaram</span>
          </div>
          <p className="font-heading font-bold text-2xl text-[#E8E8E8]">{data.total_started}</p>
        </div>
        <div className="bg-[#141416] border border-[#2A2A2E] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#2ED573]" />
            <span className="text-xs text-[#555559]">Qualificados</span>
          </div>
          <p className="font-heading font-bold text-2xl text-[#2ED573]">{data.total_passed}</p>
        </div>
        <div className="bg-[#141416] border border-[#2A2A2E] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-3.5 h-3.5 text-[#FF4757]" />
            <span className="text-xs text-[#555559]">Desqualificados</span>
          </div>
          <p className="font-heading font-bold text-2xl text-[#FF4757]">{data.total_failed}</p>
        </div>
        <div className="bg-[#141416] border border-[#2A2A2E] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-[#CAFF33]" />
            <span className="text-xs text-[#555559]">Taxa de qualif.</span>
          </div>
          <p className="font-heading font-bold text-2xl text-[#CAFF33]">{data.pass_rate}%</p>
        </div>
      </div>

      {/* Breakdown por pergunta */}
      {data.questions.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-[#8A8A8F] uppercase tracking-widest">
            Distribuição por pergunta
          </h4>
          {data.questions.map(q => (
            <div key={q.index} className="bg-[#141416] border border-[#2A2A2E] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 rounded-full bg-[#CAFF33]/10 border border-[#CAFF33]/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#CAFF33] text-xs font-mono font-bold">{q.index + 1}</span>
                </div>
                <p className="text-sm font-semibold text-[#E8E8E8]">{q.text}</p>
              </div>
              <div className="space-y-2.5">
                {q.answers.map(answer => (
                  <div key={answer.label} className="space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {answer.qualifies
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-[#2ED573] flex-shrink-0" />
                          : <XCircle className="w-3.5 h-3.5 text-[#FF4757] flex-shrink-0" />
                        }
                        <span className="text-sm text-[#E8E8E8] truncate">{answer.label}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-[#555559]">{answer.count}</span>
                        <span className="text-xs font-semibold text-[#E8E8E8] w-8 text-right">
                          {answer.percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-[#2A2A2E] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${answer.percentage}%`,
                          backgroundColor: answer.qualifies ? "#2ED573" : "#FF4757",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Nota orientativa */}
      <p className="text-xs text-[#555559] leading-relaxed">
        <strong className="text-[#8A8A8F]">Dica:</strong> Se a taxa de desqualificação for alta, verifique a segmentação das campanhas antes de ajustar o quiz. O problema pode estar em quem está sendo impactado pelo anúncio, não no produto.
      </p>
    </div>
  )
}
