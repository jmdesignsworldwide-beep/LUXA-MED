"use client";

import * as React from "react";
import { AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";

import { DashboardPreview } from "@/components/dashboard/dashboard-preview";
import { WelcomeScreen } from "@/components/welcome/welcome-screen";

/**
 * Flujo de inicio: bienvenida cinematográfica que sale con fluidez y revela
 * el panel debajo. El nombre se puede probar con ?nombre=... en el preview.
 */
export function HomeExperience() {
  const params = useSearchParams();
  const nombre = params.get("nombre")?.trim() || "Marien";
  const [showWelcome, setShowWelcome] = React.useState(true);

  return (
    <>
      <DashboardPreview nombre={nombre} />
      <AnimatePresence>
        {showWelcome && (
          <WelcomeScreen nombre={nombre} onEnter={() => setShowWelcome(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
