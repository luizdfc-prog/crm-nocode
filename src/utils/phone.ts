/**
 * Formata número de telefone do WhatsApp para exibição.
 * Entrada: "5511999998888" ou "55119999888" ou já com "+"
 * Saída: "+55 (11) 99999-8888" ou "+55 (11) 9999-8888"
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "—"

  // Remove tudo que não é dígito
  const digits = raw.replace(/\D/g, "")

  // Brasil: começa com 55 + DDD (2 dígitos) + número (8 ou 9 dígitos) = 12 ou 13 dígitos
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    const ddd = digits.slice(2, 4)
    const number = digits.slice(4)
    if (number.length === 9) {
      // Celular: 9 dígitos — 9 9999-9999
      return `+55 (${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`
    } else {
      // Fixo: 8 dígitos — 9999-9999
      return `+55 (${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`
    }
  }

  // Internacional genérico — adiciona "+" se não tiver
  return digits.startsWith("55") || digits.length > 11
    ? `+${digits}`
    : `+55 ${digits}`
}
