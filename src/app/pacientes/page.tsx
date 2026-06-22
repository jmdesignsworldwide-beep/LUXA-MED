import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { PACIENTES_PAGE_SIZE } from "@/lib/constants/pacientes";
import { formatFecha } from "@/lib/format";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  estado?: string;
  page?: string;
  creado?: string;
};

type PacienteRow = {
  id: string;
  nombre_completo: string;
  cedula: string | null;
  telefono: string | null;
  ars: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  activo: boolean;
};

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!getSupabaseServerConfig().configured) redirect("/login");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const q = (searchParams.q ?? "").trim();
  const qSafe = q.replace(/[%,()]/g, " ").trim();
  const estado =
    searchParams.estado === "inactivos"
      ? "inactivos"
      : searchParams.estado === "todos"
        ? "todos"
        : "activos";
  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const from = (page - 1) * PACIENTES_PAGE_SIZE;
  const to = from + PACIENTES_PAGE_SIZE - 1;

  let query = supabase
    .from("pacientes")
    .select(
      "id, nombre_completo, cedula, telefono, ars, fecha_nacimiento, sexo, activo",
      { count: "exact" },
    );

  if (estado === "activos") query = query.eq("activo", true);
  else if (estado === "inactivos") query = query.eq("activo", false);

  if (qSafe) {
    query = query.or(
      `nombre_completo.ilike.%${qSafe}%,cedula.ilike.%${qSafe}%`,
    );
  }

  const { data, count } = await query
    .order("nombre_completo", { ascending: true })
    .range(from, to);

  const pacientes = (data ?? []) as PacienteRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PACIENTES_PAGE_SIZE));

  const linkWith = (overrides: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (estado !== "activos") p.set("estado", estado);
    Object.entries(overrides).forEach(([k, v]) => p.set(k, String(v)));
    const s = p.toString();
    return s ? `/pacientes?${s}` : "/pacientes";
  };

  const filtros: { key: string; label: string }[] = [
    { key: "activos", label: "Activos" },
    { key: "inactivos", label: "Inactivos" },
    { key: "todos", label: "Todos" },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      {/* Encabezado */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Panel
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="container py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Pacientes
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {total} {total === 1 ? "paciente" : "pacientes"} ·{" "}
              expediente demográfico (sin diagnósticos)
            </p>
          </div>
          <Button asChild variant="vital">
            <Link href="/pacientes/nuevo">
              <Plus className="h-4 w-4" />
              Nuevo paciente
            </Link>
          </Button>
        </div>

        {searchParams.creado === "1" && (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-primary"
          >
            ✓ Paciente registrado correctamente.
          </div>
        )}

        {/* Buscador + filtro (GET, sin JS) */}
        <form method="get" className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nombre o cédula…"
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

        {/* Filtros de estado */}
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
                      ? `/pacientes?q=${encodeURIComponent(q)}`
                      : "/pacientes"
                    : `/pacientes?${new URLSearchParams({
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

        {/* Tabla */}
        <div className="mt-6 overflow-hidden rounded-capsule border border-border/70 bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Nombre</th>
                  <th className="px-5 py-3 font-medium">Cédula</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">
                    Teléfono
                  </th>
                  <th className="hidden px-5 py-3 font-medium lg:table-cell">
                    ARS
                  </th>
                  <th className="hidden px-5 py-3 font-medium lg:table-cell">
                    Nacimiento
                  </th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {pacientes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-muted-foreground"
                    >
                      No se encontraron pacientes.
                    </td>
                  </tr>
                ) : (
                  pacientes.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-border/40 transition-colors last:border-0 hover:bg-accent/40"
                    >
                      <td className="px-5 py-3 font-medium">
                        <Link
                          href={`/pacientes/${p.id}`}
                          className="text-primary hover:underline"
                        >
                          {p.nombre_completo}
                        </Link>
                      </td>
                      <td className="px-5 py-3 tabular-nums text-muted-foreground">
                        {p.cedula ?? "—"}
                      </td>
                      <td className="hidden px-5 py-3 tabular-nums text-muted-foreground md:table-cell">
                        {p.telefono ?? "—"}
                      </td>
                      <td className="hidden px-5 py-3 text-muted-foreground lg:table-cell">
                        {p.ars ?? "—"}
                      </td>
                      <td className="hidden px-5 py-3 text-muted-foreground lg:table-cell">
                        {formatFecha(p.fecha_nacimiento) || "—"}
                      </td>
                      <td className="px-5 py-3">
                        {p.activo ? (
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

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href={linkWith({ page: Math.max(1, page - 1) })}>
                  Anterior
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={linkWith({ page: Math.min(totalPages, page + 1) })}>
                  Siguiente
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
