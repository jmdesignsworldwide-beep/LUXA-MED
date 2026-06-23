"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { adminDisponible, createAdminClient } from "@/lib/supabase/admin";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";
import { cuentaEmpleadoSchema, empleadoSchema } from "@/lib/validation/empleado";

export type EmpleadoState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  tempPassword?: string;
  cuentaEmail?: string;
  empleadoId?: string;
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
    return { ok: false, message: "Empleado creado, pero no se guardaron los datos privados. Edítalo para reintentar.", empleadoId: emp.id };
  }

  // ¿Crear cuenta de acceso? Si no, terminamos.
  if (String(formData.get("crear_cuenta") ?? "") !== "on") {
    revalidatePath("/empleados");
    redirect(`/empleados/${emp.id}?creado=1`);
  }

  // Solo admin puede crear cuentas (no escalar privilegios).
  const { data: perfil } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (perfil?.role !== "admin") {
    return { ok: false, message: "Empleado creado. Solo un administrador puede crear cuentas de acceso.", empleadoId: emp.id };
  }
  if (!adminDisponible()) {
    return {
      ok: false,
      message:
        "Empleado creado, pero la creación de cuentas no está configurada en el servidor (falta SUPABASE_SERVICE_ROLE_KEY).",
      empleadoId: emp.id,
    };
  }

  const cuenta = cuentaEmpleadoSchema.safeParse({
    email: formData.get("cuenta_email"),
    password: formData.get("cuenta_password"),
    rol: formData.get("cuenta_rol"),
  });
  if (!cuenta.success) {
    const fe = cuenta.error.flatten().fieldErrors;
    return {
      ok: false,
      message: "Empleado creado, pero revisa los datos de la cuenta.",
      empleadoId: emp.id,
      errors: {
        cuenta_email: fe.email ?? [],
        cuenta_password: fe.password ?? [],
        cuenta_rol: fe.rol ?? [],
      },
    };
  }

  const admin = createAdminClient();
  const { data: creado, error: errAuth } = await admin.auth.admin.createUser({
    email: cuenta.data.email,
    password: cuenta.data.password,
    email_confirm: true,
    user_metadata: { full_name: d.nombre_completo },
  });
  if (errAuth || !creado?.user) {
    const msg = (errAuth?.message ?? "").toLowerCase();
    const dup = msg.includes("already") || msg.includes("registered") || msg.includes("exists");
    return {
      ok: false,
      message: dup
        ? "Empleado creado, pero ese correo ya tiene una cuenta. Edita el empleado y usa otro correo."
        : "Empleado creado, pero no se pudo crear la cuenta de acceso.",
      empleadoId: emp.id,
    };
  }

  const nuevoUserId = creado.user.id;
  // El trigger crea el perfil como recepción; asignamos el rol elegido.
  await admin
    .from("user_profiles")
    .update({ role: cuenta.data.rol, nombre_completo: d.nombre_completo })
    .eq("id", nuevoUserId);
  // Vincular el empleado con su cuenta.
  await admin.from("empleados").update({ user_id: nuevoUserId }).eq("id", emp.id);
  // Auditoría — NUNCA la contraseña.
  await admin.from("audit_log").insert({
    table_name: "auth.users",
    action: "CUENTA_CREADA",
    row_id: nuevoUserId,
    actor_id: user.id,
    actor_role: "admin",
    new_data: { email: cuenta.data.email, role: cuenta.data.rol, empleado_id: emp.id },
  });

  revalidatePath("/empleados");
  return {
    ok: true,
    message: "Empleado y cuenta de acceso creados.",
    tempPassword: cuenta.data.password,
    cuentaEmail: cuenta.data.email,
    empleadoId: emp.id,
  };
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
