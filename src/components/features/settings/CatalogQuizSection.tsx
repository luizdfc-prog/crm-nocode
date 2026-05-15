"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, GripVertical, CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react"
import { getCatalogQuiz, upsertCatalogQuiz } from "@/actions/catalogQuiz"
import type { CatalogQuizQuestion, CatalogQuizOption } from "@/types"
import { v4 as uuid } from "uuid"

function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(v => !v)}
        className="text-[var(--text-muted)] hover:text-[var(--text-sec)] transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-3 text-xs text-[var(--text-sec)] leading-relaxed z-50 shadow-xl">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--border)]" />
        </div>
      )}
    </div>
  )
}

function InfoBox({ type, children }: { type: "info" | "warning"; children: React.ReactNode }) {
  return (
    <div className={`flex gap-3 p-4 rounded-xl border text-sm leading-relaxed ${
      type === "warning"
        ? "bg-[var(--warm)]/8 border-[var(--warm)]/20 text-[var(--warm)]"
        : "border-[var(--border)] text-[var(--text-sec)]"
    }`}>
      {type === "warning"
        ? <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        : <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-[var(--cool)]" />
      }
      <span>{children}</span>
    </div>
  )
}

const emptyQuestion = (): CatalogQuizQuestion => ({
  id: uuid(),
  text: "",
  options: [
    { id: uuid(), label: "", qualifies: true },
    { id: uuid(), label: "", qualifies: false },
  ],
})

const inputClass = "rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] transition-colors"

export function CatalogQuizSection() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [enabled, setEnabled] = useState(false)
  const [questions, setQuestions] = useState<CatalogQuizQuestion[]>([emptyQuestion()])
  const [disqualifiedMessage, setDisqualifiedMessage] = useState(
    "Infelizmente não atendemos seu perfil no momento. Mas fique à vontade para entrar em contato!"
  )
  const [showContactAnyway, setShowContactAnyway] = useState(true)

  useEffect(() => {
    getCatalogQuiz().then(quiz => {
      if (quiz) {
        setEnabled(quiz.enabled)
        setQuestions(quiz.questions.length > 0 ? quiz.questions : [emptyQuestion()])
        setDisqualifiedMessage(quiz.disqualified_message)
        setShowContactAnyway(quiz.show_contact_anyway)
      }
      setLoading(false)
    })
  }, [])

  function addQuestion() {
    if (questions.length >= 3) return
    setQuestions(prev => [...prev, emptyQuestion()])
  }

  function removeQuestion(qid: string) {
    setQuestions(prev => prev.filter(q => q.id !== qid))
  }

  function updateQuestionText(qid: string, text: string) {
    setQuestions(prev => prev.map(q => q.id === qid ? { ...q, text } : q))
  }

  function addOption(qid: string) {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qid) return q
      return { ...q, options: [...q.options, { id: uuid(), label: "", qualifies: false }] }
    }))
  }

  function removeOption(qid: string, oid: string) {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qid) return q
      return { ...q, options: q.options.filter(o => o.id !== oid) }
    }))
  }

  function updateOption(qid: string, oid: string, patch: Partial<CatalogQuizOption>) {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qid) return q
      return { ...q, options: q.options.map(o => o.id === oid ? { ...o, ...patch } : o) }
    }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const result = await upsertCatalogQuiz({
      enabled,
      questions,
      disqualified_message: disqualifiedMessage,
      show_contact_anyway: showContactAnyway,
    })
    setSaving(false)
    if (!result.success) {
      setError(result.error ?? "Erro ao salvar")
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-[var(--text-muted)] text-sm">Carregando...</div>
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Toggle ativo/inativo */}
      <div className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] px-4 py-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-medium text-[var(--text)]">Quiz de Qualificação</p>
            <Tooltip text="Quando ativo, o lead responde perguntas antes de ver o catálogo. Leads que não se qualificam não chegam ao vendedor — mas todas as respostas ficam registradas no dashboard para análise de campanha." />
          </div>
          <p className="text-xs text-[var(--text-muted)]">Pré-qualifique leads antes de abrirem o catálogo</p>
        </div>
        <button
          type="button"
          onClick={() => setEnabled(v => !v)}
          className="w-11 h-6 rounded-full relative transition-colors shrink-0 mt-0.5"
          style={{ backgroundColor: enabled ? "#2ED573" : "var(--surface-2)", border: "1px solid var(--border)" }}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
            style={{ left: enabled ? "calc(100% - 22px)" : "2px" }}
          />
        </button>
      </div>

      {/* Caixas de orientação — sempre visíveis */}
      <InfoBox type="info">
        <strong className="block text-[var(--text)] mb-1">Como funciona</strong>
        Ao clicar no link do catálogo, o lead vê uma pergunta por vez antes de acessar os produtos.
        Se escolher uma opção marcada como <span className="text-[var(--negative)] font-medium">Não qualifica</span>, recebe
        uma mensagem gentil e não avança. Se escolher apenas opções <span className="text-[var(--positive)] font-medium">Qualifica</span>, o catálogo abre normalmente.
      </InfoBox>

      <InfoBox type="warning">
        <div>
          <strong className="block mb-2">Cuidados importantes ao usar o Quiz</strong>
          <ul className="space-y-1.5 list-none text-[var(--text-sec)]">
            <li>• <strong className="text-[var(--warm)]">Não use para eliminar — use para entender.</strong> Leads fora do perfil mostram onde sua campanha está errando a segmentação.</li>
            <li>• <strong className="text-[var(--warm)]">Sempre deixe "Mesmo assim, fale conosco" ativo.</strong> Um lead desqualificado pode ser uma exceção ou oportunidade que o quiz não capturou.</li>
            <li>• <strong className="text-[var(--warm)]">Perguntas objetivas, sem julgamento.</strong> Prefira "Qual seu objetivo?" a "Qual seu orçamento?".</li>
            <li>• <strong className="text-[var(--warm)]">Máximo de 3 perguntas.</strong> Cada pergunta adicional reduz a taxa de conclusão.</li>
            <li>• <strong className="text-[var(--warm)]">Revise o dashboard regularmente.</strong> Taxa de desqualificação alta pode indicar problema na segmentação, não no produto.</li>
          </ul>
        </div>
      </InfoBox>

      {enabled && (
        <div className="flex flex-col gap-5">

          {/* Perguntas */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--text)]">Perguntas</span>
                <Tooltip text="Crie até 3 perguntas em sequência. O lead responde uma por vez. Coloque a pergunta mais eliminatória primeiro para economizar cliques." />
              </div>
              <span className="text-xs text-[var(--text-muted)] font-mono">{questions.length}/3</span>
            </div>

            {questions.map((q, qIdx) => (
              <div key={q.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 flex flex-col gap-4">
                {/* Header da pergunta */}
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-[var(--accent)] text-xs font-mono font-bold">{qIdx + 1}</span>
                  </div>
                  <input
                    value={q.text}
                    onChange={e => updateQuestionText(q.id, e.target.value)}
                    placeholder="Ex: Qual sua cidade?"
                    className={`flex-1 ${inputClass}`}
                  />
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(q.id)}
                      className="text-[var(--text-muted)] hover:text-[var(--negative)] transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Opções */}
                <div className="flex flex-col gap-2 pl-9">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-[var(--text-muted)]">Opções de resposta</span>
                    <Tooltip text="Marque cada opção como 'Qualifica' (lead avança) ou 'Não qualifica' (lead é bloqueado). Toda pergunta precisa de pelo menos uma opção que qualifica." />
                  </div>

                  {q.options.map(opt => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <GripVertical className="w-3.5 h-3.5 text-[var(--border)] flex-shrink-0" />
                      <input
                        value={opt.label}
                        onChange={e => updateOption(q.id, opt.id, { label: e.target.value })}
                        placeholder="Texto da opção"
                        className={`flex-1 ${inputClass} text-xs py-1.5`}
                      />
                      <button
                        type="button"
                        onClick={() => updateOption(q.id, opt.id, { qualifies: !opt.qualifies })}
                        className="flex items-center gap-1.5 text-xs font-medium flex-shrink-0 px-2 py-1 rounded-lg border transition-colors whitespace-nowrap"
                        style={opt.qualifies
                          ? { color: "#2ED573", borderColor: "rgba(46,213,115,0.3)", backgroundColor: "rgba(46,213,115,0.08)" }
                          : { color: "#FF4757", borderColor: "rgba(255,71,87,0.3)", backgroundColor: "rgba(255,71,87,0.08)" }
                        }
                        title={opt.qualifies ? "Clique para marcar como Não qualifica" : "Clique para marcar como Qualifica"}
                      >
                        {opt.qualifies
                          ? <><CheckCircle2 className="w-3.5 h-3.5" /> Qualifica</>
                          : <><XCircle className="w-3.5 h-3.5" /> Não qualifica</>
                        }
                      </button>
                      {q.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(q.id, opt.id)}
                          className="text-[var(--text-muted)] hover:text-[var(--negative)] transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {q.options.length < 6 && (
                    <button
                      type="button"
                      onClick={() => addOption(q.id)}
                      className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar opção
                    </button>
                  )}
                </div>
              </div>
            ))}

            {questions.length < 3 && (
              <button
                type="button"
                onClick={addQuestion}
                className="w-full py-3 border border-dashed border-[var(--border)] rounded-xl text-sm text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Adicionar pergunta
              </button>
            )}
          </div>

          {/* Mensagem de desqualificação */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-[var(--text-sec)]">Mensagem para lead não qualificado</label>
              <Tooltip text="Esta mensagem aparece quando o lead escolhe uma opção 'Não qualifica'. Seja gentil — uma boa mensagem preserva a reputação da marca mesmo com quem não é seu cliente." />
            </div>
            <textarea
              value={disqualifiedMessage}
              onChange={e => setDisqualifiedMessage(e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Infelizmente não atendemos seu perfil no momento..."
            />
            <p className="text-xs text-[var(--text-muted)]">
              Dica: evite frases que soem como rejeição. Prefira "no momento" ou "nesta região".
            </p>
          </div>

          {/* Toggle — botão de contato mesmo assim */}
          <div className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] px-4 py-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-medium text-[var(--text)]">Mostrar "Mesmo assim, fale conosco"</p>
                <Tooltip text="Recomendado manter ativo. Um lead desqualificado pode ser uma exceção, uma indicação, ou alguém que respondeu errado sem querer. Não desperdice esse contato." />
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Exibe um botão de WhatsApp mesmo para leads não qualificados
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowContactAnyway(v => !v)}
              className="w-11 h-6 rounded-full relative transition-colors shrink-0 mt-0.5"
              style={{ backgroundColor: showContactAnyway ? "#2ED573" : "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{ left: showContactAnyway ? "calc(100% - 22px)" : "2px" }}
              />
            </button>
          </div>

        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="bg-[var(--negative)]/10 border border-[var(--negative)]/20 rounded-xl px-4 py-3 text-sm text-[var(--negative)]">
          {error}
        </div>
      )}

      {/* Salvar */}
      <div
        className="sticky bottom-0 z-20 flex items-center justify-between gap-3 rounded-xl px-4 py-3"
        style={{ background: "#1A1A1E", border: "1px solid var(--accent)", boxShadow: "0 -4px 24px rgba(0,0,0,0.5)" }}
      >
        <span className="text-sm text-[var(--text-sec)]">
          {saved ? "✓ Quiz salvo com sucesso" : "Salve para aplicar as alterações"}
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: "var(--accent)" }}
        >
          {saving ? "Salvando..." : "Salvar Quiz"}
        </button>
      </div>

    </div>
  )
}
