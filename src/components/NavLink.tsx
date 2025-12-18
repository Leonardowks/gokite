import {
  NavLink as RouterNavLink,
  type NavLinkProps,
  useInRouterContext,
  UNSAFE_NavigationContext,
} from "react-router-dom";
import { forwardRef, useContext } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    // Some runtime states can end up with partial router context; avoid crashing the whole app.
    const inRouter = useInRouterContext();
    const navigationCtx = useContext(UNSAFE_NavigationContext as any);

    const hasFullRouterContext = inRouter && !!navigationCtx;

    if (!hasFullRouterContext) {
      const href = typeof to === "string" ? to : (to as any)?.pathname ?? "/";
      return <a ref={ref} href={href} className={cn(className)} />;
    }

    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props}
      />
    );
  }
);

NavLink.displayName = "NavLink";

export { NavLink };
