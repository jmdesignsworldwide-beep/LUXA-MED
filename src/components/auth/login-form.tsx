"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

import { iniciarSesion, type LoginState } from "@/app/login/actions";
import { BlurInText } from "@/components/fx/blur-in-text";
import { MagneticCard } from "@/components/fx/magnetic-card";
import { SpringTransition } from "@/components/fx/spring-transition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="vital"
      size="lg"
      className="w-full"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Entrando…
        </>
      ) : (
        "Iniciar sesión"
      )}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState<LoginState, FormData>(
    iniciarSesion,
    undefined,
  );
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <form action={formAction} className="w-full">
      {/* Título con blur-in */}
      <div className="space-y-2">
        <BlurInText
          as="h1"
          className="text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          Iniciar sesión
        </BlurInText>
        <BlurInText
          as="p"
          delay={0.08}
          className="text-sm text-muted-foreground"
        >
          Accede al panel de LUXAMED.
        </BlurInText>
      </div>

      {/* Campos + botón en cascada con spring */}
      <SpringTransition className="mt-8 space-y-5">
        {state?.error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="tucorreo@luxamed.do"
              className="pl-11"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="px-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={
                showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <MagneticCard className="rounded-pill">
          <SubmitButton />
        </MagneticCard>
      </SpringTransition>
    </form>
  );
}
