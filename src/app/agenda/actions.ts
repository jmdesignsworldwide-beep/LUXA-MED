"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

const ESTADOS = [
  "programada",
  "completada",
  "cancelada",
  "no_asistio",
] as const;
type Estado = (typeof ESTADOS)[number];

/**
 * Cambia el estado de una cita (programada → completada / no asistió /
 * cancelada). RLS: admin, enfermera y recepción. Queda en audit_log.
 * Al cancelar, el horario se libera (la exclusión ignora las canceladas).
 */
export async function cambiarEstadoCita(
  id: string,
  estado: Estado,
  fecha: string,
  _formData: FormData,
): Promise<void> {
  if (!getSupabaseServerConfig().configured) redirect("/login");
  if (!ESTADOS.includes(estado)) redirect(`/agenda?fecha=${fecha}`);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("citas")
    .update({ estado })
    .eq("id", id);

  revalidatePath("/agenda");
  redirect(`/agenda?fecha=${fecha}&${error ? "error=estado" : "actualizada=1"}`);
}
