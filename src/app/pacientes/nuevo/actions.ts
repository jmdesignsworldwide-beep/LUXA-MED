"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  MIME_PERMITIDOS,
  TAM_MAX_BYTES,
  extraerDeImagen,
  geminiDisponible,
  type MotivoFallo,
} from "@/lib/gemini";
import { formatCedula, formatTelefonoRD } from "@/lib/format";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";
import { pacienteSchema } from "@/lib/validation/paciente";

export type RegistroState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

const BUCKET = "documentos-pacientes";

// ===========================================================================
// Escaneo inteligente (Fase 1): leer un documento y devolver datos para LLENAR
// el formulario. La IA NUNCA guarda; el humano revisa y confirma.
// ===========================================================================

export type PacienteEscaneado = {
  nombre_completo?: string;
  cedula?: string;
  fecha_nacimiento?: string;
  sexo?: string;
  telefono?: string;
  direccion?: string;
};

export type ScanState =
  | { ok: true; datos: PacienteEscaneado; campos: string[] }
  | { ok: false; motivo: MotivoFallo; detalle?: string };

const SCHEMA_PACIENTE = {
  type: "OBJECT",
  properties: {
    nombre_completo: { type: "STRING" },
    cedula: { type: "STRING" },
    fecha_nacimiento: { type: "STRING" },
    sexo: { type: "STRING" },
    telefono: { type: "STRING" },
    direccion: { type: "STRING" },
  },
};

const INSTRUCCION_PACIENTE = [
  "Eres un asistente que extrae datos de documentos dominicanos de un paciente",
  "(cédula de identidad u otro documento con sus datos personales).",
  "Devuelve SOLO lo que puedas leer con seguridad en la imagen.",
  "Si un dato NO está claramente legible, déjalo como cadena vacía (\"\").",
  "NUNCA inventes, adivines ni completes datos que no aparezcan.",
  "Formatos exactos:",
  "- cedula: 000-0000000-0 (11 dígitos con guiones).",
  "- fecha_nacimiento: AAAA-MM-DD.",
  "- sexo: 'M' o 'F' únicamente.",
  "- telefono: solo dígitos dominicanos (10 dígitos).",
  "- nombre_completo: tal como aparece.",
  "- direccion: la dirección si aparece, si no, vacío.",
].join(" ");

function normalizarSexo(v?: string): string {
  const s = (v ?? "").trim().toUpperCase();
  if (["M", "MASCULINO", "HOMBRE", "MALE"].includes(s)) return "M";
  if (["F", "FEMENINO", "MUJER", "FEMALE"].includes(s)) return "F";
  return "";
}

function normalizarFecha(v?: string): string {
  const s = (v ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/AAAA o DD-MM-AAAA
  const m = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return "";
}

function soloDigitos(v?: string): string {
  return (v ?? "").replace(/\D/g, "");
}

/** Recibe la imagen del documento y devuelve datos para llenar el formulario. */
export async function escanearDocumentoPaciente(formData: FormData): Promise<ScanState> {
  if (!geminiDisponible()) return { ok: false, motivo: "no_config" };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, motivo: "api" };

  const file = formData.get("documento");
  if (!(file instanceof File) || file.size === 0) return { ok: false, motivo: "ilegible" };
  if (!MIME_PERMITIDOS.includes(file.type)) return { ok: false, motivo: "ilegible" };
  if (file.size > TAM_MAX_BYTES) return { ok: false, motivo: "api" };

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const res = await extraerDeImagen<PacienteEscaneado>({
    base64,
    mimeType: file.type,
    instruccion: INSTRUCCION_PACIENTE,
    schema: SCHEMA_PACIENTE,
  });
  if (!res.ok) return res;

  // Normalizar y conservar SOLO lo que vino con contenido.
  const d = res.datos ?? {};
  const limpio: PacienteEscaneado = {};
  if (d.nombre_completo?.trim()) limpio.nombre_completo = d.nombre_completo.trim();
  const ced = soloDigitos(d.cedula);
  if (ced.length === 11) limpio.cedula = formatCedula(ced);
  const fn = normalizarFecha(d.fecha_nacimiento);
  if (fn) limpio.fecha_nacimiento = fn;
  const sx = normalizarSexo(d.sexo);
  if (sx) limpio.sexo = sx;
  const tel = soloDigitos(d.telefono);
  if (tel.length === 10) limpio.telefono = formatTelefonoRD(tel);
  if (d.direccion?.trim()) limpio.direccion = d.direccion.trim();

  const campos = Object.keys(limpio);
  if (campos.length === 0) return { ok: false, motivo: "ilegible" };
  return { ok: true, datos: limpio, campos };
}

/** Sube la imagen original al expediente (best-effort, no rompe el registro). */
async function guardarDocumento(
  supabase: ReturnType<typeof createClient>,
  pacienteId: string,
  userId: string,
  file: File,
  tipo: string,
): Promise<void> {
  try {
    if (!(file instanceof File) || file.size === 0) return;
    if (!MIME_PERMITIDOS.includes(file.type) || file.size > TAM_MAX_BYTES) return;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${pacienteId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
    if (upErr) return;
    await supabase.from("documentos_paciente").insert({
      paciente_id: pacienteId,
      tipo,
      storage_path: path,
      mime: file.type,
      subido_por: userId,
    });
  } catch {
    // Respaldo best-effort: si falla, el paciente igual queda guardado.
  }
}

/** Registra un paciente nuevo (RLS: admin, enfermera, recepción). */
export async function registrarPaciente(
  _prev: RegistroState,
  formData: FormData,
): Promise<RegistroState> {
  if (!getSupabaseServerConfig().configured) {
    return { ok: false, message: "El servicio no está disponible en este momento." };
  }

  const raw = Object.fromEntries(formData.entries());
  const parsed = pacienteSchema.safeParse(raw);

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
  const payload = {
    nombre_completo: d.nombre_completo,
    cedula: d.cedula,
    fecha_nacimiento: d.fecha_nacimiento
      ? d.fecha_nacimiento.toISOString().slice(0, 10)
      : null,
    sexo: d.sexo ?? null,
    telefono: d.telefono ?? null,
    email: d.email ?? null,
    direccion: d.direccion ?? null,
    tipo_sangre: d.tipo_sangre ?? null,
    alergias: d.alergias ?? null,
    contacto_emergencia_nombre: d.contacto_emergencia_nombre ?? null,
    contacto_emergencia_telefono: d.contacto_emergencia_telefono ?? null,
    ars: d.ars ?? null,
    ars_numero_afiliado: d.ars_numero_afiliado ?? null,
    created_by: user.id,
  };

  const { data: creado, error } = await supabase
    .from("pacientes")
    .insert(payload)
    .select("id")
    .single();

  if (error || !creado) {
    // 23505 = violación de unicidad (cédula duplicada)
    if (error?.code === "23505") {
      return {
        ok: false,
        errors: { cedula: ["Ya existe un paciente con esta cédula."] },
        message: "Esa cédula ya está registrada.",
      };
    }
    return {
      ok: false,
      message: "No se pudo guardar el paciente. Inténtalo de nuevo.",
    };
  }

  // Respaldo: si se adjuntó la imagen del documento escaneado, guardarla.
  const documento = formData.get("documento");
  if (documento instanceof File && documento.size > 0) {
    await guardarDocumento(supabase, creado.id as string, user.id, documento, "cedula");
  }

  revalidatePath("/pacientes");
  redirect("/pacientes?creado=1");
}
