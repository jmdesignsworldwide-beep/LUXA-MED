"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

import { OxygenBubbles } from "@/components/auth/oxygen-bubbles";
import { AuroraBackground } from "@/components/fx/aurora-background";
import { MagneticCard } from "@/components/fx/magnetic-card";
import { ShimmerBorder } from "@/components/fx/shimmer-border";
import { SPRING } from "@/lib/motion";

/**
 * Panel de marca del login. Azul + aurora reutilizable + burbujas de oxígeno.
 * El logo entra una vez (fade + scale + sube), levita apenas, con glow aqua
 * que pulsa, borde shimmer y hover magnético. Sin óvalo gris de fondo.
 */
export function BrandPanel() {
  const reduced = useReducedMotion() ?? false;

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden px-6 py-14 lg:p-12">
      {/* Degradado de marca: azul -> azul más profundo */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(204_72%_48%)] via-[hsl(208_73%_40%)] to-[hsl(212_78%_26%)]" />

      {/* Aurora reutilizable (mesh + orbes) */}
      <AuroraBackground intense />

      {/* Burbujas de oxígeno (cámara hiperbárica) */}
      <OxygenBubbles />

      {/* Grano finísimo (textura) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Logo: entrada (fade + scale + sube) una vez, luego levita */}
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={SPRING}
        className="relative z-10"
      >
        <motion.div
          className="relative"
          animate={reduced ? undefined : { y: [0, -5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Glow aqua suave que pulsa lento detrás del logo */}
          <motion.div
            aria-hidden
            className="absolute -inset-6 rounded-capsule bg-brand-cyan/25 blur-3xl"
            animate={
              reduced ? undefined : { opacity: [0.25, 0.5, 0.25], scale: [0.96, 1.08, 0.96] }
            }
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Hover magnético + borde shimmer alrededor de la tarjeta blanca */}
          <MagneticCard glow={false} className="rounded-capsule">
            <ShimmerBorder className="rounded-capsule">
              <div className="rounded-capsule bg-white p-7 lg:p-12">
                <Image
                  src="/luxamed-logo.jpeg"
                  alt="LUXAMED Hiperbárica"
                  width={1172}
                  height={798}
                  priority
                  className="h-auto w-56 lg:w-[26rem]"
                />
              </div>
            </ShimmerBorder>
          </MagneticCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
