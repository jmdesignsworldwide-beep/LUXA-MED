import "server-only";

/**
 * Cliente mínimo de Gemini (API REST, sin dependencias extra).
 * Filosofía sagrada: la IA LLENA pero NUNCA guarda; NUNCA inventa. Si no puede
 * leer con confianza, deja el campo vacío. Si Gemini no está configurado o
 * falla, devolvemos un motivo claro — jamás un dato falso ni un "[mock]".
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

/** Formatos de imagen aceptados (incluye HEIC/HEIF de iPhone). */
export const MIME_PERMITIDOS = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

/** Límite de tamaño razonable para una foto de documento. */
export const TAM_MAX_BYTES = 12 * 1024 * 1024; // 12 MB

export function geminiDisponible(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export type MotivoFallo = "no_config" | "ilegible" | "api" | "parse";

export type ResultadoExtraccion<T> =
  | { ok: true; datos: T }
  | { ok: false; motivo: MotivoFallo; detalle?: string };

/**
 * Envía una imagen + instrucción a Gemini y devuelve JSON estructurado.
 * `schema` es un responseSchema (subconjunto de OpenAPI) que fuerza la forma
 * de la respuesta; con temperature 0 para máxima fidelidad.
 */
export async function extraerDeImagen<T>(opts: {
  base64: string;
  mimeType: string;
  instruccion: string;
  schema: unknown;
}): Promise<ResultadoExtraccion<T>> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, motivo: "no_config" };

  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/${MODEL}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: opts.instruccion },
              { inline_data: { mime_type: opts.mimeType, data: opts.base64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: opts.schema,
        },
      }),
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, motivo: "api", detalle: `fetch: ${(e as Error)?.message ?? "sin red"}` };
  }

  if (!res.ok) {
    let cuerpo = "";
    try {
      cuerpo = await res.text();
    } catch {
      /* ignorar */
    }
    // Extraer el mensaje de error de Gemini si viene en JSON.
    let msg = cuerpo.slice(0, 300);
    try {
      const j = JSON.parse(cuerpo) as { error?: { message?: string; status?: string } };
      if (j.error?.message) msg = `${j.error.status ?? ""} ${j.error.message}`.trim();
    } catch {
      /* el cuerpo no era JSON */
    }
    console.error(`[gemini] ${res.status} modelo=${MODEL}: ${msg}`);
    return { ok: false, motivo: "api", detalle: `HTTP ${res.status} · modelo ${MODEL} · ${msg}` };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, motivo: "parse" };
  }

  const text = (json as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  })?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return { ok: false, motivo: "ilegible" };

  try {
    return { ok: true, datos: JSON.parse(text) as T };
  } catch {
    return { ok: false, motivo: "parse" };
  }
}

/** Mensaje claro para el usuario según el motivo del fallo (nunca técnico). */
export function mensajeFallo(motivo: MotivoFallo): string {
  switch (motivo) {
    case "no_config":
      return "El escaneo con IA no está disponible ahora. Puedes llenar el formulario a mano.";
    case "ilegible":
      return "No pude leer el documento con seguridad. Toma una foto más clara o llena a mano. (No invento datos.)";
    case "api":
      return "Hubo un problema con el servicio de IA. Intenta de nuevo en un momento o llena a mano.";
    case "parse":
      return "La IA devolvió una respuesta que no pude interpretar. Intenta de nuevo o llena a mano.";
  }
}
