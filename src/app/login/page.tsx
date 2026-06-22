import type { Metadata } from "next";

import { BrandPanel } from "@/components/auth/brand-panel";
import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Iniciar sesión — LUXAMED Hiperbárica",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Izquierda (desktop) / arriba (móvil): panel de marca */}
      <BrandPanel />

      {/* Derecha: formulario sobre fondo limpio */}
      <div className="relative flex min-h-[60vh] items-center justify-center bg-background px-6 py-12 lg:min-h-screen">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
