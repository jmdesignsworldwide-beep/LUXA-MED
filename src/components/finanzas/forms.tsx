"use client";

import * as React from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import {
  registrarGasto,
  registrarIngreso,
  type FinanzasState,
} from "@/app/finanzas/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { hoyRD } from "@/lib/format";

function Err({ id, errors }: { id: string; errors?: Record<string, string[]> }) {
  const m = errors?.[id]?.[0];
  return m ? <p className="text-sm text-destructive">{m}</p> : null;
}
function Guardar({ label }: { label: string }) {
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

export function GastoForm({ categorias }: { categorias: { id: string; nombre: string }[] }) {
  const [state, formAction] = useFormState<FinanzasState, FormData>(registrarGasto, { ok: false });
  const errors = state.errors;
  const [cat, setCat] = React.useState("");
  return (
    <form action={formAction} className="space-y-5">
      {state.message && !state.ok && (
        <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="monto">Monto (RD$)</Label>
          <Input id="monto" name="monto" type="number" min={0} step="0.01" placeholder="0.00" />
          <Err id="monto" errors={errors} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha">Fecha</Label>
          <Input id="fecha" name="fecha" type="date" defaultValue={hoyRD()} />
          <Err id="fecha" errors={errors} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="categoria_id">Categoría</Label>
        <Select
          id="categoria_id"
          name="categoria_id"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
        >
          <option value="" disabled>Elige una categoría…</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
          <option value="nueva">➕ Crear categoría nueva…</option>
        </Select>
        <Err id="categoria_id" errors={errors} />
        {cat === "nueva" && (
          <div className="pt-1">
            <Input name="nueva_categoria" placeholder="Nombre de la nueva categoría" autoFocus />
            <Err id="nueva_categoria" errors={errors} />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="nota">Nota (opcional)</Label>
        <Textarea id="nota" name="nota" placeholder="Ej. factura de luz de junio" />
        <Err id="nota" errors={errors} />
      </div>
      <div className="flex items-center gap-3">
        <Guardar label="Registrar gasto" />
        <Button asChild variant="ghost"><Link href="/finanzas">Cancelar</Link></Button>
      </div>
    </form>
  );
}

export function IngresoForm() {
  const [state, formAction] = useFormState<FinanzasState, FormData>(registrarIngreso, { ok: false });
  const errors = state.errors;
  return (
    <form action={formAction} className="space-y-5">
      {state.message && !state.ok && (
        <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="monto">Monto (RD$)</Label>
          <Input id="monto" name="monto" type="number" min={0} step="0.01" placeholder="0.00" />
          <Err id="monto" errors={errors} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha">Fecha</Label>
          <Input id="fecha" name="fecha" type="date" defaultValue={hoyRD()} />
          <Err id="fecha" errors={errors} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="concepto">Concepto</Label>
        <Input id="concepto" name="concepto" placeholder="Ej. Sesiones de la semana" />
        <Err id="concepto" errors={errors} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nota">Nota (opcional)</Label>
        <Textarea id="nota" name="nota" />
        <Err id="nota" errors={errors} />
      </div>
      <div className="flex items-center gap-3">
        <Guardar label="Registrar ingreso" />
        <Button asChild variant="ghost"><Link href="/finanzas">Cancelar</Link></Button>
      </div>
    </form>
  );
}
