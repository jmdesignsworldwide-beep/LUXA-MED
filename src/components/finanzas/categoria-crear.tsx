"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Plus } from "lucide-react";

import { crearCategoria, type FinanzasState } from "@/app/finanzas/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function Btn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="vital" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      Añadir
    </Button>
  );
}

export function CategoriaCrear() {
  const [state, formAction] = useFormState<FinanzasState, FormData>(crearCategoria, { ok: false });
  return (
    <form action={formAction} className="space-y-2">
      <div className="flex gap-2">
        <Input name="nombre" placeholder="Nueva categoría de gasto…" />
        <Btn />
      </div>
      {state.message && (
        <p className={`text-sm ${state.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
          {state.ok ? "✓ " : ""}{state.message}
        </p>
      )}
    </form>
  );
}
