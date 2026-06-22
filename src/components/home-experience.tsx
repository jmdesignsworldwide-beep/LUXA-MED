"use client";

import * as React from "react";
import { AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";

import { DashboardPreview } from "@/components/dashboard/dashboard-preview";
import { WelcomeScreen } from "@/components/welcome/welcome-screen";

const SESSION_KEY = "luxamed:welcome:shown";

/**
 * Flujo de inicio: bienvenida cinematográfica (una vez por sesión) que revela
 * el dashboard con una cortina. A prueba de fallos: un temporizador máximo
 * garantiza que SIEMPRE se entre al sistema aunque algo falle.
 *
 * Pruebas en preview: ?nombre=... cambia el saludo; ?welcome=1 fuerza verla.
 */
export function HomeExperience() {
  const params = useSearchParams();
  const nombre = params.get("nombre")?.trim() || "Marien";
  const force = params.get("welcome") === "1";

  const [showWelcome, setShowWelcome] = React.useState(false);

  React.useEffect(() => {
    let shouldShow = force;
    try {
      if (!force && !sessionStorage.getItem(SESSION_KEY)) shouldShow = true;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // sessionStorage no disponible: no bloqueamos, simplemente no la forzamos.
    }
    setShowWelcome(shouldShow);
  }, [force]);

  // A prueba de fallos: nunca dejar la bienvenida más de 5s en pantalla.
  React.useEffect(() => {
    if (!showWelcome) return;
    const t = setTimeout(() => setShowWelcome(false), 5000);
    return () => clearTimeout(t);
  }, [showWelcome]);

  return (
    <>
      <DashboardPreview nombre={nombre} />
      <AnimatePresence>
        {showWelcome && (
          <WelcomeScreen nombre={nombre} onDone={() => setShowWelcome(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
