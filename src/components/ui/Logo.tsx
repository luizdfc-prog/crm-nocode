import { cn } from "@/lib/utils"
import { brand } from "@/config/brand"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizes = {
  sm: { icon: 24, text: "text-[15px]" },
  md: { icon: 28, text: "text-[17px]" },
  lg: { icon: 32, text: "text-[19px]" },
}

export function Logo({ size = "md", className }: LogoProps) {
  const { icon, text } = sizes[size]

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoIcon size={icon} />
      <span
        className={cn("font-heading font-bold tracking-tight text-pf-text leading-none", text)}
      >
        {brand.name}
      </span>
    </div>
  )
}

export function LogoIcon({ size = 28, className, color = "#CAFF33" }: { size?: number; className?: string; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Z4P"
    >
      {/*
        Símbolo Z4P — 4 triângulos entrelaçados com barras centrais.
        Estrutura: triângulo sup-esq (aponta ↖), sup-dir (aponta ↗),
        inf-esq (aponta ↙), inf-dir (aponta ↘), unidos por barra horizontal central.
        Traço espesso, sem preenchimento (stroke-only), fiel ao original.
      */}
      <g stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
        {/* Barra horizontal central (une os dois lados) */}
        <line x1="10" y1="50" x2="90" y2="50" />

        {/* Triângulo superior-esquerdo — aponta para cima-esquerda */}
        <polyline points="44,50 44,18 12,50" />

        {/* Triângulo inferior-esquerdo — aponta para baixo-esquerda */}
        <polyline points="44,50 44,82 12,50" />

        {/* Triângulo superior-direito — aponta para cima-direita */}
        <polyline points="56,50 56,18 88,50" />

        {/* Triângulo inferior-direito — aponta para baixo-direita */}
        <polyline points="56,50 56,82 88,50" />
      </g>
    </svg>
  )
}
