"use client";

import * as React from "react";
import { Camera, Loader2, RefreshCw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

type Motivo = "no_config" | "ilegible" | "api" | "parse";
export type ResultadoScan<T> =
  | { ok: true; datos: T; campos: string[] }
  | { ok: false; motivo: Motivo; detalle?: string };

const MENSAJES: Record<Motivo, string> = {
  no_config: "El escaneo con IA no está disponible ahora. Puedes llenar el formulario a mano.",
  ilegible:
    "No pude leer el documento con seguridad. Toma una foto más clara o llena a mano. (No invento datos.)",
  api: "Hubo un problema con el servicio de IA. Intenta de nuevo en un momento o llena a mano.",
  parse: "La IA devolvió algo que no pude interpretar. Intenta de nuevo o llena a mano.",
};

/**
 * Widget reusable de escaneo de documentos con IA.
 * UN SOLO botón: al pulsarlo abre la cámara (móvil) o el selector (compu) y al
 * elegir/tomar la foto ESCANEA automáticamente (sin segundo clic). El <input>
 * vive dentro del formulario padre (name dado) para enviar también la imagen al
 * guardar (respaldo). La IA solo LLENA; el humano revisa y confirma.
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
  const inputId = React.useId();
  const [estado, setEstado] = React.useState<"idle" | "cargando" | "ok" | "error">("idle");
  const [mensaje, setMensaje] = React.useState("");
  const [detalle, setDetalle] = React.useState("");
  const [archivo, setArchivo] = React.useState("");

  async function escanear(file: File) {
    const fd = new FormData();
    fd.append(name, file);
    setEstado("cargando");
    setMensaje("");
    setDetalle("");
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
        setDetalle(res.detalle ?? "");
      }
    } catch (e) {
      setEstado("error");
      setMensaje("No se pudo completar el escaneo. Intenta de nuevo.");
      setDetalle((e as Error)?.message ?? "");
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setArchivo(f.name || "imagen");
    void escanear(f); // escanea automáticamente, sin segundo clic
  }

  const cargando = estado === "cargando";

  return (
    <div className="rounded-capsule border border-dashed border-brand-cyan/40 bg-brand-cyan/5 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-brand-cyan/15 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{etiqueta}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{descripcion}</p>

          {/*
            Input nativo asociado a un <label> (sin click programático ni
            display:none) para que onChange se dispare también en Safari/iPhone.
            capture="environment" sugiere la cámara trasera en móvil; en compu
            abre el selector de archivos. Permanece montado para enviarse al
            guardar.
          */}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            name={name}
            accept="image/*,.heic,.heif"
            capture="environment"
            className="sr-only"
            onChange={onChange}
          />

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {cargando ? (
              <Button type="button" variant="vital" size="sm" disabled>
                <Loader2 className="h-4 w-4 animate-spin" /> Leyendo el documento…
              </Button>
            ) : (
              <Button asChild variant="vital" size="sm">
                <label htmlFor={inputId} className="cursor-pointer">
                  <Camera className="h-4 w-4" />
                  {estado === "ok" || estado === "error" ? "Escanear otra imagen" : "📸 Escanear documento con IA"}
                </label>
              </Button>
            )}

            {/* Acceso pequeño para cambiar la imagen / reintentar tras un resultado. */}
            {(estado === "ok" || estado === "error") && !cargando && (
              <label
                htmlFor={inputId}
                className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Cambiar imagen
              </label>
            )}
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
          {detalle && estado === "error" && (
            <p className="mt-1 break-words text-[11px] text-muted-foreground/80">
              Detalle técnico: {detalle}
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
