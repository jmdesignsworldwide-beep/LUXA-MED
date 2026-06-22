"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Fondo "aurora" suave que se mueve muy lento (respira). Para el lado claro
 * del login. Usa cian y azul de marca (el naranja se reserva al botón).
 * Se queda quieto si el usuario prefiere menos movimiento.
 */
export function AuroraBackground() {
  const reduced = useReducedMotion() ?? false;

  const loop = (duration: number) => ({
    duration,
    repeat: Infinity,
    repeatType: "mirror" as const,
    ease: "easeInOut" as const,
  });

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -right-24 -top-32 h-[34rem] w-[34rem] rounded-full bg-brand-cyan/20 blur-3xl dark:bg-brand-cyan/10"
        animate={
          reduced ? undefined : { x: [0, 30, -10, 0], y: [0, 24, 44, 0], scale: [1, 1.1, 1.04, 1] }
        }
        transition={loop(20)}
      />
      <motion.div
        className="absolute left-[-8rem] top-1/3 h-[30rem] w-[30rem] rounded-full bg-brand-blue/12 blur-3xl dark:bg-brand-blue/18"
        animate={
          reduced ? undefined : { x: [0, -24, 22, 0], y: [0, 30, -12, 0], scale: [1, 1.08, 1, 1] }
        }
        transition={loop(24)}
      />
      <motion.div
        className="absolute -bottom-32 right-1/4 h-[26rem] w-[26rem] rounded-full bg-brand-cyan/12 blur-3xl dark:bg-brand-cyan/8"
        animate={
          reduced ? undefined : { x: [0, 22, -18, 0], y: [0, -18, 12, 0], scale: [1, 1.06, 1, 1] }
        }
        transition={loop(28)}
      />
    </div>
  );
}
