"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

import { OxygenBubbles } from "@/components/auth/oxygen-bubbles";
import { SPRING } from "@/lib/motion";

/**
 * Panel de marca del login — nivel premium.
 * Azul de marca + aurora (manchas de luz azul/cian que se desplazan lento) +
 * orbes aqua grandes y difuminados + burbujas de oxígeno. El logo entra una
 * vez (fade + scale + sube) y luego levita apenas, con un glow aqua que pulsa.
 *
 * Todo lo atmosférico va detrás de la tarjeta blanca; no compite con el logo.
 * Responsive: banda superior en móvil, mitad izquierda completa en desktop.
 */
export function BrandPanel() {
  const reduced = useReducedMotion() ?? false;

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden px-6 py-14 lg:p-12">
      {/* Degradado de marca: azul -> azul más profundo */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(204_72%_48%)] via-[hsl(208_73%_40%)] to-[hsl(212_78%_26%)]" />

      {/* Aurora: manchas de luz azul/cian que se desplazan y transforman lento */}
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(45% 40% at 25% 30%, hsl(199 80% 60% / 0.55), transparent 60%), radial-gradient(40% 38% at 78% 25%, hsl(190 85% 65% / 0.40), transparent 60%), radial-gradient(50% 45% at 65% 80%, hsl(212 85% 35% / 0.55), transparent 62%)",
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

      {/* Orbes aqua grandes y muy difuminados, flotando lento */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -left-24 -top-20 h-[30rem] w-[30rem] rounded-full bg-brand-cyan/35 blur-[90px]"
          animate={
            reduced ? undefined : { x: [0, 90, 30, 0], y: [0, 50, 90, 0], scale: [1, 1.15, 1.05, 1] }
          }
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-[-8rem] top-1/4 h-[28rem] w-[28rem] rounded-full bg-brand-cyan/25 blur-[90px]"
          animate={
            reduced ? undefined : { x: [0, -80, -20, 0], y: [0, 60, -20, 0], scale: [1, 1.12, 1, 1] }
          }
          transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-24 left-1/4 h-[26rem] w-[26rem] rounded-full bg-white/15 blur-[90px]"
          animate={
            reduced ? undefined : { x: [0, 60, -50, 0], y: [0, -50, 20, 0], scale: [1, 1.1, 1, 1] }
          }
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Cápsula gigante semitransparente (silueta de la marca) */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[58%] w-[150%] rounded-pill border border-white/10 bg-white/[0.03] lg:h-[46%]" />
      </div>

      {/* Burbujas de oxígeno (cámara hiperbárica) — sutiles, detrás del logo */}
      <OxygenBubbles />

      {/* Grano finísimo (textura), para que el azul no se vea digital plano */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Logo: entrada (fade + scale + sube) una vez, luego levita con glow */}
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={SPRING}
        className="relative z-10"
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

        {/* Levitación muy leve (respira/levita) */}
        <motion.div
          className="relative"
          animate={reduced ? undefined : { y: [0, -5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="rounded-capsule bg-white p-7 shadow-lift lg:p-12">
            <Image
              src="/luxamed-logo.jpeg"
              alt="LUXAMED Hiperbárica"
              width={1172}
              height={798}
              priority
              className="h-auto w-56 lg:w-[26rem]"
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
