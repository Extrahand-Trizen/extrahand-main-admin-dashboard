import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Minimal Avatar implementation to match the shadcn/ui import surface used by pages.
 * (If you later swap to a full shadcn avatar, keep the same exports.)
 */
export const Avatar = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "relative inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-100",
      className,
    )}
    {...props}
  />
));
Avatar.displayName = "Avatar";

export const AvatarFallback = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-700",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = "AvatarFallback";

