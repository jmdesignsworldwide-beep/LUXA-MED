"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { BreathingBackdrop } from "@/components/welcome/breathing-backdrop";
import { DURATION, breath, fadeScale, fadeUp } from "@/lib/motion";

const STORAGE_KEY = "luxamed:welcome:lastSeen";
/** Si la vio hace menos de esto, mostramos la versión breve (no molesta). */
const QUICK_WINDOW_MS = 8 * 60 * 60 * 1000; // 8 horas

export function WelcomeScreen({
  nombre,
  onEnter,
}: {
  nombre: string;
  onEnter: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const [quick, setQuick] = React.useState(false);

  React.useEffect(() => {
    try {
      const last = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
      if (Date.now() - last < QUICK_WINDOW_MS) setQuick(true);
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // localStorage no disponible: mostramos versión completa.
    }
  }, []);

  // Versión breve: se desvanece sola, sin pedir clic.
  React.useEffect(() => {
    if (!quick) return;
    const t = setTimeout(onEnter, reduced ? 600 : 1800);
    return () => clearTimeout(t);
  }, [quick, reduced, onEnter]);

  // En modo breve adelantamos los tiempos.
  const d = (full: number, fast: number) => (quick ? fast : full);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-background px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: breath(DURATION.fast) }}
      exit={{
        opacity: 0,
        scale: 1.03,
        filter: "blur(4px)",
        transition: breath(DURATION.base),
      }}
    >
      <BreathingBackdrop reduced={reduced} />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        {/* Logo dentro de una cápsula blanca (rima con la marca, funciona en claro/oscuro) */}
        <motion.div
          variants={fadeScale}
          initial="hidden"
          animate="show"
          custom={d(0.1, 0)}
          className="rounded-capsule bg-white p-5 shadow-lift sm:p-7"
        >
          <Image
            src="/luxamed-logo.jpeg"
            alt="LUXAMED Hiperbárica"
            width={1172}
            height={798}
            priority
            className="h-auto w-[min(64vw,300px)]"
          />
        </motion.div>

        {/* Saludo por nombre */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={d(0.6, 0.15)}
          className="mt-10 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground"
        >
          Te damos la bienvenida
        </motion.p>
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={d(0.72, 0.25)}
          className="mt-2 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        >
          Hola, <span className="text-primary">{nombre}</span>
        </motion.h1>

        {/* Concepto rector, calmado */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={d(0.86, 0.35)}
          className="mt-3 text-balance text-base text-muted-foreground"
        >
          Oxígeno y claridad. Respira, todo en orden.
        </motion.p>

        {/* Acción de llegada — el ÚNICO naranja (con disciplina). Solo en modo completo. */}
        {!quick && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1.05}
            className="mt-9"
          >
            <Button variant="vital" size="lg" onClick={onEnter}>
              Entrar al panel
            </Button>
          </motion.div>
        )}
      </div>

      {/* Saltar — discreto, esquina */}
      <button
        onClick={onEnter}
        className="absolute bottom-6 right-6 z-10 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Saltar
      </button>
    </motion.div>
  );
}
