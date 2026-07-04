import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-zinc-900 text-zinc-50 hover:bg-zinc-900/90 shadow-sm": variant === "default",
            "bg-zinc-100 text-zinc-900 hover:bg-zinc-200/80": variant === "secondary",
            "border border-zinc-200 bg-white shadow-sm hover:bg-zinc-50 text-zinc-700": variant === "outline",
            "hover:bg-zinc-100 hover:text-zinc-900 text-zinc-600": variant === "ghost",
            "h-9 px-4 py-2": size === "default",
            "h-8 rounded-md px-3 text-xs": size === "sm",
            "h-10 rounded-md px-8": size === "lg",
            "h-9 w-9": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
