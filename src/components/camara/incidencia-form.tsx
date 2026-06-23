"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Plus } from "lucide-react";

import { registrarIncidencia, type CamaraState } from "@/app/camara/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { hoyRD } from "@/lib/format";

function Err({ id, errors }: { id: string; errors?: Record<string, string[]> }) {
  const m = errors?.[id]?.[0];
  return m ? <p className="text-sm text-destructive">{m}</p> : null;
}

function GuardarButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" /> Registrar incidencia
        </>
      )}
    </Button>
  );
}

export function IncidenciaForm() {
  const [state, formAction] = useFormState<CamaraState, FormData>(
    registrarIncidencia,
    { ok: false },
  );
  const errors = state.errors;
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.ok && state.message && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          ✓ {state.message}
        </div>
      )}
      {!state.ok && state.message && (
        <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="i-fecha">Fecha</Label>
        <Input id="i-fecha" name="fecha" type="date" defaultValue={hoyRD()} />
        <Err id="fecha" errors={errors} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="i-desc">¿Qué pasó?</Label>
        <Textarea id="i-desc" name="descripcion" placeholder="Describe la falla o el problema…" />
        <Err id="descripcion" errors={errors} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="i-res">¿Cómo se resolvió? (si ya se resolvió)</Label>
        <Textarea id="i-res" name="resolucion" placeholder="Opcional — solución aplicada…" />
        <Err id="resolucion" errors={errors} />
      </div>

      <GuardarButton />
    </form>
  );
}
