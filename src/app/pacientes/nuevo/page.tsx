import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Card } from "@/components/ui/card";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NuevoPacientePage() {
  if (!getSupabaseServerConfig().configured) redirect("/login");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      <div className="container max-w-2xl py-10">
        <Link
          href="/pacientes"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Pacientes
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Registrar paciente
        </h1>
        <Card className="mt-6 p-8 text-muted-foreground">
          El formulario de registro es la próxima pieza (con validaciones). En
          construcción.
        </Card>
      </div>
    </main>
  );
}
