"use client";

import { motion } from "framer-motion";

import { breathingPulse } from "@/lib/motion";

/**
 * Atmósfera de "oxígeno": degradado suave + dos focos aqua que respiran lento.
 * Sutil, nunca protagonista. Se apaga si el usuario prefiere menos movimiento.
 */
export function BreathingBackdrop({ reduced }: { reduced: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Base limpia con un tinte de oxígeno */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/60 via-background to-background dark:from-secondary/30" />

      {/* Foco cian (arriba) */}
      <motion.div
        className="absolute -top-24 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-brand-cyan/25 blur-3xl dark:bg-brand-cyan/15"
        animate={reduced ? undefined : breathingPulse}
      />
      {/* Foco azul (abajo) */}
      <motion.div
        className="absolute -bottom-40 right-[-6rem] h-[34rem] w-[34rem] rounded-full bg-brand-blue/15 blur-3xl dark:bg-brand-blue/20"
        animate={
          reduced
            ? undefined
            : { ...breathingPulse, transition: { ...breathingPulse.transition, duration: 9 } }
        }
      />
    </div>
  );
}
