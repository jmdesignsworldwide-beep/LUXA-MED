"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Plus } from "lucide-react";

import {
  registrarMantenimiento,
  type CamaraState,
} from "@/app/camara/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MANTENIMIENTO_TIPOS, MANTENIMIENTO_TIPO_LABEL } from "@/lib/constants/camara";
import { hoyRD } from "@/lib/format";

function Err({ id, errors }: { id: string; errors?: Record<string, string[]> }) {
  const m = errors?.[id]?.[0];
  return m ? <p className="text-sm text-destructive">{m}</p> : null;
}

function GuardarButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="vital" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" /> Registrar mantenimiento
        </>
      )}
    </Button>
  );
}

export function MantenimientoForm() {
  const [state, formAction] = useFormState<CamaraState, FormData>(
    registrarMantenimiento,
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="m-fecha">Fecha</Label>
          <Input id="m-fecha" name="fecha" type="date" defaultValue={hoyRD()} />
          <Err id="fecha" errors={errors} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="m-tipo">Tipo</Label>
          <Select id="m-tipo" name="tipo" defaultValue="preventivo">
            {MANTENIMIENTO_TIPOS.map((t) => (
              <option key={t} value={t}>{MANTENIMIENTO_TIPO_LABEL[t]}</option>
            ))}
          </Select>
          <Err id="tipo" errors={errors} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="m-desc">¿Qué se hizo?</Label>
        <Textarea id="m-desc" name="descripcion" placeholder="Detalle del trabajo realizado…" />
        <Err id="descripcion" errors={errors} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="m-quien">Realizado por (técnico/empresa)</Label>
          <Input id="m-quien" name="realizado_por" placeholder="Nombre del técnico o empresa" />
          <Err id="realizado_por" errors={errors} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="m-costo">Costo (RD$)</Label>
          <Input id="m-costo" name="costo" type="number" min={0} step="0.01" placeholder="0.00" />
          <Err id="costo" errors={errors} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="m-prox">Próximo mantenimiento programado</Label>
        <Input id="m-prox" name="proximo_mantenimiento" type="date" />
        <p className="text-xs text-muted-foreground">
          Opcional. Si lo anotas, aparecerá como el próximo mantenimiento de la cámara.
        </p>
        <Err id="proximo_mantenimiento" errors={errors} />
      </div>

      <GuardarButton />
    </form>
  );
}
