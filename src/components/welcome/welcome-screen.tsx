"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

import { AuroraBackground } from "@/components/fx/aurora-background";
import { BlurInText } from "@/components/fx/blur-in-text";
import { breath, DURATION, SPRING } from "@/lib/motion";

/**
 * Bienvenida cinematográfica (post-login, antes del dashboard).
 * Fondo aurora oscuro de marca, logo con anillos de glow, nombre en degradado
 * azul→cian, saludo con blur-to-focus, y cortina de revelado al dashboard.
 * Dura 2–3s. A prueba de fallos: el control del tiempo vive en HomeExperience.
 */
export function WelcomeScreen({
  nombre,
  onDone,
}: {
  nombre: string;
  onDone: () => void;
}) {
  const reduced = useReducedMotion() ?? false;

  // Se cierra sola tras 2.6s (1.2s si se prefiere menos movimiento).
  React.useEffect(() => {
    const t = setTimeout(onDone, reduced ? 1200 : 2600);
    return () => clearTimeout(t);
  }, [onDone, reduced]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[hsl(214_60%_10%)] via-[hsl(213_66%_8%)] to-[hsl(216_72%_6%)] px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: breath(DURATION.fast) }}
      exit={{ y: "-100%", transition: breath(DURATION.slow) }}
    >
      {/* Aurora de marca sobre fondo oscuro */}
      <AuroraBackground intense />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Logo con anillos de glow */}
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING}
          className="relative"
        >
          {/* Anillos de resplandor que laten hacia afuera */}
          {!reduced &&
            [0, 1, 2].map((i) => (
              <motion.div
                key={i}
                aria-hidden
                className="absolute rounded-capsule border border-brand-cyan/30"
                style={{ inset: -16 - i * 22 }}
                animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0, 0.5] }}
                transition={{
                  duration: 3.6,
                  repeat: Infinity,
                  delay: i * 0.6,
                  ease: "easeInOut",
                }}
              />
            ))}

          {/* Glow aqua difuso */}
          <div className="absolute -inset-8 rounded-capsule bg-brand-cyan/25 blur-3xl" />

          {/* Logo en cápsula blanca (protege los azules) */}
          <div className="relative rounded-capsule bg-white p-5 shadow-lift sm:p-6">
            <Image
              src="/luxamed-logo.jpeg"
              alt="LUXAMED Hiperbárica"
              width={1172}
              height={798}
              priority
              className="h-auto w-44 sm:w-56"
            />
          </div>
        </motion.div>

        {/* Nombre en degradado de marca */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={breath(DURATION.base, 0.35)}
          className="mt-10 leading-none"
        >
          <div className="bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-cyan bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl">
            LUXAMED
          </div>
          <div className="mt-2 text-sm font-semibold uppercase tracking-[0.45em] text-brand-cyan/80 sm:text-base">
            Hiperbárica
          </div>
        </motion.div>

        {/* Saludo con blur-to-focus */}
        <BlurInText
          as="p"
          delay={0.7}
          className="mt-8 text-lg text-white/80 sm:text-xl"
        >
          Bienvenida, <span className="font-semibold text-white">{nombre}</span>
        </BlurInText>
      </div>
    </motion.div>
  );
}
