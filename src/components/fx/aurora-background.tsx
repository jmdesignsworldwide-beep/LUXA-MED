"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * <AuroraBackground> — fondo de mesh/gradiente animado en movimiento lento.
 * Reusable en todo el sistema. Colores de marca (azul/cian). `intense` para
 * fondos de marca (sobre azul); por defecto, suave (sobre claro).
 * Respeta prefers-reduced-motion (queda quieto).
 */
export function AuroraBackground({
  className,
  intense = false,
}: {
  className?: string;
  intense?: boolean;
}) {
  const reduced = useReducedMotion() ?? false;

  const orb = intense
    ? ["bg-brand-cyan/35", "bg-brand-cyan/25", "bg-white/15"]
    : ["bg-brand-cyan/20", "bg-brand-blue/12", "bg-brand-cyan/12"];

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {/* Mesh de luz que se desplaza y transforma lento */}
      <motion.div
        className={cn("absolute inset-0", intense ? "opacity-90" : "opacity-60")}
        style={{
          background:
            "radial-gradient(45% 40% at 25% 30%, hsl(199 80% 60% / 0.55), transparent 60%), radial-gradient(40% 38% at 78% 25%, hsl(190 85% 65% / 0.40), transparent 60%), radial-gradient(50% 45% at 65% 80%, hsl(212 85% 45% / 0.45), transparent 62%)",
          backgroundSize: "200% 200%",
        }}
        animate={
          reduced
            ? undefined
            : {
                backgroundPosition: [
                  "0% 0%",
                  "100% 35%",
                  "40% 100%",
                  "10% 40%",
                  "0% 0%",
                ],
              }
        }
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orbes grandes y difuminados flotando */}
      <motion.div
        className={cn(
          "absolute -left-24 -top-20 h-[30rem] w-[30rem] rounded-full blur-[90px]",
          orb[0],
        )}
        animate={
          reduced ? undefined : { x: [0, 90, 30, 0], y: [0, 50, 90, 0], scale: [1, 1.15, 1.05, 1] }
        }
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={cn(
          "absolute right-[-8rem] top-1/4 h-[28rem] w-[28rem] rounded-full blur-[90px]",
          orb[1],
        )}
        animate={
          reduced ? undefined : { x: [0, -80, -20, 0], y: [0, 60, -20, 0], scale: [1, 1.12, 1, 1] }
        }
        transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={cn(
          "absolute -bottom-24 left-1/4 h-[26rem] w-[26rem] rounded-full blur-[90px]",
          orb[2],
        )}
        animate={
          reduced ? undefined : { x: [0, 60, -50, 0], y: [0, -50, 20, 0], scale: [1, 1.1, 1, 1] }
        }
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
