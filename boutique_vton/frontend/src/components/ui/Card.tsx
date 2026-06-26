import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-neutral-200 bg-white p-6 shadow-luxury md:p-8",
        className
      )}
      {...props}
    />
  );
}
