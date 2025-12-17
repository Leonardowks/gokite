import * as React from "react";
import { cn } from "@/lib/utils";

interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  featured?: boolean;
  glow?: boolean;
  hover?: boolean;
  gradient?: "primary" | "accent" | "success" | "ocean" | "sunset" | "none";
  variant?: "default" | "ocean" | "sunset";
}

const PremiumCard = React.forwardRef<HTMLDivElement, PremiumCardProps>(
  ({ className, featured, glow, hover = false, gradient = "none", variant = "default", children, ...props }, ref) => {
    const gradientClasses = {
      primary: "from-primary/5 via-transparent to-primary/10",
      accent: "from-accent/5 via-transparent to-accent/10",
      success: "from-success/5 via-transparent to-success/10",
      ocean: "from-primary/5 via-cyan/5 to-primary/10",
      sunset: "from-accent/5 via-transparent to-accent/10",
      none: "",
    };

    const variantClasses = {
      default: "border-border/50",
      ocean: "border-primary/20 hover:border-primary/40 hover:shadow-ocean",
      sunset: "border-accent/20 hover:border-accent/40 hover:shadow-glow-accent",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-2xl border bg-card text-card-foreground overflow-hidden transition-all duration-300",
          hover && "hover:shadow-lg hover:-translate-y-0.5",
          gradient !== "none" && `bg-gradient-to-br ${gradientClasses[gradient]}`,
          variantClasses[variant],
          featured && "border-primary/30 shadow-glow ring-1 ring-primary/10",
          glow && "hover:shadow-glow",
          className
        )}
        {...props}
      >
        {/* Ocean wave top line for featured cards */}
        {featured && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-cyan to-primary" />
        )}
        {/* Sunset top line for sunset variant when featured */}
        {variant === "sunset" && featured && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-[hsl(350,85%,50%)] to-accent" />
        )}
        {/* Ocean top line for ocean variant when featured */}
        {variant === "ocean" && featured && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-cyan to-primary" />
        )}
        {children}
      </div>
    );
  }
);
PremiumCard.displayName = "PremiumCard";

const PremiumCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-4 sm:p-6", className)}
    {...props}
  />
));
PremiumCardHeader.displayName = "PremiumCardHeader";

const PremiumCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-display text-lg sm:text-xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
PremiumCardTitle.displayName = "PremiumCardTitle";

const PremiumCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
PremiumCardDescription.displayName = "PremiumCardDescription";

const PremiumCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 sm:p-6 pt-0", className)} {...props} />
));
PremiumCardContent.displayName = "PremiumCardContent";

const PremiumCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-4 sm:p-6 pt-0", className)}
    {...props}
  />
));
PremiumCardFooter.displayName = "PremiumCardFooter";

export {
  PremiumCard,
  PremiumCardHeader,
  PremiumCardFooter,
  PremiumCardTitle,
  PremiumCardDescription,
  PremiumCardContent,
};
