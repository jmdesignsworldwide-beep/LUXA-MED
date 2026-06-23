import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PUESTO_LABEL } from "@/lib/constants/empleados";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EmpleadoRow = {
  id: string;
  nombre_completo: string;
  puesto: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
};

export default async function EmpleadosPage({
  searchParams,
}: {
  searchParams: { q?: string; estado?: string; creado?: string };
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
  const esAdmin = perfil?.role === "admin";

  const q = (searchParams.q ?? "").trim();
  const qSafe = q.replace(/[%,()]/g, " ").trim();
  const estado =
    searchParams.estado === "inactivos"
      ? "inactivos"
      : searchParams.estado === "todos"
        ? "todos"
        : "activos";

  let query = supabase
    .from("empleados")
    .select("id, nombre_completo, puesto, telefono, email, activo");
  if (estado === "activos") query = query.eq("activo", true);
  else if (estado === "inactivos") query = query.eq("activo", false);
  if (qSafe) query = query.ilike("nombre_completo", `%${qSafe}%`);

  const { data } = await query.order("nombre_completo", { ascending: true });
  const empleados = (data ?? []) as EmpleadoRow[];

  const filtros = [
    { key: "activos", label: "Activos" },
    { key: "inactivos", label: "Inactivos" },
    { key: "todos", label: "Todos" },
  ];

  return (
    <main className="min-h-screen">
      <div className="container py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Empleados
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {empleados.length}{" "}
              {empleados.length === 1 ? "empleado" : "empleados"} · base para
              nóminas
            </p>
          </div>
          {esAdmin && (
            <Button asChild variant="vital">
              <Link href="/empleados/nuevo">
                <Plus className="h-4 w-4" />
                Nuevo empleado
              </Link>
            </Button>
          )}
        </div>

        {searchParams.creado === "1" && (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary"
          >
            ✓ Empleado registrado correctamente.
          </div>
        )}

        <form method="get" className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nombre…"
              className="pl-11"
            />
          </div>
          {estado !== "activos" && (
            <input type="hidden" name="estado" value={estado} />
          )}
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>

        <div className="mt-4 flex gap-2">
          {filtros.map((f) => (
            <Button
              key={f.key}
              asChild
              size="sm"
              variant={estado === f.key ? "default" : "outline"}
            >
              <Link
                href={
                  f.key === "activos"
                    ? q
                      ? `/empleados?q=${encodeURIComponent(q)}`
                      : "/empleados"
                    : `/empleados?${new URLSearchParams({
                        ...(q ? { q } : {}),
                        estado: f.key,
                      }).toString()}`
                }
              >
                {f.label}
              </Link>
            </Button>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-capsule border border-border/70 bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Nombre</th>
                  <th className="px-5 py-3 font-medium">Puesto</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">
                    Teléfono
                  </th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {empleados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-12 text-center text-muted-foreground"
                    >
                      No se encontraron empleados.
                    </td>
                  </tr>
                ) : (
                  empleados.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b border-border/40 transition-colors last:border-0 hover:bg-accent/40"
                    >
                      <td className="px-5 py-3 font-medium">
                        <Link
                          href={`/empleados/${e.id}`}
                          className="text-primary hover:underline"
                        >
                          {e.nombre_completo}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {e.puesto ? PUESTO_LABEL[e.puesto] ?? e.puesto : "—"}
                      </td>
                      <td className="hidden px-5 py-3 tabular-nums text-muted-foreground md:table-cell">
                        {e.telefono ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        {e.activo ? (
                          <span className="inline-flex items-center rounded-pill bg-brand-cyan/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-pill bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            Inactivo
                          </span>
                        )}
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
