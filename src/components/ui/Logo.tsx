import { cn } from "@/lib/utils"

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
        Z4P
      </span>
    </div>
  )
}

export function LogoIcon({ size = 28, className }: { size?: number; className?: string }) {
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
      {/* Símbolo geométrico Z4P — quatro setas/triângulos entrelaçados */}
      {/* Triângulo superior-esquerdo (apontando para cima-esquerda) */}
      <path
        d="M50 10 L22 38 L38 38 L38 50 L10 50 L10 22 Z"
        fill="#CAFF33"
      />
      {/* Triângulo superior-direito (apontando para cima-direita) */}
      <path
        d="M50 10 L78 38 L62 38 L62 50 L90 50 L90 22 Z"
        fill="#CAFF33"
        opacity="0.7"
      />
      {/* Triângulo inferior-esquerdo (apontando para baixo-esquerda) */}
      <path
        d="M50 90 L22 62 L38 62 L38 50 L10 50 L10 78 Z"
        fill="#CAFF33"
        opacity="0.7"
      />
      {/* Triângulo inferior-direito (apontando para baixo-direita) */}
      <path
        d="M50 90 L78 62 L62 62 L62 50 L90 50 L90 78 Z"
        fill="#CAFF33"
      />
    </svg>
  )
}
