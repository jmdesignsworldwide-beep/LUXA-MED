"use client";

import * as React from "react";
import { AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";

import { WelcomeScreen } from "@/components/welcome/welcome-screen";

const SESSION_KEY = "luxamed:welcome:shown";

/**
 * Telón de bienvenida cinematográfico (una vez por sesión) que se levanta para
 * revelar el dashboard real (renderizado en el servidor y recibido como hijo).
 * A prueba de fallos: un temporizador máximo garantiza que SIEMPRE se entra.
 *
 * Pruebas en preview: ?welcome=1 fuerza verla de nuevo.
 */
export function HomeExperience({
  nombre,
  children,
}: {
  nombre: string;
  children: React.ReactNode;
}) {
  const params = useSearchParams();
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
      {children}
      <AnimatePresence>
        {showWelcome && (
          <WelcomeScreen nombre={nombre} onDone={() => setShowWelcome(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
