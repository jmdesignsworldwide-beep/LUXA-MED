import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { GastoFila, IngresoFila } from "@/lib/finanzas-datos";

const AZUL = rgb(0.11, 0.44, 0.73);
const GRIS = rgb(0.4, 0.4, 0.4);
const NEGRO = rgb(0.1, 0.1, 0.1);

function rd(n: number): string {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(n);
}
function fec(d: string): string {
  return new Intl.DateTimeFormat("es-DO", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(`${d}T12:00:00`),
  );
}

export async function generarReporteFinancieroPDF(
  o: {
    desde: string;
    hasta: string;
    entro: number;
    salio: number;
    margen: number;
    margenPct: number;
    porCategoria: { categoria: string; monto: number }[];
    gastos: GastoFila[];
    ingresos: IngresoFila[];
  },
  logo: ArrayBuffer | null = null,
): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Reporte financiero - LUXAMED Hiperbárica");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const A4: [number, number] = [595.28, 841.89];
  const margin = 48;
  let page = pdf.addPage(A4);
  let y = A4[1] - margin;

  if (logo) {
    try {
      const img = await pdf.embedJpg(logo);
      const w = 100;
      const h = (img.height / img.width) * w;
      page.drawImage(img, { x: margin, y: y - h, width: w, height: h });
      y -= h + 8;
    } catch {
      /* sin logo */
    }
  }

  const txt = (t: string, size = 10, f = font, color = NEGRO, gap = 6) => {
    if (y < margin + 24) {
      page = pdf.addPage(A4);
      y = A4[1] - margin;
    }
    page.drawText(t, { x: margin, y, size, font: f, color });
    y -= size + gap;
  };

  txt("LUXAMED Hiperbárica — Reporte financiero", 15, bold, AZUL, 4);
  txt(`Período: ${fec(o.desde)} a ${fec(o.hasta)}`, 10, font, GRIS, 10);

  txt(`Entró: ${rd(o.entro)}`, 11, bold);
  txt(`Salió: ${rd(o.salio)}`, 11, bold);
  txt(`Margen: ${rd(o.margen)} (${Math.round(o.margenPct)}%)`, 11, bold, o.margen >= 0 ? rgb(0.1, 0.5, 0.2) : rgb(0.7, 0.1, 0.1), 12);

  txt("Gasto por categoría", 11, bold, AZUL, 6);
  for (const c of o.porCategoria) txt(`  ${c.categoria}: ${rd(c.monto)}`, 10);
  if (o.porCategoria.length === 0) txt("  (sin gastos)", 10, font, GRIS);
  y -= 6;

  txt(`Gastos (${o.gastos.length})`, 11, bold, AZUL, 6);
  for (const g of o.gastos) txt(`  ${fec(g.fecha)}  ${g.categoria}  ${g.concepto}  ${rd(g.monto)}`.slice(0, 95), 9);
  y -= 6;

  txt(`Ingresos (${o.ingresos.length})`, 11, bold, AZUL, 6);
  for (const i of o.ingresos) txt(`  ${fec(i.fecha)}  ${i.concepto}  ${rd(i.monto)}`.slice(0, 95), 9);

  return Buffer.from(await pdf.save()).toString("base64");
}
