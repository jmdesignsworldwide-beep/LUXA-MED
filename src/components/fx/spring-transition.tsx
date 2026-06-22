"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

import { SPRING } from "@/lib/motion";

/**
 * <SpringTransition> — entra a sus hijos en cascada con spring suave.
 * Envuelve cada hijo directo en un item que sube (y) + aparece. Reusable.
 * Respeta prefers-reduced-motion (renderiza sin animar).
 */
export function SpringTransition({
  children,
  className,
  stagger = 0.12,
  y = 30,
  delay = 0.1,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
  delay?: number;
}) {
  const reduced = useReducedMotion() ?? false;

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y },
    show: { opacity: 1, y: 0, transition: SPRING },
  };

  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child) ? (
          <motion.div variants={item}>{child}</motion.div>
        ) : (
          child
        ),
      )}
    </motion.div>
  );
}
