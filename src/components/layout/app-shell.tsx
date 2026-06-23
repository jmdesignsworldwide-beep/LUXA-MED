"use client";

import { usePathname } from "next/navigation";

import { AmbientBackground } from "@/components/fx/ambient-background";
import { Sidebar } from "@/components/layout/sidebar";

/**
 * Marco global del sistema: sidebar + atmósfera aurora detrás del contenido.
 * El portal del paciente y el login quedan AISLADOS (sin sidebar ni marco
 * administrativo): se renderizan tal cual.
 */
export function AppShell({
  nombre,
  rolLabel,
  autenticado,
  children,
}: {
  nombre: string;
  rolLabel: string;
  autenticado: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const desnudo =
    !autenticado ||
    pathname === "/login" ||
    pathname.startsWith("/portal");

  if (desnudo) return <>{children}</>;

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <Sidebar nombre={nombre} rolLabel={rolLabel} />
      <div className="relative z-10 min-h-screen pb-20 md:pb-0 md:pl-[76px]">
        {children}
      </div>
    </div>
  );
}
