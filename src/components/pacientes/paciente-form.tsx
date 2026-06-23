"use client";

import * as React from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Sparkles } from "lucide-react";

import {
  escanearDocumentoPaciente,
  type PacienteEscaneado,
  type RegistroState,
} from "@/app/pacientes/nuevo/actions";
import { EscanerDocumento } from "@/components/escaneo/escaner-documento";
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

type Campos = keyof PacienteDefaults;

function ErrorMsg({ id, errors }: { id: string; errors?: Record<string, string[]> }) {
  const msg = errors?.[id]?.[0];
  if (!msg) return null;
  return <p className="text-sm text-destructive">{msg}</p>;
}

function IaMarca({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-brand-cyan/15 px-2 py-0.5 text-[10px] font-medium text-primary">
      <Sparkles className="h-3 w-3" /> Revisar (IA)
    </span>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
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
 * Controlado: la IA puede LLENAR campos (que quedan resaltados para revisar);
 * el humano confirma con "Guardar". La IA nunca guarda sola.
 */
export function PacienteForm({
  action,
  defaults,
  submitLabel = "Guardar paciente",
  permitirEscaneo = false,
}: {
  action: (prev: RegistroState, formData: FormData) => Promise<RegistroState>;
  defaults?: PacienteDefaults;
  submitLabel?: string;
  permitirEscaneo?: boolean;
}) {
  const [state, formAction] = useFormState<RegistroState, FormData>(action, {
    ok: false,
  });
  const errors = state.errors;

  const [valores, setValores] = React.useState<Record<string, string>>({
    nombre_completo: defaults?.nombre_completo ?? "",
    cedula: defaults?.cedula ?? "",
    fecha_nacimiento: defaults?.fecha_nacimiento ?? "",
    sexo: defaults?.sexo ?? "",
    telefono: defaults?.telefono ?? "",
    email: defaults?.email ?? "",
    direccion: defaults?.direccion ?? "",
    tipo_sangre: defaults?.tipo_sangre ?? "",
    alergias: defaults?.alergias ?? "",
    contacto_emergencia_nombre: defaults?.contacto_emergencia_nombre ?? "",
    contacto_emergencia_telefono: defaults?.contacto_emergencia_telefono ?? "",
    ars: defaults?.ars ?? "",
    ars_numero_afiliado: defaults?.ars_numero_afiliado ?? "",
  });
  const [resaltados, setResaltados] = React.useState<Set<string>>(new Set());

  function set(name: Campos, val: string) {
    setValores((v) => ({ ...v, [name]: val }));
    setResaltados((r) => {
      if (!r.has(name)) return r;
      const n = new Set(r);
      n.delete(name);
      return n;
    });
  }

  function aplicarEscaneo(datos: PacienteEscaneado, campos: string[]) {
    setValores((v) => ({ ...v, ...datos }));
    setResaltados(new Set(campos));
  }

  const ring = (name: Campos) =>
    resaltados.has(name) ? "ring-2 ring-brand-cyan/60 bg-brand-cyan/5" : "";

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

      {permitirEscaneo && (
        <EscanerDocumento<PacienteEscaneado>
          name="documento"
          etiqueta="📸 Escanear documento (cédula u otro)"
          descripcion="Toma una foto o sube la imagen y la IA llena los datos. La imagen se guarda en el expediente."
          accion={escanearDocumentoPaciente}
          onResultado={aplicarEscaneo}
        />
      )}

      <Seccion titulo="Identidad">
        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="nombre_completo">Nombre completo *</Label>
            <IaMarca show={resaltados.has("nombre_completo")} />
          </div>
          <Input
            id="nombre_completo"
            name="nombre_completo"
            value={valores.nombre_completo}
            onChange={(e) => set("nombre_completo", e.target.value)}
            className={ring("nombre_completo")}
            required
          />
          <ErrorMsg id="nombre_completo" errors={errors} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="cedula">Cédula *</Label>
            <IaMarca show={resaltados.has("cedula")} />
          </div>
          <Input
            id="cedula"
            name="cedula"
            inputMode="numeric"
            placeholder="000-0000000-0"
            value={valores.cedula}
            onChange={(e) => set("cedula", formatCedula(e.target.value))}
            className={ring("cedula")}
            required
          />
          <ErrorMsg id="cedula" errors={errors} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="fecha_nacimiento">Fecha de nacimiento</Label>
            <IaMarca show={resaltados.has("fecha_nacimiento")} />
          </div>
          <Input
            id="fecha_nacimiento"
            name="fecha_nacimiento"
            type="date"
            value={valores.fecha_nacimiento}
            onChange={(e) => set("fecha_nacimiento", e.target.value)}
            className={ring("fecha_nacimiento")}
          />
          <ErrorMsg id="fecha_nacimiento" errors={errors} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="sexo">Sexo</Label>
            <IaMarca show={resaltados.has("sexo")} />
          </div>
          <Select
            id="sexo"
            name="sexo"
            value={valores.sexo}
            onChange={(e) => set("sexo", e.target.value)}
            className={ring("sexo")}
          >
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
          <div className="flex items-center gap-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <IaMarca show={resaltados.has("telefono")} />
          </div>
          <Input
            id="telefono"
            name="telefono"
            inputMode="numeric"
            placeholder="809-000-0000"
            value={valores.telefono}
            onChange={(e) => set("telefono", formatTelefonoRD(e.target.value))}
            className={ring("telefono")}
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
            value={valores.email}
            onChange={(e) => set("email", e.target.value)}
          />
          <ErrorMsg id="email" errors={errors} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="direccion">Dirección</Label>
            <IaMarca show={resaltados.has("direccion")} />
          </div>
          <Textarea
            id="direccion"
            name="direccion"
            value={valores.direccion}
            onChange={(e) => set("direccion", e.target.value)}
            className={ring("direccion")}
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
            value={valores.tipo_sangre}
            onChange={(e) => set("tipo_sangre", e.target.value)}
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
            value={valores.alergias}
            onChange={(e) => set("alergias", e.target.value)}
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
            value={valores.contacto_emergencia_nombre}
            onChange={(e) => set("contacto_emergencia_nombre", e.target.value)}
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
            value={valores.contacto_emergencia_telefono}
            onChange={(e) =>
              set("contacto_emergencia_telefono", formatTelefonoRD(e.target.value))
            }
          />
          <ErrorMsg id="contacto_emergencia_telefono" errors={errors} />
        </div>
      </Seccion>

      <Seccion titulo="Seguro">
        <div className="space-y-2">
          <Label htmlFor="ars">ARS</Label>
          <Select
            id="ars"
            name="ars"
            value={valores.ars}
            onChange={(e) => set("ars", e.target.value)}
          >
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
            value={valores.ars_numero_afiliado}
            onChange={(e) => set("ars_numero_afiliado", e.target.value)}
          />
          <ErrorMsg id="ars_numero_afiliado" errors={errors} />
        </div>
      </Seccion>

      {resaltados.size > 0 && (
        <div className="rounded-2xl border border-brand-cyan/30 bg-brand-cyan/5 px-4 py-3 text-xs text-muted-foreground">
          <Sparkles className="mr-1 inline h-3.5 w-3.5 text-primary" />
          Los campos marcados los llenó la IA desde el documento. Revísalos y corrígelos
          si hace falta antes de guardar.
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <GuardarButton label={submitLabel} />
        <Button asChild variant="ghost">
          <Link href="/pacientes">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
