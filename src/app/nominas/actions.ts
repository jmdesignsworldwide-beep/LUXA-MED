"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";
import { nominaSchema } from "@/lib/validation/nomina";

export type NominaState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

/** Registrar un pago de nómina (SOLO admin; lo garantiza RLS). */
export async function registrarPago(
  _prev: NominaState,
  formData: FormData,
): Promise<NominaState> {
  if (!getSupabaseServerConfig().configured)
    return { ok: false, message: "Servicio no disponible." };

  const parsed = nominaSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Revisa los campos marcados.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const d = parsed.data;
  const { error } = await supabase.from("nominas").insert({
    empleado_id: d.empleado_id,
    monto: d.monto,
    fecha_pago: d.fecha_pago,
    periodo: d.periodo,
    metodo: d.metodo,
    notas: d.notas ?? null,
    created_by: user.id,
  });

  if (error) {
    if (error.code === "42501")
      return { ok: false, message: "Solo el administrador puede registrar pagos de nómina." };
    return { ok: false, message: "No se pudo registrar el pago. Inténtalo de nuevo." };
  }

  revalidatePath("/nominas");
  redirect("/nominas?creado=1");
}
