"use client";

import { AuroraBackground } from "@/components/fx/aurora-background";

/**
 * ADN visual global: atmósfera de fondo sutil para TODO el sistema.
 * Aurora de marca (azul/cian) en movimiento muy lento, DETRÁS del contenido.
 * Premium = contención: opacidad baja para no estorbar la lectura.
 * Fijo a la ventana; el contenido va por encima (z-10).
 */
export function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-50 dark:opacity-40"
    >
      <AuroraBackground />
    </div>
  );
}
