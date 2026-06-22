"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { breath } from "@/lib/motion";

function ConfirmSubmit({
  label,
  variant,
}: {
  label: string;
  variant: ButtonProps["variant"];
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : label}
    </Button>
  );
}

/**
 * Diálogo de confirmación reutilizable ("¿Estás seguro?").
 * El botón de confirmar envía un Server Action (pásalo en `action`, ya
 * enlazado con sus parámetros). Respeta prefers-reduced-motion.
 */
export function ConfirmDialog({
  triggerLabel,
  triggerVariant = "outline",
  title,
  description,
  confirmLabel = "Confirmar",
  confirmVariant = "destructive",
  action,
}: {
  triggerLabel: string;
  triggerVariant?: ButtonProps["variant"];
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: ButtonProps["variant"];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const reduced = useReducedMotion() ?? false;

  return (
    <>
      <Button variant={triggerVariant} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              className="relative z-10 w-full max-w-md rounded-capsule border border-border bg-card p-6 shadow-lift"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0, transition: breath(0.4) }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 6 }}
            >
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <form action={action}>
                  <ConfirmSubmit label={confirmLabel} variant={confirmVariant} />
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
