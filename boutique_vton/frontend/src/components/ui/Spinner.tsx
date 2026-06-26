import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type SpinnerProps = {
  className?: string;
  label?: string;
};

export function Spinner({ className, label = "Processing" }: SpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <LoaderCircle className="h-8 w-8 animate-spin text-ink" />
      <p className="text-sm text-neutral-600">{label}</p>
    </div>
  );
}
