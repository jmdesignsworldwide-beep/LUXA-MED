"use client";

import * as React from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Plus, Trash2 } from "lucide-react";

import {
  registrarSesion,
  type SesionState,
} from "@/app/pacientes/[id]/sesiones/nueva/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type CitaOpt = { id: string; label: string };
export type InsumoOpt = { id: string; nombre: string; unidad: string; stock: number };

function ErrorMsg({ id, errors }: { id: string; errors?: Record<string, string[]> }) {
  const m = errors?.[id]?.[0];
  return m ? <p className="text-sm text-destructive">{m}</p> : null;
}
function Campo({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-2 ${full ? "sm:col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}
function GuardarButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="vital" size="lg" disabled={pending}>
      {pending ? (<><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</>) : "Registrar sesión"}
    </Button>
  );
}

function MaterialPicker({ insumos }: { insumos: InsumoOpt[] }) {
  const [filas, setFilas] = React.useState<{ key: number; insumoId: string; cantidad: string }[]>([]);
  const idRef = React.useRef(1);
  const porId = React.useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);

  const agregar = () =>
    setFilas((f) => [...f, { key: idRef.current++, insumoId: "", cantidad: "1" }]);
  const quitar = (key: number) => setFilas((f) => f.filter((x) => x.key !== key));
  const set = (key: number, campo: "insumoId" | "cantidad", valor: string) =>
    setFilas((f) => f.map((x) => (x.key === key ? { ...x, [campo]: valor } : x)));

  if (insumos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay insumos en el inventario todavía. (Opcional: puedes guardar la sesión sin material.)
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {filas.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Si usaste material registrable, agrégalo aquí. Si no, deja vacío — el material es opcional.
        </p>
      )}
      {filas.map((fila) => {
        const ins = porId.get(fila.insumoId);
        const cant = Number(fila.cantidad);
        const excede = ins && Number.isFinite(cant) && cant > ins.stock;
        return (
          <div key={fila.key} className="space-y-1">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <Select
                  name="material_insumo_id"
                  value={fila.insumoId}
                  onChange={(e) => set(fila.key, "insumoId", e.target.value)}
                >
                  <option value="">Elige un insumo…</option>
                  {insumos.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nombre} — {i.stock} {i.unidad} disponibles
                    </option>
                  ))}
                </Select>
              </div>
              <Input
                name="material_cantidad"
                type="number"
                min={1}
                step="0.01"
                value={fila.cantidad}
                onChange={(e) => set(fila.key, "cantidad", e.target.value)}
                className="w-24"
                aria-label="Cantidad"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => quitar(fila.key)}
                aria-label="Quitar material"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {excede && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Solo hay {ins?.stock} {ins?.unidad} disponibles.
              </p>
            )}
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={agregar}>
        <Plus className="h-4 w-4" /> Añadir material
      </Button>
    </div>
  );
}

export function SesionForm({
  pacienteId,
  citas,
  defaultCitaId,
  defaults,
  insumos,
}: {
  pacienteId: string;
  citas: CitaOpt[];
  defaultCitaId: string;
  defaults: { numero_sesion: number; total_sesiones: string; presion_ata: string };
  insumos: InsumoOpt[];
}) {
  const [state, formAction] = useFormState<SesionState, FormData>(
    registrarSesion.bind(null, pacienteId),
    { ok: false },
  );
  const errors = state.errors;

  return (
    <form action={formAction} className="space-y-7">
      {state.message && !state.ok && (
        <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      )}

      <Bloque titulo="Vínculo y número de sesión">
        <Campo label="Cita del paciente">
          <Select name="cita_id" defaultValue={defaultCitaId}>
            {citas.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
            <option value="">Sin cita asociada (walk-in)</option>
          </Select>
          <p className="text-xs text-muted-foreground">
            Al guardar, la cita programada queda marcada como completada.
          </p>
          <ErrorMsg id="cita_id" errors={errors} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="N.º de sesión">
            <Input name="numero_sesion" type="number" min={1} defaultValue={defaults.numero_sesion} />
          </Campo>
          <Campo label="Total (de la evaluación)">
            <Input name="total_sesiones" type="number" min={1} defaultValue={defaults.total_sesiones} />
          </Campo>
        </div>
      </Bloque>

      <Bloque titulo="Signos ANTES">
        <Campo label="SpO2 antes (%)">
          <Input name="spo2_antes" type="number" min={0} max={100} />
        </Campo>
        <Campo label="TA antes (mmHg)">
          <Input name="ta_antes" placeholder="120/80" />
        </Campo>
        <Campo label="FC antes (lpm)">
          <Input name="fc_antes" type="number" />
        </Campo>
      </Bloque>

      <Bloque titulo="Parámetros de cámara">
        <Campo label="Presión usada (ATA)">
          <Input name="presion_ata" type="number" step="0.1" defaultValue={defaults.presion_ata} />
        </Campo>
        <Campo label="Duración real (min)">
          <Input name="duracion_min" type="number" />
        </Campo>
      </Bloque>

      <Bloque titulo="Signos DESPUÉS">
        <Campo label="SpO2 después (%)">
          <Input name="spo2_despues" type="number" min={0} max={100} />
        </Campo>
      </Bloque>

      <Bloque titulo="Evolución / incidencias">
        <Campo label="Evolución y observaciones" full>
          <Textarea name="evolucion" placeholder="Cómo respondió el paciente…" />
        </Campo>
        <Campo label="Incidencias (si hubo algún problema)" full>
          <Textarea name="incidencias" placeholder="Sin incidencias / describir" />
        </Campo>
      </Bloque>

      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Material utilizado (opcional)
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Lo que anotes aquí se descuenta del inventario. Si cancelas la sesión, el stock se devuelve.
          </p>
        </div>
        <MaterialPicker insumos={insumos} />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <GuardarButton />
        <Button asChild variant="ghost">
          <Link href={`/pacientes/${pacienteId}`}>Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
