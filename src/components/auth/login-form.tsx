"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { motion } from "framer-motion";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

import { iniciarSesion, type LoginState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { breath, cascadeContainer, riseIn } from "@/lib/motion";

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
    <motion.form
      action={formAction}
      variants={cascadeContainer}
      initial="hidden"
      animate="show"
      className="w-full space-y-5"
    >
      {/* Título */}
      <motion.div variants={riseIn}>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Iniciar sesión
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Accede al panel de LUXAMED.
        </p>
      </motion.div>

      {/* Error elegante (rojo) */}
      {state?.error && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={breath(0.4)}
          className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </motion.div>
      )}

      {/* Correo */}
      <motion.div variants={riseIn} className="space-y-2">
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
      </motion.div>

      {/* Contraseña */}
      <motion.div variants={riseIn} className="space-y-2">
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
      </motion.div>

      {/* Botón */}
      <motion.div variants={riseIn} className="pt-1">
        <SubmitButton />
      </motion.div>
    </motion.form>
  );
}
