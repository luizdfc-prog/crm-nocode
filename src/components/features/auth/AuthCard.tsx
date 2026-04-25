import { cn } from "@/lib/utils"

interface AuthCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}

export function AuthCard({ title, subtitle, children, className }: AuthCardProps) {
  return (
    <div className={cn("w-full max-w-[420px]", className)}>
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-pf-accent">
          <span className="select-none font-heading text-[15px] font-black leading-none text-pf-bg">
            P
          </span>
        </div>
        <span className="font-heading text-[19px] font-bold tracking-tight text-pf-text">
          PipeFlow
        </span>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-pf-border bg-pf-surface px-8 py-8">
        <div className="mb-6">
          <h1 className="font-heading text-[22px] font-bold text-pf-text">{title}</h1>
          {subtitle && (
            <p className="mt-1.5 text-sm text-pf-text-sec">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
