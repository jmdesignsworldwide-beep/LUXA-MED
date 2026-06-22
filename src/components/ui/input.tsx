import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-12 w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm shadow-sm transition-all duration-200 ease-breath",
        "placeholder:text-muted-foreground/70",
        "focus-visible:border-brand-cyan focus-visible:outline-none focus-visible:shadow-[0_0_0_4px_hsl(199_73%_55%/0.18),0_0_18px_-2px_hsl(199_73%_55%/0.55)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
