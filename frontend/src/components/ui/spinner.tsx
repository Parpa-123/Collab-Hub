import { cn } from "@/lib/utils"

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
}

const Spinner = ({ className, size = "md", ...props }: SpinnerProps) => {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-2",
    lg: "w-12 h-12 border-4",
  }

  return (
    <div
      className={cn(
        "rounded-full border-primary/20 border-t-primary animate-spin",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
}

export { Spinner }
