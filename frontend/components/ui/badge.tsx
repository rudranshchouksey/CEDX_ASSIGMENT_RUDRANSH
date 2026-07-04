import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'draft' | 'in_review' | 'changes_requested' | 'approved' | 'delivered' | 'exception'
}

function Badge({ className, variant = 'draft', ...props }: BadgeProps) {
  const styles = {
    'draft': 'text-zinc-500 bg-zinc-50/60 border-zinc-200/40',
    'in_review': 'text-blue-700 bg-blue-50/60 border-blue-200/40',
    'changes_requested': 'text-amber-700 bg-amber-50/60 border-amber-200/40',
    'approved': 'text-emerald-700 bg-emerald-50/60 border-emerald-200/40',
    'delivered': 'text-emerald-700 bg-emerald-50/60 border-emerald-200/40',
    'exception': 'text-rose-700 bg-rose-50/50 border-rose-200/30'
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium tracking-tight transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2",
        styles[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
