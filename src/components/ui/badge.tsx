import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]",
        secondary:
          "border-transparent bg-[var(--secondary)] text-[var(--secondary-foreground)]",
        destructive:
          "border-transparent bg-[var(--destructive)]/10 text-[var(--destructive)] border-[var(--destructive)]/20",
        outline:
          "border-[var(--border)] text-[var(--foreground)]",
        success:
          "border-transparent bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
        warning:
          "border-transparent bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20",
        primary:
          "border-transparent bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
