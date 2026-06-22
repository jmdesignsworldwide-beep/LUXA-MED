"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

import { SPRING } from "@/lib/motion";

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

      {/* Sábana de luz que se desplaza en loop (el azul deja de estar quieto) */}
      <motion.div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 50% at 30% 25%, hsl(199 73% 55% / 0.45), transparent 60%), radial-gradient(55% 45% at 75% 80%, hsl(212 80% 30% / 0.55), transparent 60%)",
          backgroundSize: "180% 180%",
        }}
        animate={
          reduced
            ? undefined
            : { backgroundPosition: ["0% 0%", "100% 50%", "30% 100%", "0% 0%"] }
        }
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orbes de luz aqua que flotan lento */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -left-20 -top-16 h-80 w-80 rounded-full bg-brand-cyan/30 blur-3xl"
          animate={
            reduced ? undefined : { x: [0, 70, 20, 0], y: [0, 40, 80, 0], scale: [1, 1.15, 1.05, 1] }
          }
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-[-5rem] top-1/4 h-72 w-72 rounded-full bg-white/15 blur-3xl"
          animate={
            reduced ? undefined : { x: [0, -60, -20, 0], y: [0, 50, -10, 0], scale: [1, 1.12, 1, 1] }
          }
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-4rem] left-1/3 h-72 w-72 rounded-full bg-brand-cyan/20 blur-3xl"
          animate={
            reduced ? undefined : { x: [0, 40, -40, 0], y: [0, -40, 20, 0], scale: [1, 1.1, 1, 1] }
          }
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
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

      {/* Logo en tarjeta blanca — entrada una sola vez (fade + sube, resorte) */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
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
