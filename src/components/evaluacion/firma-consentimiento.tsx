"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Download, Loader2, Lock, PenLine, Type } from "lucide-react";

import {
  firmarConsentimiento,
  type FirmaState,
} from "@/app/pacientes/[id]/evaluacion/firma-actions";
import { SignaturePad } from "@/components/evaluacion/signature-pad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CONSENTIMIENTO_TEXTO } from "@/lib/constants/consentimiento";

type FirmaExistente = {
  tipo_firma: string;
  firma_texto: string | null;
  firmado_en: string;
  pdf_hash: string;
  paciente_nombre: string;
} | null;

function FirmarButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="vital" size="lg" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Firmando…
        </>
      ) : (
        "Firmar consentimiento"
      )}
    </Button>
  );
}

export function FirmaConsentimiento({
  evaluacionId,
  pacienteId,
  firma,
  canSign,
  evaluacionExiste,
}: {
  evaluacionId: string | null;
  pacienteId: string;
  firma: FirmaExistente;
  canSign: boolean;
  evaluacionExiste: boolean;
}) {
  // Ya firmado: vista inmutable + descarga
  if (firma) {
    const fecha = new Intl.DateTimeFormat("es-DO", {
      timeZone: "America/Santo_Domingo",
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(firma.firmado_en));
    return (
      <div className="rounded-capsule border border-border/70 bg-card p-6 shadow-soft">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Lock className="h-4 w-4" />
          Consentimiento firmado (documento inmutable)
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Firmado por</dt>
            <dd className="font-medium">{firma.paciente_nombre}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Fecha y hora</dt>
            <dd className="font-medium">{fecha}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Tipo de firma</dt>
            <dd className="font-medium">
              {firma.tipo_firma === "dibujada" ? "Dibujada" : "Tipográfica"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Hash SHA-256 del PDF (verificación de integridad)
            </dt>
            <dd className="break-all font-mono text-xs">{firma.pdf_hash}</dd>
          </div>
        </dl>
        <div className="mt-5">
          <Button asChild>
            <a href={`/pacientes/${pacienteId}/consentimiento`} target="_blank" rel="noopener">
              <Download className="h-4 w-4" />
              Ver / descargar PDF
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <FormularioFirma
      evaluacionId={evaluacionId}
      pacienteId={pacienteId}
      canSign={canSign}
      evaluacionExiste={evaluacionExiste}
    />
  );
}

function FormularioFirma({
  evaluacionId,
  pacienteId,
  canSign,
  evaluacionExiste,
}: {
  evaluacionId: string | null;
  pacienteId: string;
  canSign: boolean;
  evaluacionExiste: boolean;
}) {
  const [modo, setModo] = React.useState<"dibujada" | "tipografica">("dibujada");
  const [firmaImagen, setFirmaImagen] = React.useState("");

  const action = evaluacionId
    ? firmarConsentimiento.bind(null, evaluacionId, pacienteId)
    : async () => ({ ok: false, message: "Guarda la evaluación primero." });
  const [state, formAction] = useFormState<FirmaState, FormData>(action, {
    ok: false,
  });

  if (!evaluacionExiste) {
    return (
      <div className="rounded-capsule border border-border/70 bg-muted/40 p-6 text-sm text-muted-foreground">
        Guarda la evaluación primero para poder firmar el consentimiento.
      </div>
    );
  }

  if (!canSign) {
    return (
      <div className="rounded-capsule border border-border/70 bg-muted/40 p-6 text-sm text-muted-foreground">
        Consentimiento pendiente de firma. Solo la doctora (admin) puede
        registrarla.
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-capsule border border-border/70 bg-card p-6 shadow-soft"
    >
      <p className="max-h-40 overflow-y-auto whitespace-pre-line rounded-2xl bg-muted/50 p-4 text-xs text-muted-foreground">
        {CONSENTIMIENTO_TEXTO}
      </p>

      {state.message && !state.ok && (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.message}
        </div>
      )}

      {/* Selector de modo */}
      <div className="mt-5 flex gap-2">
        <Button
          type="button"
          variant={modo === "dibujada" ? "default" : "outline"}
          onClick={() => setModo("dibujada")}
        >
          <PenLine className="h-4 w-4" />
          Firmar con el dedo
        </Button>
        <Button
          type="button"
          variant={modo === "tipografica" ? "default" : "outline"}
          onClick={() => setModo("tipografica")}
        >
          <Type className="h-4 w-4" />
          Firma tipográfica
        </Button>
      </div>

      <input type="hidden" name="tipo_firma" value={modo} />

      <div className="mt-4">
        {modo === "dibujada" ? (
          <>
            <SignaturePad onChange={setFirmaImagen} />
            <input type="hidden" name="firma_imagen" value={firmaImagen} />
          </>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="firma_texto">Nombre completo (como firma)</Label>
            <Input
              id="firma_texto"
              name="firma_texto"
              placeholder="Escriba su nombre completo"
            />
          </div>
        )}
      </div>

      <label className="mt-5 flex items-start gap-2 text-sm">
        <input type="checkbox" name="acepta" value="1" className="mt-0.5 h-4 w-4 rounded border-input" />
        <span>
          El paciente declara haber leído y acepta el consentimiento informado.
        </span>
      </label>

      <div className="mt-5">
        <FirmarButton />
      </div>
    </form>
  );
}
