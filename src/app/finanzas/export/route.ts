import { NextResponse } from "next/server";

import { formatFecha } from "@/lib/format";
import { resumenFinanciero } from "@/lib/finanzas-datos";
import { generarReporteFinancieroPDF } from "@/lib/finanzas-pdf";
import { parsePeriodo } from "@/lib/periodo";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Exporta el panel financiero del período a CSV (Excel) o PDF. SOLO admin. */
export async function GET(req: Request) {
  if (!getSupabaseServerConfig().configured) return new NextResponse("No disponible.", { status: 503 });
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
  if (perfil?.role !== "admin") return new NextResponse("No autorizado.", { status: 403 });

  const url = new URL(req.url);
  const sp = Object.fromEntries(url.searchParams.entries());
  const p = parsePeriodo(sp);
  const seleccion = url.searchParams.getAll("cat");
  let incluirNomina = true;
  if (seleccion.length > 0) {
    const { data: nomCat } = await supabase
      .from("categorias_gasto")
      .select("id")
      .eq("nombre", "Nóminas")
      .maybeSingle();
    incluirNomina = !!nomCat?.id && seleccion.includes(nomCat.id as string);
  }
  const r = await resumenFinanciero(supabase, p.desde, p.hasta, seleccion, incluirNomina);

  if ((sp.formato ?? "csv") === "pdf") {
    const logo = await fetch(new URL("/luxamed-logo.jpeg", req.url))
      .then((x) => (x.ok ? x.arrayBuffer() : null))
      .catch(() => null);
    const base64 = await generarReporteFinancieroPDF(
      {
        desde: p.desde,
        hasta: p.hasta,
        entro: r.entro,
        salio: r.salio,
        margen: r.margen,
        margenPct: r.margenPct,
        porCategoria: r.porCategoria,
        gastos: r.gastos,
        ingresos: r.ingresos,
      },
      logo,
    );
    return new NextResponse(Buffer.from(base64, "base64"), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="finanzas-${p.desde}_a_${p.hasta}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lineas: string[] = [];
  lineas.push(`Período;${formatFecha(p.desde)} a ${formatFecha(p.hasta)}`);
  lineas.push(`Entró;${r.entro.toFixed(2)}`);
  lineas.push(`Salió;${r.salio.toFixed(2)}`);
  lineas.push(`Margen;${r.margen.toFixed(2)};${Math.round(r.margenPct)}%`);
  lineas.push("");
  lineas.push("GASTOS");
  lineas.push(["Fecha", "Categoría", "Concepto", "Monto"].join(";"));
  r.gastos.forEach((g) =>
    lineas.push([formatFecha(g.fecha), esc(g.categoria), esc(g.concepto), g.monto.toFixed(2)].join(";")),
  );
  lineas.push("");
  lineas.push("INGRESOS");
  lineas.push(["Fecha", "Concepto", "Monto"].join(";"));
  r.ingresos.forEach((i) =>
    lineas.push([formatFecha(i.fecha), esc(i.concepto), i.monto.toFixed(2)].join(";")),
  );
  const csv = "﻿" + lineas.join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="finanzas-${p.desde}_a_${p.hasta}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
