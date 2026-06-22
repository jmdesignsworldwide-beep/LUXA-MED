"use client";

import * as React from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import {
  registrarPaciente,
  type RegistroState,
} from "@/app/pacientes/nuevo/actions";
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

function ErrorMsg({ id, errors }: { id: string; errors?: Record<string, string[]> }) {
  const msg = errors?.[id]?.[0];
  if (!msg) return null;
  return (
    <p id={`${id}-error`} className="text-sm text-destructive">
      {msg}
    </p>
  );
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

function GuardarButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="vital" size="lg" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Guardando…
        </>
      ) : (
        "Guardar paciente"
      )}
    </Button>
  );
}

export function PacienteForm() {
  const [state, formAction] = useFormState<RegistroState, FormData>(
    registrarPaciente,
    { ok: false },
  );
  const errors = state.errors;

  // Máscaras controladas
  const [cedula, setCedula] = React.useState("");
  const [telefono, setTelefono] = React.useState("");
  const [telEmergencia, setTelEmergencia] = React.useState("");

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

      {/* Identidad */}
      <Seccion titulo="Identidad">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="nombre_completo">Nombre completo *</Label>
          <Input id="nombre_completo" name="nombre_completo" required />
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
          <Input id="fecha_nacimiento" name="fecha_nacimiento" type="date" />
          <ErrorMsg id="fecha_nacimiento" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sexo">Sexo</Label>
          <Select id="sexo" name="sexo" defaultValue="">
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

      {/* Contacto */}
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
          <Input id="email" name="email" type="email" placeholder="correo@ejemplo.do" />
          <ErrorMsg id="email" errors={errors} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="direccion">Dirección</Label>
          <Textarea id="direccion" name="direccion" />
          <ErrorMsg id="direccion" errors={errors} />
        </div>
      </Seccion>

      {/* Médico básico */}
      <Seccion titulo="Médico básico">
        <div className="space-y-2">
          <Label htmlFor="tipo_sangre">Tipo de sangre</Label>
          <Select id="tipo_sangre" name="tipo_sangre" defaultValue="">
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
          <Input id="alergias" name="alergias" placeholder="Ninguna / especificar" />
          <ErrorMsg id="alergias" errors={errors} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contacto_emergencia_nombre">
            Contacto de emergencia (nombre)
          </Label>
          <Input
            id="contacto_emergencia_nombre"
            name="contacto_emergencia_nombre"
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

      {/* Seguro */}
      <Seccion titulo="Seguro">
        <div className="space-y-2">
          <Label htmlFor="ars">ARS</Label>
          <Select id="ars" name="ars" defaultValue="">
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
          <Input id="ars_numero_afiliado" name="ars_numero_afiliado" />
          <ErrorMsg id="ars_numero_afiliado" errors={errors} />
        </div>
      </Seccion>

      <div className="flex items-center gap-3 pt-2">
        <GuardarButton />
        <Button asChild variant="ghost">
          <Link href="/pacientes">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
