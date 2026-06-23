"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, ShieldCheck } from "lucide-react";

import {
  verificarPortal,
  type VerifyState,
} from "@/app/portal/[token]/verificar/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCedula } from "@/lib/format";

function EntrarButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="vital" size="lg" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Verificando…
        </>
      ) : (
        "Entrar a mi portal"
      )}
    </Button>
  );
}

export function PortalVerifyForm({ token }: { token: string }) {
  const [state, formAction] = useFormState<VerifyState, FormData>(
    verificarPortal.bind(null, token),
    {},
  );
  const [cedula, setCedula] = React.useState("");

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="cedula">Cédula</Label>
        <Input
          id="cedula"
          name="cedula"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000-0000000-0"
          value={cedula}
          onChange={(e) => setCedula(formatCedula(e.target.value))}
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">o</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fecha">Fecha de nacimiento</Label>
        <Input id="fecha" name="fecha" type="date" autoComplete="off" />
      </div>

      <EntrarButton />

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        Tus datos están protegidos. Solo tú puedes ver tu información.
      </p>
    </form>
  );
}
