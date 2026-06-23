"use client";

import * as React from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Check, Copy, KeyRound, Loader2, Lock, RefreshCw } from "lucide-react";

import type { EmpleadoState } from "@/app/empleados/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PUESTOS, PUESTO_LABEL } from "@/lib/constants/empleados";
import { fuerzaPassword, generarPassword, sugerirEmail } from "@/lib/cuenta";
import { formatCedula } from "@/lib/format";

export type Cuenta = { id: string; nombre_completo: string; role: string };

export type EmpleadoDefaults = {
  nombre_completo?: string;
  puesto?: string;
  telefono?: string;
  email?: string;
  fecha_ingreso?: string;
  user_id?: string;
  cedula?: string;
  salario?: string;
  banco?: string;
  cuenta_banco?: string;
  direccion?: string;
  contacto_emergencia_nombre?: string;
  contacto_emergencia_telefono?: string;
  notas_rrhh?: string;
};

function Err({ id, errors }: { id: string; errors?: Record<string, string[]> }) {
  const m = errors?.[id]?.[0];
  return m ? <p className="text-sm text-destructive">{m}</p> : null;
}

function Campo({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function GuardarButton({ editar }: { editar: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="vital" size="lg" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
        </>
      ) : editar ? (
        "Guardar cambios"
      ) : (
        "Registrar empleado"
      )}
    </Button>
  );
}

const FUERZA_LABEL = ["Muy débil", "Débil", "Aceptable", "Buena", "Fuerte"];
const FUERZA_COLOR = [
  "bg-destructive",
  "bg-destructive",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-emerald-600",
];

function SeccionCuenta({ errors }: { errors?: Record<string, string[]> }) {
  const [crear, setCrear] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const fuerza = fuerzaPassword(pw);

  function sugerir() {
    const n = (document.getElementById("nombre_completo") as HTMLInputElement | null)?.value ?? "";
    setEmail(sugerirEmail(n));
  }

  return (
    <section className="space-y-4 rounded-capsule border border-brand-cyan/30 bg-brand-cyan/5 p-5">
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          name="crear_cuenta"
          checked={crear}
          onChange={(e) => setCrear(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
          <KeyRound className="h-4 w-4" />
          Crear cuenta de acceso al sistema
        </span>
      </label>

      {crear && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Se creará una cuenta de login real. El empleado cambiará la contraseña
            temporal al entrar por primera vez.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Correo de acceso" htmlFor="cuenta_email">
              <div className="flex gap-2">
                <Input
                  id="cuenta_email"
                  name="cuenta_email"
                  inputMode="email"
                  placeholder="nombreapellido@luxamed.do"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button type="button" variant="outline" size="sm" onClick={sugerir}>
                  Sugerir
                </Button>
              </div>
              <Err id="cuenta_email" errors={errors} />
            </Campo>

            <Campo label="Rol de acceso" htmlFor="cuenta_rol">
              <Select id="cuenta_rol" name="cuenta_rol" defaultValue="recepcion">
                <option value="recepcion">Recepción</option>
                <option value="enfermera">Enfermera</option>
                <option value="admin">Administrador (médico)</option>
              </Select>
              <Err id="cuenta_rol" errors={errors} />
            </Campo>
          </div>

          <Campo label="Contraseña temporal" htmlFor="cuenta_password">
            <div className="flex gap-2">
              <Input
                id="cuenta_password"
                name="cuenta_password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Mín. 8, con mayúscula y número"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPw(generarPassword())}
              >
                <RefreshCw className="h-4 w-4" /> Generar
              </Button>
            </div>
            {pw && (
              <div className="mt-1 flex items-center gap-2">
                <div className="flex h-1.5 flex-1 gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-full flex-1 rounded-full ${
                        i < fuerza ? FUERZA_COLOR[fuerza] : "bg-border"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {FUERZA_LABEL[fuerza]}
                </span>
              </div>
            )}
            <Err id="cuenta_password" errors={errors} />
          </Campo>
        </div>
      )}
    </section>
  );
}

function PanelExito({ state }: { state: EmpleadoState }) {
  const [copiado, setCopiado] = React.useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(state.tempPassword ?? "");
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* el valor sigue visible */
    }
  }
  return (
    <div className="space-y-5">
      <div className="rounded-capsule border border-emerald-500/40 bg-emerald-500/10 p-6">
        <h2 className="text-base font-semibold text-emerald-700 dark:text-emerald-400">
          ✓ Empleado y cuenta de acceso creados
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Entrégale estos datos al empleado. La contraseña <strong>no se vuelve a
          mostrar</strong>; cámbiala se hace al primer ingreso.
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Correo</dt>
            <dd className="font-medium">{state.cuentaEmail}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Contraseña temporal</dt>
            <dd className="flex items-center gap-2">
              <code className="rounded bg-background px-2 py-1 font-mono text-sm">
                {state.tempPassword}
              </code>
              <Button type="button" variant="outline" size="sm" onClick={copiar}>
                {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </dd>
          </div>
        </dl>
      </div>
      <div className="flex gap-3">
        <Button asChild variant="vital">
          <Link href={`/empleados/${state.empleadoId}`}>Ir a la ficha</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/empleados/nuevo">Registrar otro</Link>
        </Button>
      </div>
    </div>
  );
}

export function EmpleadoForm({
  action,
  defaults = {},
  cuentas,
  editar = false,
  permitirCuenta = false,
}: {
  action: (prev: EmpleadoState, formData: FormData) => Promise<EmpleadoState>;
  defaults?: EmpleadoDefaults;
  cuentas: Cuenta[];
  editar?: boolean;
  permitirCuenta?: boolean;
}) {
  const [state, formAction] = useFormState<EmpleadoState, FormData>(action, {
    ok: false,
  });
  const errors = state.errors;
  const [cedula, setCedula] = React.useState(defaults.cedula ?? "");

  // Cuenta creada con éxito: mostramos la contraseña temporal una sola vez.
  if (state.ok && state.tempPassword) {
    return <PanelExito state={state} />;
  }

  return (
    <form action={formAction} className="space-y-8">
      {state.message && !state.ok && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.message}
          {state.empleadoId && (
            <>
              {" "}
              <Link href={`/empleados/${state.empleadoId}`} className="underline">
                Ver ficha del empleado
              </Link>
            </>
          )}
        </div>
      )}

      {/* ===== Datos públicos ===== */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Datos generales
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nombre completo" htmlFor="nombre_completo">
            <Input id="nombre_completo" name="nombre_completo" defaultValue={defaults.nombre_completo} />
            <Err id="nombre_completo" errors={errors} />
          </Campo>
          <Campo label="Puesto" htmlFor="puesto">
            <Select id="puesto" name="puesto" defaultValue={defaults.puesto ?? "otro"}>
              {PUESTOS.map((p) => (
                <option key={p} value={p}>{PUESTO_LABEL[p]}</option>
              ))}
            </Select>
            <Err id="puesto" errors={errors} />
          </Campo>
          <Campo label="Teléfono" htmlFor="telefono">
            <Input id="telefono" name="telefono" placeholder="809-555-1234" defaultValue={defaults.telefono} />
            <Err id="telefono" errors={errors} />
          </Campo>
          <Campo label="Correo" htmlFor="email">
            <Input id="email" name="email" type="email" defaultValue={defaults.email} />
            <Err id="email" errors={errors} />
          </Campo>
          <Campo label="Fecha de ingreso" htmlFor="fecha_ingreso">
            <Input id="fecha_ingreso" name="fecha_ingreso" type="date" defaultValue={defaults.fecha_ingreso} />
            <Err id="fecha_ingreso" errors={errors} />
          </Campo>
          {!permitirCuenta && (
            <Campo label="Cuenta de sistema (opcional)" htmlFor="user_id">
              <Select id="user_id" name="user_id" defaultValue={defaults.user_id ?? ""}>
                <option value="">Sin cuenta (no usa el sistema)</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_completo} · {c.role}
                  </option>
                ))}
              </Select>
              <Err id="user_id" errors={errors} />
            </Campo>
          )}
        </div>
      </section>

      {/* ===== Cuenta de acceso (solo al registrar) ===== */}
      {permitirCuenta && <SeccionCuenta errors={errors} />}

      {/* ===== Datos privados (solo admin) ===== */}
      <section className="space-y-4 rounded-capsule border border-amber-500/30 bg-amber-500/5 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
          <Lock className="h-4 w-4" />
          Datos privados (solo administrador)
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Cédula" htmlFor="cedula">
            <Input
              id="cedula"
              name="cedula"
              inputMode="numeric"
              placeholder="000-0000000-0"
              value={cedula}
              onChange={(e) => setCedula(formatCedula(e.target.value))}
            />
            <Err id="cedula" errors={errors} />
          </Campo>
          <Campo label="Salario (RD$)" htmlFor="salario">
            <Input id="salario" name="salario" type="number" min={0} step="0.01" defaultValue={defaults.salario} />
            <Err id="salario" errors={errors} />
          </Campo>
          <Campo label="Banco" htmlFor="banco">
            <Input id="banco" name="banco" defaultValue={defaults.banco} placeholder="Ej. Banreservas" />
            <Err id="banco" errors={errors} />
          </Campo>
          <Campo label="Cuenta bancaria" htmlFor="cuenta_banco">
            <Input id="cuenta_banco" name="cuenta_banco" defaultValue={defaults.cuenta_banco} />
            <Err id="cuenta_banco" errors={errors} />
          </Campo>
          <Campo label="Dirección" htmlFor="direccion">
            <Input id="direccion" name="direccion" defaultValue={defaults.direccion} />
            <Err id="direccion" errors={errors} />
          </Campo>
          <Campo label="Contacto de emergencia" htmlFor="contacto_emergencia_nombre">
            <Input id="contacto_emergencia_nombre" name="contacto_emergencia_nombre" defaultValue={defaults.contacto_emergencia_nombre} />
            <Err id="contacto_emergencia_nombre" errors={errors} />
          </Campo>
          <Campo label="Teléfono de emergencia" htmlFor="contacto_emergencia_telefono">
            <Input id="contacto_emergencia_telefono" name="contacto_emergencia_telefono" placeholder="809-555-1234" defaultValue={defaults.contacto_emergencia_telefono} />
            <Err id="contacto_emergencia_telefono" errors={errors} />
          </Campo>
        </div>
        <Campo label="Notas de RRHH" htmlFor="notas_rrhh">
          <Textarea id="notas_rrhh" name="notas_rrhh" defaultValue={defaults.notas_rrhh} />
          <Err id="notas_rrhh" errors={errors} />
        </Campo>
      </section>

      <div className="flex items-center gap-3">
        <GuardarButton editar={editar} />
        <Button asChild variant="ghost">
          <Link href="/empleados">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
