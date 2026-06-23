import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, Plus, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { METODO_PAGO_LABEL } from "@/lib/constants/nominas";
import { formatFecha, formatRD, hoyRD } from "@/lib/format";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type NominaRow = {
  id: string;
  empleado_id: string;
  monto: number;
  fecha_pago: string;
  periodo: string;
  metodo: string;
  empleados: { nombre_completo: string } | null;
};

export default async function NominasPage({
  searchParams,
}: {
  searchParams: { creado?: string };
}) {
  if (!getSupabaseServerConfig().configured) redirect("/login");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (perfil?.role !== "admin") redirect("/");

  // Rango del mes actual (RD).
  const hoy = hoyRD();
  const [anio, mes] = hoy.split("-");
  const inicioMes = `${anio}-${mes}-01`;
  const sig = new Date(`${inicioMes}T00:00:00Z`);
  sig.setUTCMonth(sig.getUTCMonth() + 1);
  const inicioSig = sig.toISOString().slice(0, 10);

  const [{ data: pagosRaw }, { data: activos }] = await Promise.all([
    supabase
      .from("nominas")
      .select("id, empleado_id, monto, fecha_pago, periodo, metodo, empleados(nombre_completo)")
      .gte("fecha_pago", inicioMes)
      .lt("fecha_pago", inicioSig)
      .order("fecha_pago", { ascending: false }),
    supabase.from("empleados").select("id, nombre_completo").eq("activo", true),
  ]);

  const pagos = (pagosRaw ?? []) as unknown as NominaRow[];
  const total = pagos.reduce((acc, p) => acc + Number(p.monto), 0);
  const pagados = new Set(pagos.map((p) => p.empleado_id));
  const faltan = (activos ?? []).filter((e) => !pagados.has(e.id));

  return (
    <main className="min-h-screen">
      <div className="container py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Nómina
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pagos del mes en curso
            </p>
          </div>
          <Button asChild variant="vital">
            <Link href="/nominas/nuevo">
              <Plus className="h-4 w-4" />
              Registrar pago
            </Link>
          </Button>
        </div>

        {searchParams.creado === "1" && (
          <div role="status" className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary">
            ✓ Pago registrado correctamente.
          </div>
        )}

        {/* Resumen */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Card className="p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-pill bg-accent text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-medium text-muted-foreground">Total pagado (mes)</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{formatRD(total)}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm font-medium text-muted-foreground">Pagos realizados</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{pagos.length}</p>
          </Card>
          <Card className={`p-6 ${faltan.length > 0 ? "border-amber-500/50" : ""}`}>
            <p className="text-sm font-medium text-muted-foreground">Faltan por pagar</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{faltan.length}</p>
            {faltan.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {faltan.map((e) => e.nombre_completo).join(", ")}
              </p>
            )}
          </Card>
        </div>

        {/* Tabla de pagos del mes */}
        <div className="mt-8 overflow-hidden rounded-capsule border border-border/70 bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Empleado</th>
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Período</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">Método</th>
                  <th className="px-5 py-3 font-medium">Monto</th>
                  <th className="px-5 py-3 font-medium">Recibo</th>
                </tr>
              </thead>
              <tbody>
                {pagos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                      Aún no hay pagos registrados este mes.
                    </td>
                  </tr>
                ) : (
                  pagos.map((p) => (
                    <tr key={p.id} className="border-b border-border/40 last:border-0">
                      <td className="px-5 py-3 font-medium">{p.empleados?.nombre_completo ?? "—"}</td>
                      <td className="px-5 py-3 tabular-nums text-muted-foreground">{formatFecha(p.fecha_pago)}</td>
                      <td className="hidden px-5 py-3 text-muted-foreground md:table-cell">{p.periodo}</td>
                      <td className="hidden px-5 py-3 text-muted-foreground sm:table-cell">{METODO_PAGO_LABEL[p.metodo] ?? p.metodo}</td>
                      <td className="px-5 py-3 font-semibold tabular-nums">{formatRD(Number(p.monto))}</td>
                      <td className="px-5 py-3">
                        <a
                          href={`/nominas/${p.id}/recibo`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <Download className="h-3.5 w-3.5" /> PDF
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
