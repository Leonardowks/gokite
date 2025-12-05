import { cn } from "@/lib/utils";

interface SkeletonPremiumProps {
  className?: string;
  variant?: "text" | "card" | "avatar" | "button";
}

export function SkeletonPremium({ className, variant = "text" }: SkeletonPremiumProps) {
  const baseClasses = "animate-shimmer-premium bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] rounded";
  
  const variantClasses = {
    text: "h-4 w-full",
    card: "h-32 w-full rounded-2xl",
    avatar: "h-10 w-10 rounded-full",
    button: "h-10 w-24 rounded-lg",
  };

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)} />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-4 sm:p-6 space-y-4 rounded-2xl border bg-card">
      <div className="flex items-center justify-between">
        <SkeletonPremium variant="text" className="w-24 h-3" />
        <SkeletonPremium variant="avatar" className="h-8 w-8" />
      </div>
      <SkeletonPremium variant="text" className="w-32 h-8" />
      <SkeletonPremium variant="text" className="w-20 h-3" />
    </div>
  );
}

export function SkeletonKPI() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
