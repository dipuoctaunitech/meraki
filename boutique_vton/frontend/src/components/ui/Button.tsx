import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  variant?: "solid" | "outline";
};

const variantClasses = {
  solid:
    "border border-ink bg-ink text-white hover:bg-ink hover:text-white active:bg-ink active:text-white",
  outline:
    "border border-ink bg-transparent text-ink hover:bg-ink hover:text-white active:bg-ink active:text-white"
} as const;

export function Button({
  className,
  children,
  isLoading = false,
  disabled,
  variant = "solid",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {children}
    </button>
  );
}
