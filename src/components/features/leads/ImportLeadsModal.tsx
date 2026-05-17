"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { X, Upload, Download, CheckCircle2, XCircle, AlertCircle, FileSpreadsheet, Loader2, ChevronDown, ChevronRight } from "lucide-react"
import { importLeads, getPipelinesForImport } from "@/actions/leadsImport"
import type { ImportLeadRow, ImportRowResult, PipelineHint } from "@/actions/leadsImport"

interface ImportLeadsModalProps {
  isOpen: boolean
  onClose: () => void
  onImported: () => void
}

type Step = "upload" | "preview" | "result"

interface ParsedRow {
  rowNum: number
  data: ImportLeadRow
  hasError: boolean
  errorMsg?: string
}

// ── Template download ────────────────────────────────────────────────────────

function downloadTemplate() {
  const headers = ["Nome*", "Telefone", "Email", "Empresa", "Cargo", "Status", "Pipeline", "Etapa"]
  const example = ["João Silva", "11999998888", "joao@empresa.com", "Empresa XYZ", "Gerente", "novo", "Vendas", "Primeiro Contato"]
  const csv = [headers.join(","), example.join(",")].join("\n")
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "template_leads.csv"
  a.click()
  URL.revokeObjectURL(url)
}

// ── CSV / XLSX parser (client-side) ──────────────────────────────────────────

function parseCSV(text: string): ImportLeadRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const rawHeaders = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase())

  const colMap: Record<string, keyof ImportLeadRow> = {
    "nome*": "nome", nome: "nome",
    telefone: "telefone", "número de telefone": "telefone", "numero de telefone": "telefone", fone: "telefone", phone: "telefone",
    email: "email", "e-mail": "email",
    empresa: "empresa", company: "empresa",
    cargo: "cargo", role: "cargo",
    status: "status",
    pipeline: "pipeline",
    etapa: "etapa", coluna: "etapa", stage: "etapa",
  }

  const headers = rawHeaders.map((h) => colMap[h] ?? null)

  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
    const row: Record<string, string> = { nome: "" }
    headers.forEach((key, i) => {
      if (key && cells[i] !== undefined) {
        row[key] = cells[i]
      }
    })
    return row as unknown as ImportLeadRow
  }).filter((r) => r.nome.trim().length > 0)
}

async function parseXLSX(file: File): Promise<ImportLeadRow[]> {
  const XLSX = await import("xlsx")
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: "array" })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" })

  const colMap: Record<string, keyof ImportLeadRow> = {
    "nome*": "nome", nome: "nome", name: "nome",
    telefone: "telefone", "número de telefone": "telefone", "numero de telefone": "telefone", fone: "telefone", phone: "telefone",
    email: "email", "e-mail": "email",
    empresa: "empresa", company: "empresa",
    cargo: "cargo", role: "cargo",
    status: "status",
    pipeline: "pipeline",
    etapa: "etapa", coluna: "etapa", stage: "etapa",
  }

  return raw
    .map((r) => {
      const row: Record<string, string> = { nome: "" }
      for (const [rawKey, val] of Object.entries(r)) {
        const mapped = colMap[rawKey.toLowerCase().trim()]
        if (mapped) row[mapped] = String(val)
      }
      return row as unknown as ImportLeadRow
    })
    .filter((r) => r.nome.trim().length > 0)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ImportLeadsModal({ isOpen, onClose, onImported }: ImportLeadsModalProps) {
  const [step, setStep] = useState<Step>("upload")
  const [dragging, setDragging] = useState(false)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ total: number; created: number; errors: ImportRowResult[] } | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [pipelines, setPipelines] = useState<PipelineHint[]>([])
  const [expandedPipeline, setExpandedPipeline] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      getPipelinesForImport().then(setPipelines)
    }
  }, [isOpen])

  function reset() {
    setStep("upload")
    setParsedRows([])
    setImportResult(null)
    setParseError(null)
    setImporting(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function processFile(file: File) {
    setParseError(null)
    try {
      let rows: ImportLeadRow[]
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        rows = await parseXLSX(file)
      } else {
        const text = await file.text()
        rows = parseCSV(text)
      }

      if (rows.length === 0) {
        setParseError("Nenhuma linha válida encontrada. Verifique se o arquivo segue o template.")
        return
      }

      const parsed: ParsedRow[] = rows.map((row, i) => {
        const errors: string[] = []
        if (!row.nome || row.nome.trim().length < 2) errors.push("Nome inválido")
        return {
          rowNum: i + 2,
          data: row,
          hasError: errors.length > 0,
          errorMsg: errors[0],
        }
      })

      setParsedRows(parsed)
      setStep("preview")
    } catch {
      setParseError("Erro ao ler o arquivo. Use CSV ou XLSX seguindo o template.")
    }
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) await processFile(file)
  }, [])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await processFile(file)
    e.target.value = ""
  }

  async function handleImport() {
    const validRows = parsedRows.filter((r) => !r.hasError).map((r) => r.data)
    if (validRows.length === 0) return

    setImporting(true)
    try {
      const result = await importLeads(validRows)
      setImportResult({ total: result.total, created: result.created, errors: result.errors })
      setStep("result")
      onImported()
    } catch {
      setParseError("Erro ao importar. Tente novamente.")
    } finally {
      setImporting(false)
    }
  }

  if (!isOpen) return null

  const validCount = parsedRows.filter((r) => !r.hasError).length
  const invalidCount = parsedRows.filter((r) => r.hasError).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-[#2A2A2E] bg-[#141416] shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2A2A2E] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#CAFF33]/10">
              <FileSpreadsheet className="size-5 text-[#CAFF33]" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-base text-[#E8E8E8]">Importar Leads</h2>
              <p className="text-xs text-[#555559]">CSV ou XLSX seguindo o template</p>
            </div>
          </div>
          <button onClick={handleClose} className="flex size-8 items-center justify-center rounded-lg hover:bg-[#1A1A1E] text-[#555559] hover:text-[#E8E8E8] transition-colors">
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Step: upload */}
          {step === "upload" && (
            <div className="flex flex-col gap-5">
              {/* Download template */}
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-3 rounded-xl border border-[#2A2A2E] bg-[#1A1A1E] p-4 hover:border-[#CAFF33]/30 transition-colors text-left"
              >
                <Download className="size-4 text-[#CAFF33] shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#E8E8E8]">Baixar template CSV</p>
                  <p className="text-xs text-[#555559] mt-0.5">Preencha com seus leads e faça o upload abaixo</p>
                </div>
              </button>

              {/* Colunas */}
              <div className="rounded-xl border border-[#2A2A2E] bg-[#1A1A1E] p-4">
                <p className="text-xs font-semibold text-[#8A8A8F] uppercase tracking-widest mb-3">Colunas do template</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { col: "Nome*", desc: "Obrigatório" },
                    { col: "Telefone", desc: "Somente dígitos" },
                    { col: "Email", desc: "Opcional" },
                    { col: "Empresa", desc: "Opcional" },
                    { col: "Cargo", desc: "Opcional" },
                    { col: "Status", desc: "novo, contato, proposta..." },
                    { col: "Pipeline", desc: "Nome exato do pipeline" },
                    { col: "Etapa", desc: "Nome exato da etapa" },
                  ].map(({ col, desc }) => (
                    <div key={col} className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-[#CAFF33]">{col}</span>
                      <span className="text-xs text-[#555559]">— {desc}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#555559] mt-3">Se Pipeline e Etapa forem preenchidos, um card é criado automaticamente no pipeline.</p>
              </div>

              {/* Pipelines disponíveis */}
              {pipelines.length > 0 && (
                <div className="rounded-xl border border-[#2A2A2E] bg-[#1A1A1E] p-4">
                  <p className="text-xs font-semibold text-[#8A8A8F] uppercase tracking-widest mb-3">Pipelines disponíveis no CRM</p>
                  <div className="flex flex-col gap-1">
                    {pipelines.map((p) => (
                      <div key={p.id}>
                        <button
                          onClick={() => setExpandedPipeline(expandedPipeline === p.id ? null : p.id)}
                          className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left hover:bg-[#2A2A2E] transition-colors"
                        >
                          <span className="text-sm font-semibold text-[#CAFF33]">{p.name}</span>
                          {expandedPipeline === p.id
                            ? <ChevronDown className="size-3.5 text-[#555559] shrink-0" />
                            : <ChevronRight className="size-3.5 text-[#555559] shrink-0" />
                          }
                        </button>
                        {expandedPipeline === p.id && (
                          <div className="ml-3 mt-1 mb-1 flex flex-col gap-0.5 border-l border-[#2A2A2E] pl-3">
                            {p.stages.map((s) => (
                              <span key={s.id} className="text-xs text-[#8A8A8F] py-0.5">{s.name}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-[#555559] mt-3">Use os nomes <strong className="text-[#8A8A8F]">exatamente</strong> como aparecem acima nas colunas Pipeline e Etapa da planilha.</p>
                </div>
              )}

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors py-10"
                style={{ borderColor: dragging ? "#CAFF33" : "#2A2A2E", background: dragging ? "rgba(202,255,51,0.04)" : "#0C0C0E" }}
              >
                <Upload className="size-8" style={{ color: dragging ? "#CAFF33" : "#555559" }} />
                <div className="text-center">
                  <p className="text-sm font-medium text-[#E8E8E8]">Arraste o arquivo aqui ou clique para selecionar</p>
                  <p className="text-xs text-[#555559] mt-1">Suporte: .csv e .xlsx</p>
                </div>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
              </div>

              {parseError && (
                <div className="flex items-center gap-2 rounded-lg border border-[#FF4757]/30 bg-[#FF4757]/10 px-4 py-3 text-sm text-[#FF4757]">
                  <AlertCircle className="size-4 shrink-0" />
                  {parseError}
                </div>
              )}
            </div>
          )}

          {/* Step: preview */}
          {step === "preview" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold" style={{ background: "rgba(46,213,115,0.1)", color: "#2ED573" }}>
                  <CheckCircle2 className="size-3.5" />
                  {validCount} válido{validCount !== 1 ? "s" : ""}
                </div>
                {invalidCount > 0 && (
                  <div className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold" style={{ background: "rgba(255,71,87,0.1)", color: "#FF4757" }}>
                    <XCircle className="size-3.5" />
                    {invalidCount} com erro
                  </div>
                )}
                <span className="text-xs text-[#555559]">Linhas com erro serão ignoradas</span>
              </div>

              <div className="rounded-xl border border-[#2A2A2E] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#2A2A2E] bg-[#1A1A1E]">
                        {["Linha", "Nome", "Telefone", "Email", "Pipeline", "Etapa", ""].map((h) => (
                          <th key={h} className="px-3 py-2.5 text-left font-semibold text-[#8A8A8F] whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 100).map((row) => (
                        <tr
                          key={row.rowNum}
                          className="border-b border-[#2A2A2E] last:border-0"
                          style={{ background: row.hasError ? "rgba(255,71,87,0.04)" : undefined }}
                        >
                          <td className="px-3 py-2 text-[#555559]">{row.rowNum}</td>
                          <td className="px-3 py-2 text-[#E8E8E8] font-medium max-w-[140px] truncate">{row.data.nome}</td>
                          <td className="px-3 py-2 text-[#8A8A8F]">{row.data.telefone ?? "—"}</td>
                          <td className="px-3 py-2 text-[#8A8A8F] max-w-[120px] truncate">{row.data.email ?? "—"}</td>
                          <td className="px-3 py-2 text-[#8A8A8F]">{row.data.pipeline ?? "—"}</td>
                          <td className="px-3 py-2 text-[#8A8A8F]">{row.data.etapa ?? "—"}</td>
                          <td className="px-3 py-2">
                            {row.hasError
                              ? <span className="text-[#FF4757] flex items-center gap-1"><XCircle className="size-3" />{row.errorMsg}</span>
                              : <CheckCircle2 className="size-3.5 text-[#2ED573]" />
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedRows.length > 100 && (
                    <p className="px-3 py-2 text-xs text-[#555559] bg-[#1A1A1E]">
                      Mostrando 100 de {parsedRows.length} linhas. Todas serão importadas.
                    </p>
                  )}
                </div>
              </div>

              {parseError && (
                <div className="flex items-center gap-2 rounded-lg border border-[#FF4757]/30 bg-[#FF4757]/10 px-4 py-3 text-sm text-[#FF4757]">
                  <AlertCircle className="size-4 shrink-0" />
                  {parseError}
                </div>
              )}
            </div>
          )}

          {/* Step: result */}
          {step === "result" && importResult && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full" style={{ background: "rgba(46,213,115,0.12)" }}>
                  <CheckCircle2 className="size-8 text-[#2ED573]" />
                </div>
                <div>
                  <p className="font-heading font-bold text-lg text-[#E8E8E8]">Importação concluída</p>
                  <p className="text-sm text-[#555559] mt-1">
                    <span className="text-[#2ED573] font-semibold">{importResult.created}</span> de {importResult.total} leads criados com sucesso
                  </p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="rounded-xl border border-[#FF4757]/30 bg-[#FF4757]/05 overflow-hidden">
                  <p className="px-4 py-2.5 text-xs font-semibold text-[#FF4757] border-b border-[#FF4757]/20">
                    {importResult.errors.length} linha{importResult.errors.length !== 1 ? "s" : ""} com erro
                  </p>
                  <div className="max-h-40 overflow-y-auto">
                    {importResult.errors.map((e) => (
                      <div key={e.row} className="flex items-start gap-2 px-4 py-2 border-b border-[#FF4757]/10 last:border-0">
                        <XCircle className="size-3.5 text-[#FF4757] shrink-0 mt-0.5" />
                        <span className="text-xs text-[#8A8A8F]">
                          <span className="text-[#E8E8E8]">Linha {e.row} — {e.nome}:</span> {e.error}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-[#2A2A2E] shrink-0">
          {step === "upload" && (
            <button
              onClick={handleClose}
              className="rounded-lg border border-[#2A2A2E] bg-[#1A1A1E] px-4 py-2 text-sm font-medium text-[#E8E8E8] hover:bg-[#2A2A2E] transition-colors"
            >
              Cancelar
            </button>
          )}

          {step === "preview" && (
            <>
              <button
                onClick={() => { setStep("upload"); setParsedRows([]) }}
                disabled={importing}
                className="rounded-lg border border-[#2A2A2E] bg-[#1A1A1E] px-4 py-2 text-sm font-medium text-[#E8E8E8] hover:bg-[#2A2A2E] transition-colors disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "#CAFF33", color: "#0C0C0E" }}
              >
                {importing ? <><Loader2 className="size-4 animate-spin" />Importando...</> : <>Importar {validCount} lead{validCount !== 1 ? "s" : ""}</>}
              </button>
            </>
          )}

          {step === "result" && (
            <>
              <div />
              <button
                onClick={handleClose}
                className="rounded-lg px-5 py-2 text-sm font-semibold transition-opacity"
                style={{ backgroundColor: "#CAFF33", color: "#0C0C0E" }}
              >
                Fechar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
