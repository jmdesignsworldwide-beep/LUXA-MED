"use client";

import { useFormState, useFormStatus } from "react-dom";
import { ArrowDownCircle, ArrowUpCircle, Loader2 } from "lucide-react";

import {
  registrarEntrada,
  registrarSalida,
  type InventarioState,
} from "@/app/inventario/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hoyRD } from "@/lib/format";

function Err({ id, errors }: { id: string; errors?: Record<string, string[]> }) {
  const m = errors?.[id]?.[0];
  return m ? <p className="text-sm text-destructive">{m}</p> : null;
}

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="default" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : label}
    </Button>
  );
}

/** Entrada: compra/reposición (solo admin). Refleja gasto en finanzas. */
export function EntradaForm({
  insumoId,
  costoSugerido,
  unidad,
}: {
  insumoId: string;
  costoSugerido: number;
  unidad: string;
}) {
  const action = registrarEntrada.bind(null, insumoId);
  const [state, formAction] = useFormState<InventarioState, FormData>(action, { ok: false });
  const errors = state.errors;

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ArrowUpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        Registrar entrada
      </div>
      {state.message && !state.ok && (
        <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="e_cantidad">Cantidad ({unidad})</Label>
          <Input id="e_cantidad" name="cantidad" type="number" min={0} step="0.01" placeholder="0" />
          <Err id="cantidad" errors={errors} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="e_costo">Costo unitario (RD$)</Label>
          <Input
            id="e_costo"
            name="costo_unitario"
            type="number"
            min={0}
            step="0.01"
            defaultValue={String(costoSugerido)}
          />
          <Err id="costo_unitario" errors={errors} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="e_fecha">Fecha</Label>
        <Input id="e_fecha" name="fecha" type="date" defaultValue={hoyRD()} />
        <Err id="fecha" errors={errors} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="e_motivo">Motivo (opcional)</Label>
        <Input id="e_motivo" name="motivo" placeholder="Compra, donación…" />
      </div>
      <p className="text-xs text-muted-foreground">
        Se registra como gasto en <strong>Insumos médicos</strong> (Finanzas).
      </p>
      <SubmitBtn label="Registrar entrada" />
    </form>
  );
}

/** Salida: uso/consumo (admin y enfermera). Resta stock. */
export function SalidaForm({
  insumoId,
  unidad,
}: {
  insumoId: string;
  unidad: string;
}) {
  const action = registrarSalida.bind(null, insumoId);
  const [state, formAction] = useFormState<InventarioState, FormData>(action, { ok: false });
  const errors = state.errors;

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ArrowDownCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        Registrar salida
      </div>
      {state.message && !state.ok && (
        <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="s_cantidad">Cantidad ({unidad})</Label>
          <Input id="s_cantidad" name="cantidad" type="number" min={0} step="0.01" placeholder="0" />
          <Err id="cantidad" errors={errors} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="s_fecha">Fecha</Label>
          <Input id="s_fecha" name="fecha" type="date" defaultValue={hoyRD()} />
          <Err id="fecha" errors={errors} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="s_motivo">Motivo (opcional)</Label>
        <Input id="s_motivo" name="motivo" placeholder="Uso en sesión, descarte…" />
      </div>
      <SubmitBtn label="Registrar salida" />
    </form>
  );
}
