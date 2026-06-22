import * as React from "react";

import { cn } from "@/lib/utils";

/** Select nativo estilizado (accesible y sin dependencias extra). */
const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-12 w-full appearance-none rounded-2xl border border-input bg-background px-4 text-sm shadow-sm transition-all duration-200 ease-breath",
      "focus-visible:border-brand-cyan focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-cyan/20",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat pr-10",
      className,
    )}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
    }}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export { Select };
