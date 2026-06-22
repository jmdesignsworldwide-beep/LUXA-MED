"use client";

import * as React from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * <MagneticCard> — el contenido se atrae suavemente hacia el cursor (efecto
 * magnético) y muestra un glow aqua que sigue al mouse. Reusable.
 * Respeta prefers-reduced-motion (sin movimiento ni glow).
 */
export function MagneticCard({
  children,
  className,
  strength = 0.2,
  glow = true,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  glow?: boolean;
}) {
  const reduced = useReducedMotion() ?? false;
  const ref = React.useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = React.useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 200, damping: 15, mass: 0.6 });

  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const glowBg = useMotionTemplate`radial-gradient(160px circle at ${gx}% ${gy}%, hsl(199 73% 55% / 0.45), transparent 70%)`;

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    x.set((px - r.width / 2) * strength);
    y.set((py - r.height / 2) * strength);
    gx.set((px / r.width) * 100);
    gy.set((py / r.height) * 100);
  }

  function handleLeave() {
    setHovered(false);
    x.set(0);
    y.set(0);
  }

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ x: sx, y: sy }}
      className={cn("relative", className)}
    >
      {glow && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-4 rounded-[inherit] blur-md transition-opacity duration-300"
          style={{ background: glowBg, opacity: hovered ? 1 : 0 }}
        />
      )}
      <div className="relative">{children}</div>
    </motion.div>
  );
}
