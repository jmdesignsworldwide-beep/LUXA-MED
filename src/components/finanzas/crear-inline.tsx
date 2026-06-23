"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Plus } from "lucide-react";

import type { FinanzasState } from "@/app/finanzas/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function Btn({ size = "default" }: { size?: "default" | "sm" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={size === "sm" ? "outline" : "vital"} size={size} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      Añadir
    </Button>
  );
}

export function CrearInline({
  action,
  placeholder,
  size = "default",
}: {
  action: (prev: FinanzasState, formData: FormData) => Promise<FinanzasState>;
  placeholder: string;
  size?: "default" | "sm";
}) {
  const [state, formAction] = useFormState<FinanzasState, FormData>(action, { ok: false });
  return (
    <form action={formAction} className="space-y-1">
      <div className="flex gap-2">
        <Input name="nombre" placeholder={placeholder} className={size === "sm" ? "h-9" : ""} />
        <Btn size={size} />
      </div>
      {state.message && (
        <p className={`text-xs ${state.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
          {state.ok ? "✓ " : ""}{state.message}
        </p>
      )}
    </form>
  );
}
