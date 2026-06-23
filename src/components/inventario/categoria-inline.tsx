"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Plus } from "lucide-react";

import type { InventarioState } from "@/app/inventario/actions";
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

export function CategoriaInline({
  action,
  placeholder,
}: {
  action: (prev: InventarioState, formData: FormData) => Promise<InventarioState>;
  placeholder: string;
}) {
  const [state, formAction] = useFormState<InventarioState, FormData>(action, { ok: false });
  return (
    <form action={formAction} className="space-y-1">
      <div className="flex gap-2">
        <Input name="nombre" placeholder={placeholder} />
        <Btn />
      </div>
      {state.message && (
        <p className={`text-xs ${state.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
          {state.ok ? "✓ " : ""}{state.message}
        </p>
      )}
    </form>
  );
}
