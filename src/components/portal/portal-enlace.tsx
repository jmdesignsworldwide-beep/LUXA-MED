"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  Check,
  Copy,
  Link2,
  Loader2,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

import {
  generarEnlacePortal,
  guardarTelefonoPortal,
  registrarCompartido,
  revocarEnlacePortal,
  type EnlaceState,
  type TelefonoState,
} from "@/app/pacientes/[id]/portal/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatFecha, formatHoraRD, telefonoWhatsAppRD } from "@/lib/format";

function GenerarButton({ regenerar }: { regenerar: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={regenerar ? "outline" : "vital"} disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Generando…
        </>
      ) : (
        <>
          <Link2 className="h-4 w-4" />
          {regenerar ? "Generar enlace nuevo" : "Generar enlace del portal"}
        </>
      )}
    </Button>
  );
}

function GuardarTelButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar número"}
    </Button>
  );
}

function EnvioWhatsApp({
  pacienteId,
  pacienteNombre,
  telefono,
  url,
}: {
  pacienteId: string;
  pacienteNombre: string;
  telefono: string | null;
  url: string;
}) {
  const numero = telefonoWhatsAppRD(telefono);
  const primerNombre = pacienteNombre.trim().split(/\s+/)[0];
  const mensaje = `Hola ${primerNombre}, aquí puede ver su progreso y sus citas en LUXAMED Hiperbárica: ${url}. Para acceder, verifique su identidad con su cédula o fecha de nacimiento.`;

  const [telState, telAction] = useFormState<TelefonoState, FormData>(
    guardarTelefonoPortal.bind(null, pacienteId),
    { ok: false },
  );

  if (!numero) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
          Este paciente no tiene un número de WhatsApp válido guardado.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Agrégalo aquí para enviarle el enlace. Se guardará en su ficha.
        </p>
        <form action={telAction} className="mt-3 flex flex-wrap items-start gap-2">
          <div className="flex-1">
            <Label htmlFor="tel-portal" className="sr-only">
              Teléfono
            </Label>
            <Input
              id="tel-portal"
              name="telefono"
              inputMode="tel"
              placeholder="809-555-1234"
              defaultValue={telefono ?? ""}
            />
            {telState.message && (
              <p className="mt-1 text-sm text-destructive">{telState.message}</p>
            )}
          </div>
          <GuardarTelButton />
        </form>
      </div>
    );
  }

  return (
    <Button
      asChild
      variant="vital"
      className="bg-[#25D366] text-white hover:bg-[#1ebe5b]"
    >
      <a
        href={`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          void registrarCompartido(pacienteId, "whatsapp");
        }}
      >
        <MessageCircle className="h-4 w-4" />
        Enviar por WhatsApp
      </a>
    </Button>
  );
}

export function PortalEnlace({
  pacienteId,
  pacienteNombre,
  telefono,
  tieneEnlace,
  ultimoAcceso,
}: {
  pacienteId: string;
  pacienteNombre: string;
  telefono: string | null;
  tieneEnlace: boolean;
  ultimoAcceso: string | null;
}) {
  const [state, formAction] = useFormState<EnlaceState, FormData>(
    generarEnlacePortal.bind(null, pacienteId),
    { ok: false },
  );
  const [copiado, setCopiado] = React.useState(false);

  const url = state.url;

  async function copiar() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Si el navegador bloquea el portapapeles, el enlace sigue visible.
    }
  }

  return (
    <div className="rounded-capsule border border-border/70 bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          Portal del paciente
        </h2>
        {tieneEnlace && !url && (
          <span className="inline-flex items-center rounded-pill bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Enlace activo
          </span>
        )}
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Enlace seguro para que el paciente vea, desde su teléfono, sus citas y su
        progreso. Antes de entrar debe verificar su identidad (cédula o fecha de
        nacimiento). El enlace no se puede adivinar.
      </p>

      {tieneEnlace && !url && (
        <p className="mt-2 text-xs text-muted-foreground">
          {ultimoAcceso
            ? `Último acceso del paciente: ${formatFecha(ultimoAcceso)} ${formatHoraRD(ultimoAcceso)}.`
            : "El paciente aún no ha entrado."}{" "}
          Por seguridad, el enlace solo se muestra al generarlo. Para enviarlo de
          nuevo, genera uno nuevo (el anterior deja de funcionar).
        </p>
      )}

      {state.message && !state.ok && (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.message}
        </div>
      )}

      {url ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              Enlace generado
            </p>
            <p className="mt-1 break-all font-mono text-sm">{url}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              ⚠️ Compártelo ahora: por seguridad no se vuelve a mostrar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <EnvioWhatsApp
              pacienteId={pacienteId}
              pacienteNombre={pacienteNombre}
              telefono={telefono}
              url={url}
            />
            <Button type="button" variant="outline" onClick={copiar}>
              {copiado ? (
                <>
                  <Check className="h-4 w-4" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copiar enlace
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <form action={formAction}>
            <GenerarButton regenerar={tieneEnlace} />
          </form>
          {tieneEnlace && (
            <ConfirmDialog
              triggerLabel="Revocar acceso"
              triggerVariant="ghost"
              title="¿Revocar el acceso del portal?"
              description="El enlace actual dejará de funcionar de inmediato. El paciente no podrá entrar hasta que generes uno nuevo."
              confirmLabel="Sí, revocar"
              confirmVariant="destructive"
              action={revocarEnlacePortal.bind(null, pacienteId)}
            />
          )}
        </div>
      )}
    </div>
  );
}
