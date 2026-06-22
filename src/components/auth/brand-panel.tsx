"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

import { breath, DURATION } from "@/lib/motion";

/**
 * Panel de marca del login — nivel premium.
 * Azul de marca con degradado más profundo, cápsula gigante semitransparente
 * (silueta de la marca) para dar profundidad, y grano finísimo para que el
 * azul no se vea plano. El logo entra UNA vez (fade + sube) y se queda quieto.
 *
 * Responsive: banda superior en móvil, mitad izquierda a pantalla completa en
 * desktop. La tarjeta blanca se mantiene (protege los azules del logo).
 */
export function BrandPanel() {
  const reduced = useReducedMotion() ?? false;

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden px-6 py-14 lg:p-12">
      {/* Degradado de marca: azul -> azul más profundo */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(204_72%_48%)] via-[hsl(208_73%_40%)] to-[hsl(212_78%_26%)]" />

      {/* Atmósfera de oxígeno (cian sutil) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-cyan/25 blur-3xl" />
        <div className="absolute -bottom-28 -right-20 h-[28rem] w-[28rem] rounded-full bg-white/10 blur-3xl" />
      </div>

      {/* Cápsula gigante semitransparente (silueta de la marca, apenas visible) */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[58%] w-[150%] rounded-pill border border-white/10 bg-white/[0.03] lg:h-[46%]" />
      </div>

      {/* Grano finísimo (textura), para que el azul no se vea digital plano */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Logo en tarjeta blanca — entrada una sola vez (fade + sube) */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={breath(DURATION.cinematic)}
        className="relative z-10"
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
    </div>
  );
}
