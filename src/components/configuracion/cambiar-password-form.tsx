"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";

import {
  cambiarPassword,
  type PasswordState,
} from "@/app/configuracion/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ErrorMsg({
  id,
  errors,
}: {
  id: string;
  errors?: Record<string, string[]>;
}) {
  const m = errors?.[id]?.[0];
  return m ? <p className="text-sm text-destructive">{m}</p> : null;
}

function GuardarButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="vital" size="lg" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
        </>
      ) : (
        "Cambiar contraseña"
      )}
    </Button>
  );
}

export function CambiarPasswordForm() {
  const [state, formAction] = useFormState<PasswordState, FormData>(
    cambiarPassword,
    { ok: false },
  );
  const errors = state.errors;
  const formRef = React.useRef<HTMLFormElement>(null);

  // Al cambiar con éxito, limpiamos los campos.
  React.useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      {state.ok && state.message && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}
      {!state.ok && state.message && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.message}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="actual">Contraseña actual</Label>
        <Input
          id="actual"
          name="actual"
          type="password"
          autoComplete="current-password"
        />
        <ErrorMsg id="actual" errors={errors} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nueva">Contraseña nueva</Label>
        <Input
          id="nueva"
          name="nueva"
          type="password"
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">
          Mínimo 8 caracteres, con al menos una letra y un número. Recomendamos
          combinar mayúsculas, minúsculas, números y símbolos.
        </p>
        <ErrorMsg id="nueva" errors={errors} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmar">Confirmar contraseña nueva</Label>
        <Input
          id="confirmar"
          name="confirmar"
          type="password"
          autoComplete="new-password"
        />
        <ErrorMsg id="confirmar" errors={errors} />
      </div>

      <div className="pt-1">
        <GuardarButton />
      </div>
    </form>
  );
}
