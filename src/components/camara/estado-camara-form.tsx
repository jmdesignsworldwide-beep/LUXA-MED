"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { actualizarEstadoCamara, type CamaraState } from "@/app/camara/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CAMARA_ESTADOS, CAMARA_ESTADO_LABEL } from "@/lib/constants/camara";

function GuardarButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
        </>
      ) : (
        "Guardar estado"
      )}
    </Button>
  );
}

export function EstadoCamaraForm({
  estado,
  estadoNota,
  proximoMantenimiento,
}: {
  estado: string;
  estadoNota: string | null;
  proximoMantenimiento: string | null;
}) {
  const [state, formAction] = useFormState<CamaraState, FormData>(
    actualizarEstadoCamara,
    { ok: false },
  );

  return (
    <form action={formAction} className="space-y-4">
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
          <Label htmlFor="e-estado">Estado de la cámara</Label>
          <Select id="e-estado" name="estado" defaultValue={estado}>
            {CAMARA_ESTADOS.map((s) => (
              <option key={s} value={s}>{CAMARA_ESTADO_LABEL[s]}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="e-prox">Próximo mantenimiento</Label>
          <Input
            id="e-prox"
            name="proximo_mantenimiento"
            type="date"
            defaultValue={proximoMantenimiento ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="e-nota">Nota del estado (opcional)</Label>
        <Input
          id="e-nota"
          name="estado_nota"
          placeholder="Ej. fuera de servicio por espera de repuesto"
          defaultValue={estadoNota ?? ""}
        />
      </div>

      <GuardarButton />
    </form>
  );
}
