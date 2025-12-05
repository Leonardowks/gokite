import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

const premiumBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-200",
  {
    variants: {
      variant: {
        success: "bg-success/15 text-success border border-success/20",
        warning: "bg-warning/15 text-warning border border-warning/20",
        urgent: "bg-destructive/15 text-destructive border border-destructive/20 animate-pulse-soft",
        info: "bg-primary/15 text-primary border border-primary/20",
        new: "bg-accent/15 text-accent-foreground border border-accent/30",
        pro: "bg-gradient-to-r from-primary/20 to-accent/20 text-foreground border border-primary/30",
        neutral: "bg-muted text-muted-foreground border border-border",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        default: "px-2.5 py-1 text-xs",
        lg: "px-3 py-1.5 text-sm",
      },
      glow: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      { variant: "success", glow: true, className: "shadow-[0_0_12px_hsl(var(--success)/0.4)]" },
      { variant: "warning", glow: true, className: "shadow-[0_0_12px_hsl(var(--warning)/0.4)]" },
      { variant: "urgent", glow: true, className: "shadow-[0_0_12px_hsl(var(--destructive)/0.4)]" },
      { variant: "info", glow: true, className: "shadow-[0_0_12px_hsl(var(--primary)/0.4)]" },
    ],
    defaultVariants: {
      variant: "neutral",
      size: "default",
      glow: false,
    },
  }
);

export interface PremiumBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof premiumBadgeVariants> {
  icon?: LucideIcon;
  pulse?: boolean;
}

const PremiumBadge = React.forwardRef<HTMLDivElement, PremiumBadgeProps>(
  ({ className, variant, size, glow, icon: Icon, pulse, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          premiumBadgeVariants({ variant, size, glow }),
          pulse && "animate-pulse-soft",
          className
        )}
        {...props}
      >
        {Icon && <Icon className="h-3 w-3 shrink-0" />}
        {children}
      </div>
    );
  }
);
PremiumBadge.displayName = "PremiumBadge";

export { PremiumBadge, premiumBadgeVariants };
