"use client";

import * as React from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { type InventarioState } from "@/app/inventario/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

function Err({ id, errors }: { id: string; errors?: Record<string, string[]> }) {
  const m = errors?.[id]?.[0];
  return m ? <p className="text-sm text-destructive">{m}</p> : null;
}

export type CategoriaOpcion = { id: string; nombre: string };

export type InsumoForm = {
  id: string;
  nombre: string;
  categoria_id: string | null;
  unidad: string;
  nivel_minimo: number;
  costo_unitario: number;
  proveedor: string | null;
};

function GuardarButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="vital" size="lg" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
        </>
      ) : (
        label
      )}
    </Button>
  );
}

export function InsumoFormulario({
  action,
  insumo,
  categorias,
}: {
  action: (prev: InventarioState, formData: FormData) => Promise<InventarioState>;
  insumo?: InsumoForm;
  categorias: CategoriaOpcion[];
}) {
  const [state, formAction] = useFormState<InventarioState, FormData>(action, { ok: false });
  const errors = state.errors;
  const editando = !!insumo;
  const [cat, setCat] = React.useState(insumo?.categoria_id ?? "");

  return (
    <form action={formAction} className="space-y-5">
      {state.message && !state.ok && (
        <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre del insumo</Label>
        <Input id="nombre" name="nombre" defaultValue={insumo?.nombre ?? ""} placeholder="Ej. Mascarilla de oxígeno" />
        <Err id="nombre" errors={errors} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="categoria_id">Categoría (opcional)</Label>
          <Select
            id="categoria_id"
            name="categoria_id"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          >
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
            <option value="nueva">➕ Crear categoría nueva…</option>
          </Select>
          {cat === "nueva" && (
            <div className="pt-1">
              <Input name="nueva_categoria" placeholder="Nombre de la nueva categoría" autoFocus />
              <Err id="nueva_categoria" errors={errors} />
            </div>
          )}
          <Err id="categoria_id" errors={errors} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unidad">Unidad</Label>
          <Input id="unidad" name="unidad" defaultValue={insumo?.unidad ?? "unidades"} placeholder="unidades, cajas, ml…" />
          <Err id="unidad" errors={errors} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nivel_minimo">Nivel mínimo (alerta)</Label>
          <Input
            id="nivel_minimo"
            name="nivel_minimo"
            type="number"
            min={0}
            step="0.01"
            defaultValue={insumo ? String(insumo.nivel_minimo) : "0"}
          />
          <p className="text-xs text-muted-foreground">Avisamos cuando el stock baje a este nivel.</p>
          <Err id="nivel_minimo" errors={errors} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="costo_unitario">Costo unitario (RD$)</Label>
          <Input
            id="costo_unitario"
            name="costo_unitario"
            type="number"
            min={0}
            step="0.01"
            defaultValue={insumo ? String(insumo.costo_unitario) : "0"}
            placeholder="0.00"
          />
          <Err id="costo_unitario" errors={errors} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="proveedor">Proveedor (opcional)</Label>
        <Input id="proveedor" name="proveedor" defaultValue={insumo?.proveedor ?? ""} placeholder="Ej. Suplidora Médica RD" />
        <Err id="proveedor" errors={errors} />
      </div>

      {!editando && (
        <div className="space-y-2">
          <Label htmlFor="stock_inicial">Stock inicial (opcional)</Label>
          <Input id="stock_inicial" name="stock_inicial" type="number" min={0} step="0.01" placeholder="0" />
          <p className="text-xs text-muted-foreground">
            Se registra como una entrada de apertura (no afecta finanzas).
          </p>
          <Err id="stock_inicial" errors={errors} />
        </div>
      )}

      <div className="flex items-center gap-3">
        <GuardarButton label={editando ? "Guardar cambios" : "Crear insumo"} />
        <Button asChild variant="ghost">
          <Link href={insumo ? `/inventario/${insumo.id}` : "/inventario"}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
