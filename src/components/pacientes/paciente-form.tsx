"use client";

import * as React from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { type RegistroState } from "@/app/pacientes/nuevo/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ARS_OPCIONES,
  SEXO_OPCIONES,
  TIPOS_SANGRE,
} from "@/lib/constants/pacientes";
import { formatCedula, formatTelefonoRD } from "@/lib/format";

export type PacienteDefaults = {
  nombre_completo?: string;
  cedula?: string;
  fecha_nacimiento?: string;
  sexo?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  tipo_sangre?: string;
  alergias?: string;
  contacto_emergencia_nombre?: string;
  contacto_emergencia_telefono?: string;
  ars?: string;
  ars_numero_afiliado?: string;
};

function ErrorMsg({
  id,
  errors,
}: {
  id: string;
  errors?: Record<string, string[]>;
}) {
  const msg = errors?.[id]?.[0];
  if (!msg) return null;
  return <p className="text-sm text-destructive">{msg}</p>;
}

function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function GuardarButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="vital" size="lg" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Guardando…
        </>
      ) : (
        label
      )}
    </Button>
  );
}

/**
 * Formulario único de paciente — reusable para crear y editar.
 * `action` decide qué pasa al guardar; `defaults` precarga los valores.
 */
export function PacienteForm({
  action,
  defaults,
  submitLabel = "Guardar paciente",
}: {
  action: (prev: RegistroState, formData: FormData) => Promise<RegistroState>;
  defaults?: PacienteDefaults;
  submitLabel?: string;
}) {
  const [state, formAction] = useFormState<RegistroState, FormData>(action, {
    ok: false,
  });
  const errors = state.errors;

  // Campos con máscara (controlados)
  const [cedula, setCedula] = React.useState(defaults?.cedula ?? "");
  const [telefono, setTelefono] = React.useState(defaults?.telefono ?? "");
  const [telEmergencia, setTelEmergencia] = React.useState(
    defaults?.contacto_emergencia_telefono ?? "",
  );

  return (
    <form action={formAction} className="space-y-8">
      {state.message && !state.ok && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.message}
        </div>
      )}

      <Seccion titulo="Identidad">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="nombre_completo">Nombre completo *</Label>
          <Input
            id="nombre_completo"
            name="nombre_completo"
            defaultValue={defaults?.nombre_completo}
            required
          />
          <ErrorMsg id="nombre_completo" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cedula">Cédula *</Label>
          <Input
            id="cedula"
            name="cedula"
            inputMode="numeric"
            placeholder="000-0000000-0"
            value={cedula}
            onChange={(e) => setCedula(formatCedula(e.target.value))}
            required
          />
          <ErrorMsg id="cedula" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fecha_nacimiento">Fecha de nacimiento</Label>
          <Input
            id="fecha_nacimiento"
            name="fecha_nacimiento"
            type="date"
            defaultValue={defaults?.fecha_nacimiento}
          />
          <ErrorMsg id="fecha_nacimiento" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sexo">Sexo</Label>
          <Select id="sexo" name="sexo" defaultValue={defaults?.sexo ?? ""}>
            <option value="">Selecciona…</option>
            {SEXO_OPCIONES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <ErrorMsg id="sexo" errors={errors} />
        </div>
      </Seccion>

      <Seccion titulo="Contacto">
        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            name="telefono"
            inputMode="numeric"
            placeholder="809-000-0000"
            value={telefono}
            onChange={(e) => setTelefono(formatTelefonoRD(e.target.value))}
          />
          <ErrorMsg id="telefono" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="correo@ejemplo.do"
            defaultValue={defaults?.email}
          />
          <ErrorMsg id="email" errors={errors} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="direccion">Dirección</Label>
          <Textarea
            id="direccion"
            name="direccion"
            defaultValue={defaults?.direccion}
          />
          <ErrorMsg id="direccion" errors={errors} />
        </div>
      </Seccion>

      <Seccion titulo="Médico básico">
        <div className="space-y-2">
          <Label htmlFor="tipo_sangre">Tipo de sangre</Label>
          <Select
            id="tipo_sangre"
            name="tipo_sangre"
            defaultValue={defaults?.tipo_sangre ?? ""}
          >
            <option value="">Selecciona…</option>
            {TIPOS_SANGRE.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <ErrorMsg id="tipo_sangre" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="alergias">Alergias</Label>
          <Input
            id="alergias"
            name="alergias"
            placeholder="Ninguna / especificar"
            defaultValue={defaults?.alergias}
          />
          <ErrorMsg id="alergias" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contacto_emergencia_nombre">
            Contacto de emergencia (nombre)
          </Label>
          <Input
            id="contacto_emergencia_nombre"
            name="contacto_emergencia_nombre"
            defaultValue={defaults?.contacto_emergencia_nombre}
          />
          <ErrorMsg id="contacto_emergencia_nombre" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contacto_emergencia_telefono">
            Contacto de emergencia (teléfono)
          </Label>
          <Input
            id="contacto_emergencia_telefono"
            name="contacto_emergencia_telefono"
            inputMode="numeric"
            placeholder="809-000-0000"
            value={telEmergencia}
            onChange={(e) => setTelEmergencia(formatTelefonoRD(e.target.value))}
          />
          <ErrorMsg id="contacto_emergencia_telefono" errors={errors} />
        </div>
      </Seccion>

      <Seccion titulo="Seguro">
        <div className="space-y-2">
          <Label htmlFor="ars">ARS</Label>
          <Select id="ars" name="ars" defaultValue={defaults?.ars ?? ""}>
            <option value="">Selecciona…</option>
            {ARS_OPCIONES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
          <ErrorMsg id="ars" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ars_numero_afiliado">Número de afiliado</Label>
          <Input
            id="ars_numero_afiliado"
            name="ars_numero_afiliado"
            defaultValue={defaults?.ars_numero_afiliado}
          />
          <ErrorMsg id="ars_numero_afiliado" errors={errors} />
        </div>
      </Seccion>

      <div className="flex items-center gap-3 pt-2">
        <GuardarButton label={submitLabel} />
        <Button asChild variant="ghost">
          <Link href="/pacientes">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
