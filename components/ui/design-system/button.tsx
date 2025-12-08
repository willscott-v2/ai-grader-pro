import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold uppercase tracking-wide transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 disabled:saturate-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-[var(--orange-accent)] to-[var(--orange-dark)] text-white shadow-[var(--shadow-orange)] hover:from-[var(--orange-light)] hover:to-[var(--orange-accent)] hover:shadow-[var(--shadow-orange-hover)] hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:hover:from-[var(--orange-accent)] disabled:hover:to-[var(--orange-dark)]",
        secondary:
          "bg-white/15 text-white border border-white/20 hover:bg-white/25 disabled:hover:bg-white/15",
        ghost:
          "text-white hover:bg-white/10 disabled:hover:bg-transparent",
        link:
          "text-[var(--orange-accent)] underline-offset-4 hover:underline",
        success:
          "bg-gradient-to-br from-[var(--success-green)] to-[#229954] text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:hover:translate-y-0",
        destructive:
          "bg-gradient-to-br from-[var(--error-red)] to-[#c0392b] text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:hover:translate-y-0",
      },
      size: {
        default: "h-12 px-9 py-4.5 text-base",
        sm: "h-9 px-5 text-sm",
        lg: "h-14 px-11 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
