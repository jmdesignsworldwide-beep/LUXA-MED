"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Burbujas de oxígeno para el panel azul (evoca la cámara hiperbárica).
 * Premium y SUTIL: muy translúcidas, difuminadas, suben lento con vaivén
 * orgánico y a velocidades distintas. Van DETRÁS de la tarjeta del logo.
 *
 * Configuración determinista (no Math.random) para evitar desajustes de
 * hidratación entre servidor y cliente.
 */
const BUBBLES = [
  { left: 8, size: 14, dur: 22, delay: 0, sway: 18, op: 0.12 },
  { left: 18, size: 8, dur: 17, delay: 3, sway: 12, op: 0.1 },
  { left: 28, size: 20, dur: 25, delay: 1.5, sway: 24, op: 0.09 },
  { left: 40, size: 10, dur: 19, delay: 5, sway: 14, op: 0.13 },
  { left: 52, size: 16, dur: 23, delay: 2.5, sway: 20, op: 0.08 },
  { left: 62, size: 7, dur: 16, delay: 6, sway: 10, op: 0.11 },
  { left: 71, size: 22, dur: 24, delay: 0.8, sway: 26, op: 0.07 },
  { left: 80, size: 12, dur: 20, delay: 4, sway: 16, op: 0.12 },
  { left: 88, size: 9, dur: 18, delay: 2, sway: 12, op: 0.1 },
  { left: 34, size: 6, dur: 15, delay: 7, sway: 8, op: 0.14 },
  { left: 58, size: 11, dur: 21, delay: 8, sway: 15, op: 0.1 },
  { left: 14, size: 18, dur: 24, delay: 9, sway: 22, op: 0.08 },
] as const;

export function OxygenBubbles() {
  const reduced = useReducedMotion() ?? false;
  if (reduced) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {BUBBLES.map((b, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full blur-[1px]"
          style={{
            left: `${b.left}%`,
            bottom: -30,
            width: b.size,
            height: b.size,
            background:
              "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.9), rgba(190,235,255,0.25) 60%, transparent 78%)",
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y: [0, -820],
            x: [0, b.sway, -b.sway * 0.6, 0],
            opacity: [0, b.op, b.op, 0],
          }}
          transition={{
            y: { duration: b.dur, repeat: Infinity, ease: "linear", delay: b.delay },
            x: {
              duration: b.dur / 2,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
              delay: b.delay,
            },
            opacity: {
              duration: b.dur,
              repeat: Infinity,
              ease: "easeInOut",
              delay: b.delay,
            },
          }}
        />
      ))}
    </div>
  );
}
