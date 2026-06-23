import { NextResponse } from "next/server";

import { METODO_PAGO_LABEL } from "@/lib/constants/nominas";
import { formatFecha } from "@/lib/format";
import { generarReporteNominaPDF } from "@/lib/nomina-pdf";
import {
  consultarNominas,
  mesesEnRango,
  parseFiltros,
} from "@/lib/nominas-filtros";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Exporta la nómina filtrada a CSV (Excel) o PDF. SOLO admin (RLS lo refuerza). */
export async function GET(req: Request) {
  if (!getSupabaseServerConfig().configured) {
    return new NextResponse("No disponible.", { status: 503 });
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const { data: perfil } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (perfil?.role !== "admin") {
    return new NextResponse("No autorizado.", { status: 403 });
  }

  const url = new URL(req.url);
  const sp = Object.fromEntries(url.searchParams.entries());
  const f = parseFiltros(sp);
  const pagos = await consultarNominas(supabase, f);
  const total = pagos.reduce((a, p) => a + Number(p.monto), 0);

  if ((sp.formato ?? "csv") === "pdf") {
    const logo = await fetch(new URL("/luxamed-logo.jpeg", req.url))
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null);
    const base64 = await generarReporteNominaPDF(
      {
        desde: f.desde,
        hasta: f.hasta,
        total,
        promedioMensual: total / mesesEnRango(f.desde, f.hasta),
        filas: pagos.map((p) => ({
          empleado: p.empleados?.nombre_completo ?? "—",
          fecha_pago: p.fecha_pago,
          periodo: p.periodo,
          metodo: METODO_PAGO_LABEL[p.metodo] ?? p.metodo,
          monto: Number(p.monto),
        })),
      },
      logo,
    );
    return new NextResponse(Buffer.from(base64, "base64"), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="nomina-${f.desde}_a_${f.hasta}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  // CSV (Excel). Separador ; y BOM para acentos en Excel.
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const filas = [
    ["Empleado", "Fecha", "Periodo", "Metodo", "Monto"].join(";"),
    ...pagos.map((p) =>
      [
        esc(p.empleados?.nombre_completo ?? "—"),
        formatFecha(p.fecha_pago),
        esc(p.periodo),
        METODO_PAGO_LABEL[p.metodo] ?? p.metodo,
        Number(p.monto).toFixed(2),
      ].join(";"),
    ),
    ["", "", "", "TOTAL", total.toFixed(2)].join(";"),
  ];
  const csv = "﻿" + filas.join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nomina-${f.desde}_a_${f.hasta}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
