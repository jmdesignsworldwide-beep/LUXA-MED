"use client";

import * as React from "react";
import { Camera, Loader2, Sparkles, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

type Motivo = "no_config" | "ilegible" | "api" | "parse";
export type ResultadoScan<T> =
  | { ok: true; datos: T; campos: string[] }
  | { ok: false; motivo: Motivo };

const MENSAJES: Record<Motivo, string> = {
  no_config: "El escaneo con IA no está disponible ahora. Puedes llenar el formulario a mano.",
  ilegible:
    "No pude leer el documento con seguridad. Toma una foto más clara o llena a mano. (No invento datos.)",
  api: "Hubo un problema con el servicio de IA. Intenta de nuevo en un momento o llena a mano.",
  parse: "La IA devolvió algo que no pude interpretar. Intenta de nuevo o llena a mano.",
};

/**
 * Widget reusable de escaneo de documentos con IA.
 * Renderiza el <input type="file"> con el `name` dado DENTRO del formulario
 * padre, para que la imagen también se envíe al guardar (respaldo). La IA solo
 * LLENA; el humano revisa y confirma antes de guardar.
 */
export function EscanerDocumento<T>({
  name,
  etiqueta,
  descripcion,
  accion,
  onResultado,
}: {
  name: string;
  etiqueta: string;
  descripcion: string;
  accion: (fd: FormData) => Promise<ResultadoScan<T>>;
  onResultado: (datos: T, campos: string[]) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [estado, setEstado] = React.useState<"idle" | "cargando" | "ok" | "error">("idle");
  const [mensaje, setMensaje] = React.useState("");
  const [archivo, setArchivo] = React.useState("");

  async function escanear() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setEstado("error");
      setMensaje("Primero elige o toma una foto del documento.");
      return;
    }
    const fd = new FormData();
    fd.append(name, file);
    setEstado("cargando");
    setMensaje("");
    try {
      const res = await accion(fd);
      if (res.ok) {
        onResultado(res.datos, res.campos);
        setEstado("ok");
        setMensaje(
          `Listo. Revisa ${res.campos.length} campo${res.campos.length === 1 ? "" : "s"} resaltado${res.campos.length === 1 ? "" : "s"} ✨`,
        );
      } else {
        setEstado("error");
        setMensaje(MENSAJES[res.motivo]);
      }
    } catch {
      setEstado("error");
      setMensaje("No se pudo completar el escaneo. Intenta de nuevo.");
    }
  }

  return (
    <div className="rounded-capsule border border-dashed border-brand-cyan/40 bg-brand-cyan/5 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-brand-cyan/15 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{etiqueta}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{descripcion}</p>

          <input
            ref={inputRef}
            type="file"
            name={name}
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={(e) => {
              setArchivo(e.target.files?.[0]?.name ?? "");
              setEstado("idle");
              setMensaje("");
            }}
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {archivo ? "Cambiar imagen" : "Elegir / tomar foto"}
            </Button>
            <Button
              type="button"
              variant="vital"
              size="sm"
              onClick={escanear}
              disabled={estado === "cargando" || !archivo}
            >
              {estado === "cargando" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Leyendo el documento…
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" /> Escanear con IA
                </>
              )}
            </Button>
          </div>

          {archivo && (
            <p className="mt-2 truncate text-xs text-muted-foreground">📎 {archivo}</p>
          )}
          {mensaje && (
            <p
              className={`mt-2 text-xs font-medium ${
                estado === "ok"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : estado === "error"
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              {mensaje}
            </p>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            La IA <strong>llena</strong>, no guarda. Revisa cada dato antes de confirmar — nunca inventa.
          </p>
        </div>
      </div>
    </div>
  );
}
