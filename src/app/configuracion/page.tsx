import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { CambiarPasswordForm } from "@/components/configuracion/cambiar-password-form";
import { etiquetaRol } from "@/lib/gender";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  if (!getSupabaseServerConfig().configured) redirect("/login");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("user_profiles")
    .select("role, nombre_completo, genero")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      <div className="container max-w-2xl py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Panel
        </Link>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
          Configuración
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {perfil?.nombre_completo ?? user.email}
          {perfil?.role ? ` · ${etiquetaRol(perfil.role, perfil.genero)}` : ""}
        </p>

        <section className="mt-8 rounded-capsule border border-border/70 bg-card p-6 shadow-soft sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-pill bg-accent text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Seguridad</h2>
              <p className="text-sm text-muted-foreground">
                Cambia tu contraseña de acceso.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <CambiarPasswordForm />
          </div>
        </section>
      </div>
    </main>
  );
}
