"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { CONSENTIMIENTO_TEXTO } from "@/lib/constants/consentimiento";
import { generarConsentimientoPDF } from "@/lib/consentimiento-pdf";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";
import { evaluacionSchema } from "@/lib/validation/evaluacion";

/** Agrupa checkboxes/textos por prefijo en un objeto JSONB. */
function grupo(formData: FormData, prefijo: string) {
  const o: Record<string, boolean | string> = {};
  for (const [k, v] of Array.from(formData.entries())) {
    if (k.startsWith(prefijo)) {
      o[k.slice(prefijo.length)] = v === "1" ? true : String(v);
    }
  }
  return o;
}

function construirPayload(formData: FormData) {
  const parsed = evaluacionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return null;
  return {
    ...parsed.data,
    antecedentes: grupo(formData, "ant_"),
    indicacion_hbo: grupo(formData, "ind_"),
    contraindicaciones: grupo(formData, "ci_"),
  };
}

/** Crea/actualiza el borrador de evaluación (editable libremente). */
export async function guardarBorrador(
  pacienteId: string,
  evaluacionId: string,
  formData: FormData,
): Promise<void> {
  if (!getSupabaseServerConfig().configured) redirect("/login");
  const payload = construirPayload(formData);
  const base = `/pacientes/${pacienteId}/evaluacion`;
  if (!payload) redirect(`${base}?error=campos`);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = evaluacionId
    ? await supabase.from("evaluaciones_hbo").update(payload).eq("id", evaluacionId)
    : await supabase
        .from("evaluaciones_hbo")
        .insert({ ...payload, paciente_id: pacienteId, created_by: user.id });

  if (error) redirect(`${base}?error=guardar`);
  revalidatePath(base);
  redirect(`${base}?guardado=1`);
}

/** Firma el consentimiento y SELLA la evaluación (queda inmutable). */
export async function sellarEvaluacion(
  pacienteId: string,
  evaluacionId: string,
  formData: FormData,
): Promise<void> {
  if (!getSupabaseServerConfig().configured) redirect("/login");
  const base = `/pacientes/${pacienteId}/evaluacion`;

  const payload = construirPayload(formData);
  if (!payload) redirect(`${base}?error=campos`);

  const tipo = String(formData.get("tipo_firma") ?? "");
  const firmaImagen = String(formData.get("firma_imagen") ?? "");
  const firmaTexto = String(formData.get("firma_texto") ?? "").trim();
  const acepta = formData.get("acepta") === "1";
  const firmaOk =
    acepta &&
    (tipo === "dibujada"
      ? firmaImagen.startsWith("data:image/")
      : tipo === "tipografica" && firmaTexto.length >= 3);
  if (!firmaOk) redirect(`${base}?error=firma`);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 1) Asegurar la fila de evaluación (borrador) con los datos actuales.
  let evalId = evaluacionId;
  if (evalId) {
    const { error } = await supabase
      .from("evaluaciones_hbo")
      .update(payload)
      .eq("id", evalId);
    if (error) redirect(`${base}?error=sellar`);
  } else {
    const { data, error } = await supabase
      .from("evaluaciones_hbo")
      .insert({ ...payload, paciente_id: pacienteId, created_by: user.id })
      .select("id")
      .single();
    if (error || !data) redirect(`${base}?error=sellar`);
    evalId = data.id;
  }

  // 2) Datos del paciente + PDF + hash.
  const { data: paciente } = await supabase
    .from("pacientes")
    .select("nombre_completo, cedula")
    .eq("id", pacienteId)
    .maybeSingle();
  if (!paciente) redirect(`${base}?error=sellar`);

  const firmadoEn = new Date();
  const { base64, hash } = await generarConsentimientoPDF({
    pacienteNombre: paciente.nombre_completo,
    pacienteCedula: paciente.cedula,
    consentimientoTexto: CONSENTIMIENTO_TEXTO,
    tipoFirma: tipo as "dibujada" | "tipografica",
    firmaImagen,
    firmaTexto,
    firmadoEn,
  });

  // 3) Guardar la firma (inmutable).
  const { error: errFirma } = await supabase.from("firmas_consentimiento").insert({
    evaluacion_id: evalId,
    paciente_id: pacienteId,
    tipo_firma: tipo,
    firma_imagen: tipo === "dibujada" ? firmaImagen : null,
    firma_texto: tipo === "tipografica" ? firmaTexto : null,
    paciente_nombre: paciente.nombre_completo,
    paciente_cedula: paciente.cedula,
    consentimiento_texto: CONSENTIMIENTO_TEXTO,
    firmado_en: firmadoEn.toISOString(),
    pdf_base64: base64,
    pdf_hash: hash,
    created_by: user.id,
  });
  if (errFirma) {
    if (errFirma.code === "23505") redirect(`${base}?error=ya_firmada`);
    redirect(`${base}?error=sellar`);
  }

  // 4) Sellar (finalizada). A partir de aquí queda inmutable (trigger 0015).
  const { error: errSeal } = await supabase
    .from("evaluaciones_hbo")
    .update({ estado: "finalizada" })
    .eq("id", evalId);
  if (errSeal) redirect(`${base}?error=sellar`);

  revalidatePath(base);
  redirect(`${base}?firmado=1`);
}

/** Crea un anexo: una nueva evaluación en borrador (el original sellado queda intacto). */
export async function crearAnexo(
  pacienteId: string,
  _formData: FormData,
): Promise<void> {
  if (!getSupabaseServerConfig().configured) redirect("/login");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("evaluaciones_hbo")
    .insert({ paciente_id: pacienteId, created_by: user.id });
  const base = `/pacientes/${pacienteId}/evaluacion`;
  if (error) redirect(`${base}?error=anexo`);
  revalidatePath(base);
  redirect(`${base}?anexo=1`);
}
