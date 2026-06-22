"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * <ShimmerBorder> — borde con un brillo (gradiente cónico) que gira lento
 * alrededor del contenido. Reusable. Respeta prefers-reduced-motion (borde
 * estático). El radio se pasa por `className` (ej. "rounded-capsule").
 */
export function ShimmerBorder({
  children,
  className,
  thickness = 2,
}: {
  children: React.ReactNode;
  className?: string;
  thickness?: number;
}) {
  const reduced = useReducedMotion() ?? false;

  if (reduced) {
    return (
      <div className={cn("border border-brand-cyan/40", className)}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ padding: thickness }}
    >
      {/* Capa giratoria con el brillo */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[220%] w-[220%] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, hsl(199 73% 60%) 50deg, hsl(208 73% 55%) 110deg, transparent 170deg, transparent 360deg)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
      />
      {/* Contenido (hereda el radio del contenedor) */}
      <div className="relative h-full w-full rounded-[inherit]">{children}</div>
    </div>
  );
}
