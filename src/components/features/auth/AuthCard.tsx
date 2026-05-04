import { cn } from "@/lib/utils"
import { Logo } from "@/components/ui/Logo"

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
      <div className="mb-8">
        <Logo size="lg" />
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
