"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";
import { empleadoSchema } from "@/lib/validation/empleado";

export type EmpleadoState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

function toFecha(d: Date | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

function publico(d: ReturnType<typeof empleadoSchema.parse>) {
  return {
    nombre_completo: d.nombre_completo,
    puesto: d.puesto,
    telefono: d.telefono ?? null,
    email: d.email ?? null,
    fecha_ingreso: toFecha(d.fecha_ingreso),
    user_id: d.user_id ?? null,
  };
}

function privado(d: ReturnType<typeof empleadoSchema.parse>) {
  return {
    cedula: d.cedula ?? null,
    salario: d.salario ?? null,
    banco: d.banco ?? null,
    cuenta_banco: d.cuenta_banco ?? null,
    direccion: d.direccion ?? null,
    contacto_emergencia_nombre: d.contacto_emergencia_nombre ?? null,
    contacto_emergencia_telefono: d.contacto_emergencia_telefono ?? null,
    notas_rrhh: d.notas_rrhh ?? null,
  };
}

function parse(formData: FormData) {
  return empleadoSchema.safeParse(Object.fromEntries(formData.entries()));
}

/** Crear empleado (solo admin; lo garantiza RLS). */
export async function crearEmpleado(
  _prev: EmpleadoState,
  formData: FormData,
): Promise<EmpleadoState> {
  if (!getSupabaseServerConfig().configured)
    return { ok: false, message: "Servicio no disponible." };

  const parsed = parse(formData);
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
  const { data: emp, error } = await supabase
    .from("empleados")
    .insert(publico(d))
    .select("id")
    .single();

  if (error || !emp) {
    if (error?.code === "42501")
      return { ok: false, message: "Solo un administrador puede registrar empleados." };
    if (error?.code === "23505")
      return { ok: false, message: "Esa cuenta de usuario ya está vinculada a otro empleado." };
    return { ok: false, message: "No se pudo registrar el empleado. Inténtalo de nuevo." };
  }

  const { error: errPriv } = await supabase
    .from("empleados_privado")
    .insert({ empleado_id: emp.id, ...privado(d) });
  if (errPriv) {
    // El empleado quedó creado; avisamos que los datos privados fallaron.
    return { ok: false, message: "Empleado creado, pero no se guardaron los datos privados. Edítalo para reintentar." };
  }

  revalidatePath("/empleados");
  redirect(`/empleados/${emp.id}?creado=1`);
}

/** Editar empleado (solo admin). */
export async function actualizarEmpleado(
  id: string,
  _prev: EmpleadoState,
  formData: FormData,
): Promise<EmpleadoState> {
  if (!getSupabaseServerConfig().configured)
    return { ok: false, message: "Servicio no disponible." };

  const parsed = parse(formData);
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
  const { error } = await supabase.from("empleados").update(publico(d)).eq("id", id);
  if (error) {
    if (error.code === "42501")
      return { ok: false, message: "Solo un administrador puede editar empleados." };
    if (error.code === "23505")
      return { ok: false, message: "Esa cuenta de usuario ya está vinculada a otro empleado." };
    return { ok: false, message: "No se pudo guardar. Inténtalo de nuevo." };
  }

  const { error: errPriv } = await supabase
    .from("empleados_privado")
    .upsert({ empleado_id: id, ...privado(d) }, { onConflict: "empleado_id" });
  if (errPriv) {
    return { ok: false, message: "No se pudieron guardar los datos privados." };
  }

  revalidatePath(`/empleados/${id}`);
  revalidatePath("/empleados");
  redirect(`/empleados/${id}?actualizado=1`);
}

/** Activar/desactivar empleado (soft-delete, solo admin). */
export async function cambiarEstadoEmpleado(
  id: string,
  activo: boolean,
): Promise<void> {
  if (!getSupabaseServerConfig().configured) return;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("empleados")
    .update({ activo })
    .eq("id", id);

  revalidatePath(`/empleados/${id}`);
  revalidatePath("/empleados");
  redirect(
    `/empleados/${id}?${error ? "error=estado" : `estado=${activo ? "activado" : "desactivado"}`}`,
  );
}
