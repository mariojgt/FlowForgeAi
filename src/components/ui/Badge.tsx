import { cn } from "../../lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  tone?: "neutral" | "teal" | "amber" | "rose" | "green";
  className?: string;
}

const tones = {
  neutral: "border-zinc-200 bg-zinc-50 text-zinc-600",
  teal: "border-teal-200 bg-teal-50 text-teal-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-normal",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
