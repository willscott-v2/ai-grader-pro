import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const spinnerVariants = cva(
  "inline-block animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]",
  {
    variants: {
      size: {
        sm: "h-6 w-6 border-2",
        md: "h-12 w-12 border-4",
        lg: "h-16 w-16 border-4",
        xl: "h-20 w-20 border-[5px]",
      },
      color: {
        orange: "text-[var(--orange-accent)]",
        blue: "text-[var(--info-blue)]",
        green: "text-[var(--success-green)]",
        white: "text-white",
        current: "text-current",
      },
    },
    defaultVariants: {
      size: "md",
      color: "orange",
    },
  }
)

export interface LoadingSpinnerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof spinnerVariants> {
  label?: string
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size, color, label, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        className={cn("flex flex-col items-center justify-center gap-4", className)}
        {...props}
      >
        <div
          className={cn(spinnerVariants({ size, color }))}
          aria-label={label || "Loading"}
        />
        {label && (
          <p className="text-sm font-medium text-[var(--light-gray)]">
            {label}
          </p>
        )}
        <span className="sr-only">{label || "Loading..."}</span>
      </div>
    )
  }
)
LoadingSpinner.displayName = "LoadingSpinner"

// Inline spinner for button states
const ButtonSpinner = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="status"
      className={cn("inline-block", className)}
      {...props}
    >
      <div
        className={cn(
          spinnerVariants({ size: "sm", color: "current" })
        )}
        aria-label="Loading"
      />
      <span className="sr-only">Loading...</span>
    </div>
  )
})
ButtonSpinner.displayName = "ButtonSpinner"

// Fullscreen loading overlay
interface LoadingOverlayProps {
  message?: string
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const LoadingOverlay = React.forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({ message, size = "xl", className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm", className)}
      >
        <div className="flex flex-col items-center gap-6 rounded-xl bg-white/10 p-12 backdrop-blur-md">
          <LoadingSpinner size={size} color="orange" />
          {message && (
            <p className="text-lg font-semibold text-white">{message}</p>
          )}
        </div>
      </div>
    )
  }
)
LoadingOverlay.displayName = "LoadingOverlay"

export { LoadingSpinner, ButtonSpinner, LoadingOverlay }
