"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";
import { sesionSchema } from "@/lib/validation/sesion";

export type SesionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

/** Registra una sesión HBO (RLS: admin y enfermera; recepción no). */
export async function registrarSesion(
  pacienteId: string,
  _prev: SesionState,
  formData: FormData,
): Promise<SesionState> {
  if (!getSupabaseServerConfig().configured) {
    return { ok: false, message: "El servicio no está disponible en este momento." };
  }

  const parsed = sesionSchema.safeParse(Object.fromEntries(formData.entries()));
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

  // Si se vincula a una cita, solo se permite si está PROGRAMADA.
  if (d.cita_id) {
    const { data: cita } = await supabase
      .from("citas")
      .select("estado")
      .eq("id", d.cita_id)
      .maybeSingle();
    if (!cita) {
      return { ok: false, message: "La cita seleccionada no existe." };
    }
    if (cita.estado !== "programada") {
      return {
        ok: false,
        message:
          "Esa cita no está programada (cancelada, no asistió o ya completada). No se puede registrar una sesión sobre ella.",
      };
    }
  }

  // --- Material utilizado (OPCIONAL) -------------------------------------
  // Llega como pares paralelos material_insumo_id[] / material_cantidad[].
  const insumoIds = formData.getAll("material_insumo_id").map((v) => String(v));
  const cantidades = formData.getAll("material_cantidad").map((v) => String(v));
  type LineaMaterial = { insumo_id: string; cantidad: number };
  const material: LineaMaterial[] = [];
  for (let i = 0; i < insumoIds.length; i++) {
    const id = insumoIds[i]?.trim();
    const cant = Number(cantidades[i]);
    if (!id) continue; // fila vacía → se ignora
    if (!Number.isFinite(cant) || cant <= 0) {
      return { ok: false, message: "Revisa las cantidades del material (deben ser mayores que cero)." };
    }
    material.push({ insumo_id: id, cantidad: cant });
  }
  // Combinar líneas repetidas del mismo insumo (evita descontar dos veces mal).
  const porInsumo = new Map<string, number>();
  for (const m of material) porInsumo.set(m.insumo_id, (porInsumo.get(m.insumo_id) ?? 0) + m.cantidad);
  const materialFinal = Array.from(porInsumo, ([insumo_id, cantidad]) => ({ insumo_id, cantidad }));

  // Pre-validar stock ANTES de tocar nada (para no dejar el inventario mal).
  if (materialFinal.length > 0) {
    const { data: stocks } = await supabase
      .from("insumos")
      .select("id, nombre, stock, activo")
      .in("id", materialFinal.map((m) => m.insumo_id));
    const porId = new Map((stocks ?? []).map((s) => [s.id as string, s]));
    for (const m of materialFinal) {
      const ins = porId.get(m.insumo_id);
      if (!ins || ins.activo === false) {
        return { ok: false, message: "Uno de los insumos seleccionados ya no está disponible." };
      }
      if (Number(ins.stock) < m.cantidad) {
        return { ok: false, message: `No hay suficiente stock de "${ins.nombre}" (disponible: ${Number(ins.stock)}).` };
      }
    }
  }

  const { data: sesionCreada, error } = await supabase
    .from("sesiones")
    .insert({
      paciente_id: pacienteId,
      cita_id: d.cita_id ?? null,
      numero_sesion: d.numero_sesion ?? null,
      total_sesiones: d.total_sesiones ?? null,
      spo2_antes: d.spo2_antes ?? null,
      ta_antes: d.ta_antes ?? null,
      fc_antes: d.fc_antes ?? null,
      presion_ata: d.presion_ata ?? null,
      duracion_min: d.duracion_min ?? null,
      spo2_despues: d.spo2_despues ?? null,
      evolucion: d.evolucion ?? null,
      incidencias: d.incidencias ?? null,
      registrado_por: user.id,
    })
    .select("id")
    .single();

  if (error || !sesionCreada) {
    if (error?.code === "42501") {
      return { ok: false, message: "No tienes permiso para registrar sesiones." };
    }
    return { ok: false, message: "No se pudo registrar la sesión. Inténtalo de nuevo." };
  }

  // Descontar el material como salidas enlazadas a la sesión (atómico por lote).
  if (materialFinal.length > 0) {
    const { error: errMat } = await supabase.from("insumo_movimientos").insert(
      materialFinal.map((m) => ({
        insumo_id: m.insumo_id,
        tipo: "salida" as const,
        cantidad: m.cantidad,
        motivo: "Material de sesión",
        sesion_id: sesionCreada.id,
        created_by: user.id,
      })),
    );
    if (errMat) {
      // Revertir: borrar la sesión (cascade no aplica porque las salidas no se
      // insertaron) para no dejar una sesión a medias.
      await supabase.from("sesiones").delete().eq("id", sesionCreada.id);
      return { ok: false, message: "No se pudo descontar el material del inventario. No se guardó la sesión." };
    }
    revalidatePath("/inventario");
  }

  // Cierra el ciclo: la cita programada queda "completada" automáticamente.
  if (d.cita_id) {
    await supabase
      .from("citas")
      .update({ estado: "completada" })
      .eq("id", d.cita_id)
      .eq("estado", "programada");
    revalidatePath("/agenda");
  }

  revalidatePath(`/pacientes/${pacienteId}`);
  redirect(`/pacientes/${pacienteId}?sesion=1`);
}

/**
 * Cancela (elimina) una sesión. Solo admin (RLS ses_delete = is_admin).
 * Al borrar la sesión, las salidas de material enlazadas se borran en cascada
 * y el trigger fn_ajustar_stock DEVUELVE el stock automáticamente.
 */
export async function cancelarSesion(
  sesionId: string,
  pacienteId: string,
): Promise<void> {
  if (!getSupabaseServerConfig().configured) return;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("sesiones").delete().eq("id", sesionId);
  if (error) {
    redirect(`/pacientes/${pacienteId}?cancel=error`);
  }
  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/inventario");
  redirect(`/pacientes/${pacienteId}?cancel=1`);
}
