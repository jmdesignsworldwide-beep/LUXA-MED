"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { EASE_BREATH } from "@/lib/motion";

/**
 * <BlurInText> — texto/título que entra con efecto blur-in (de borroso a
 * nítido) + leve subida. Reusable. Respeta prefers-reduced-motion.
 */
export function BlurInText({
  as = "p",
  delay = 0,
  className,
  children,
}: {
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion() ?? false;

  if (reduced) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  const Comp = motion[as];

  return (
    <Comp
      className={className}
      initial={{ opacity: 0, filter: "blur(12px)", y: 8 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE_BREATH }}
    >
      {children}
    </Comp>
  );
}
