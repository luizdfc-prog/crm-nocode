"use client"

import { cn } from "@/lib/utils"

interface FormFieldProps {
  label: string
  error?: string
  children: React.ReactNode
  className?: string
}

export function FormField({ label, error, children, className }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-sm font-medium text-pf-text">{label}</label>
      {children}
      {error && (
        <p className="text-xs text-pf-negative">{error}</p>
      )}
    </div>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean
}

export function Input({ hasError, className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border bg-pf-surface-2 px-3 text-sm text-pf-text outline-none transition-colors",
        "placeholder:text-pf-text-muted",
        "focus:border-pf-accent/60 focus:ring-2 focus:ring-pf-accent/10",
        hasError
          ? "border-pf-negative/60 focus:border-pf-negative/60 focus:ring-pf-negative/10"
          : "border-pf-border",
        className
      )}
      {...props}
    />
  )
}
