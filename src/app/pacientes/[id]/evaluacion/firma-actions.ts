"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { CONSENTIMIENTO_TEXTO } from "@/lib/constants/consentimiento";
import { generarConsentimientoPDF } from "@/lib/consentimiento-pdf";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export type FirmaState = { ok: boolean; message?: string };

const schema = z
  .object({
    tipo_firma: z.enum(["dibujada", "tipografica"]),
    firma_imagen: z.string().optional(),
    firma_texto: z.string().optional(),
    acepta: z.string().optional(),
  })
  .refine((d) => d.acepta === "1", {
    message: "Debes confirmar la aceptación del consentimiento.",
  })
  .refine(
    (d) =>
      d.tipo_firma === "dibujada"
        ? !!d.firma_imagen && d.firma_imagen.startsWith("data:image/")
        : !!d.firma_texto && d.firma_texto.trim().length >= 3,
    { message: "Falta la firma del paciente." },
  );

export async function firmarConsentimiento(
  evaluacionId: string,
  pacienteId: string,
  _prev: FirmaState,
  formData: FormData,
): Promise<FirmaState> {
  if (!getSupabaseServerConfig().configured) {
    return { ok: false, message: "El servicio no está disponible en este momento." };
  }

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("nombre_completo, cedula")
    .eq("id", pacienteId)
    .maybeSingle();
  if (!paciente) return { ok: false, message: "Paciente no encontrado." };

  const firmadoEn = new Date();
  const { base64, hash } = await generarConsentimientoPDF({
    pacienteNombre: paciente.nombre_completo,
    pacienteCedula: paciente.cedula,
    consentimientoTexto: CONSENTIMIENTO_TEXTO,
    tipoFirma: parsed.data.tipo_firma,
    firmaImagen: parsed.data.firma_imagen,
    firmaTexto: parsed.data.firma_texto,
    firmadoEn,
  });

  const { error } = await supabase.from("firmas_consentimiento").insert({
    evaluacion_id: evaluacionId,
    paciente_id: pacienteId,
    tipo_firma: parsed.data.tipo_firma,
    firma_imagen: parsed.data.tipo_firma === "dibujada" ? parsed.data.firma_imagen : null,
    firma_texto: parsed.data.tipo_firma === "tipografica" ? parsed.data.firma_texto : null,
    paciente_nombre: paciente.nombre_completo,
    paciente_cedula: paciente.cedula,
    consentimiento_texto: CONSENTIMIENTO_TEXTO,
    firmado_en: firmadoEn.toISOString(),
    pdf_base64: base64,
    pdf_hash: hash,
    created_by: user.id,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Este consentimiento ya fue firmado." };
    }
    if (error.code === "42501") {
      return { ok: false, message: "Solo la doctora (admin) puede registrar la firma." };
    }
    return { ok: false, message: "No se pudo guardar la firma. Inténtalo de nuevo." };
  }

  revalidatePath(`/pacientes/${pacienteId}/evaluacion`);
  redirect(`/pacientes/${pacienteId}/evaluacion?firmado=1`);
}
