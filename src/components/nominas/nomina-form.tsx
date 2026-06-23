"use client";

import * as React from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { registrarPago, type NominaState } from "@/app/nominas/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { METODOS_PAGO, METODO_PAGO_LABEL, periodoMesActual } from "@/lib/constants/nominas";
import { hoyRD } from "@/lib/format";

export type EmpleadoOpcion = {
  id: string;
  nombre: string;
  salario: number | null;
};

function Err({ id, errors }: { id: string; errors?: Record<string, string[]> }) {
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
        "Registrar pago"
      )}
    </Button>
  );
}

export function NominaForm({
  empleados,
  empleadoPreseleccionado,
}: {
  empleados: EmpleadoOpcion[];
  empleadoPreseleccionado?: string;
}) {
  const [state, formAction] = useFormState<NominaState, FormData>(registrarPago, {
    ok: false,
  });
  const errors = state.errors;

  const salarioDe = React.useMemo(() => {
    const m = new Map<string, number | null>();
    empleados.forEach((e) => m.set(e.id, e.salario));
    return m;
  }, [empleados]);

  const [empleadoId, setEmpleadoId] = React.useState(empleadoPreseleccionado ?? "");
  const [monto, setMonto] = React.useState(() => {
    const s = empleadoPreseleccionado ? salarioDe.get(empleadoPreseleccionado) : null;
    return s != null ? String(s) : "";
  });

  function onEmpleado(id: string) {
    setEmpleadoId(id);
    const s = salarioDe.get(id);
    setMonto(s != null ? String(s) : "");
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.message && !state.ok && (
        <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.message}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="empleado_id">Empleado</Label>
        <Select
          id="empleado_id"
          name="empleado_id"
          value={empleadoId}
          onChange={(e) => onEmpleado(e.target.value)}
        >
          <option value="">Selecciona un empleado…</option>
          {empleados.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </Select>
        <Err id="empleado_id" errors={errors} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="monto">Monto a pagar (RD$)</Label>
          <Input
            id="monto"
            name="monto"
            type="number"
            min={0}
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0.00"
          />
          <p className="text-xs text-muted-foreground">
            Se autollena con el salario; edítalo si hay bono u horas extra.
          </p>
          <Err id="monto" errors={errors} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha_pago">Fecha de pago</Label>
          <Input id="fecha_pago" name="fecha_pago" type="date" defaultValue={hoyRD()} />
          <Err id="fecha_pago" errors={errors} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="periodo">Período que cubre</Label>
          <Input
            id="periodo"
            name="periodo"
            defaultValue={periodoMesActual()}
            placeholder="Ej. Quincena 1-15 de junio 2026"
          />
          <Err id="periodo" errors={errors} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="metodo">Método de pago</Label>
          <Select id="metodo" name="metodo" defaultValue="transferencia">
            {METODOS_PAGO.map((m) => (
              <option key={m} value={m}>{METODO_PAGO_LABEL[m]}</option>
            ))}
          </Select>
          <Err id="metodo" errors={errors} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notas">Notas (opcional)</Label>
        <Textarea id="notas" name="notas" placeholder="Ej. incluye bono de desempeño" />
        <Err id="notas" errors={errors} />
      </div>

      {/* Preparado para el futuro: aquí irán las deducciones TSS/ISR. */}

      <div className="flex items-center gap-3">
        <GuardarButton />
        <Button asChild variant="ghost">
          <Link href="/nominas">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}
