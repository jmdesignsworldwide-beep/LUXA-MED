import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const AZUL = rgb(0.11, 0.44, 0.73);
const GRIS = rgb(0.4, 0.4, 0.4);
const NEGRO = rgb(0.1, 0.1, 0.1);

function rd(n: number): string {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    currencyDisplay: "symbol",
  }).format(n);
}

function fecha(d: string): string {
  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${d}T12:00:00`));
}

async function dibujarLogo(
  pdf: PDFDocument,
  page: ReturnType<PDFDocument["addPage"]>,
  logo: ArrayBuffer | null,
  x: number,
  y: number,
  w = 120,
) {
  if (!logo) return 0;
  try {
    const img = await pdf.embedJpg(logo);
    const h = (img.height / img.width) * w;
    page.drawImage(img, { x, y: y - h, width: w, height: h });
    return h;
  } catch {
    return 0;
  }
}

export type DatosRecibo = {
  empleadoNombre: string;
  empleadoCedula: string | null;
  puesto: string | null;
  monto: number;
  fechaPago: string;
  periodo: string;
  metodo: string;
  notas: string | null;
};

/** Recibo de pago individual (PDF, base64). */
export async function generarReciboPDF(
  d: DatosRecibo,
  logo: ArrayBuffer | null = null,
): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Recibo de pago - LUXAMED Hiperbárica");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const A4: [number, number] = [595.28, 841.89];
  const margin = 56;
  const page = pdf.addPage(A4);
  let y = A4[1] - margin;

  const hLogo = await dibujarLogo(pdf, page, logo, margin, y, 130);
  if (hLogo) y -= hLogo + 10;

  const linea = (t: string, size = 10, f = font, color = NEGRO, gap = 6) => {
    page.drawText(t, { x: margin, y, size, font: f, color });
    y -= size + gap;
  };
  const fila = (label: string, valor: string) => {
    page.drawText(label, { x: margin, y, size: 10, font, color: GRIS });
    page.drawText(valor, { x: margin + 160, y, size: 10, font: bold });
    y -= 22;
  };

  linea("LUXAMED Hiperbárica", 18, bold, AZUL, 4);
  linea("Recibo de pago de nómina", 11, bold, NEGRO, 16);

  page.drawLine({ start: { x: margin, y: y + 6 }, end: { x: A4[0] - margin, y: y + 6 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 12;

  fila("Empleado:", d.empleadoNombre);
  fila("Cédula:", d.empleadoCedula ?? "—");
  if (d.puesto) fila("Puesto:", d.puesto);
  fila("Período:", d.periodo);
  fila("Fecha de pago:", fecha(d.fechaPago));
  fila("Método:", d.metodo);

  y -= 8;
  page.drawLine({ start: { x: margin, y: y + 6 }, end: { x: A4[0] - margin, y: y + 6 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 14;

  page.drawText("Monto pagado:", { x: margin, y, size: 13, font: bold });
  page.drawText(rd(d.monto), { x: margin + 160, y, size: 16, font: bold, color: AZUL });
  y -= 32;

  if (d.notas) {
    linea("Notas:", 10, bold, GRIS, 4);
    linea(d.notas, 10);
    y -= 8;
  }

  y -= 40;
  page.drawLine({ start: { x: margin, y }, end: { x: margin + 220, y }, thickness: 1, color: rgb(0.6, 0.6, 0.6) });
  y -= 14;
  linea("Recibí conforme", 9, font, GRIS);
  linea(
    `Emitido el ${new Intl.DateTimeFormat("es-DO", { timeZone: "America/Santo_Domingo", dateStyle: "long" }).format(new Date())}`,
    9,
    font,
    GRIS,
  );

  return Buffer.from(await pdf.save()).toString("base64");
}

export type FilaReporte = {
  empleado: string;
  fecha_pago: string;
  periodo: string;
  metodo: string;
  monto: number;
};

/** Reporte de nómina del período filtrado (PDF, base64). */
export async function generarReporteNominaPDF(
  opts: {
    desde: string;
    hasta: string;
    filas: FilaReporte[];
    total: number;
    promedioMensual: number;
  },
  logo: ArrayBuffer | null = null,
): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Reporte de nómina - LUXAMED Hiperbárica");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const A4: [number, number] = [595.28, 841.89];
  const margin = 48;
  let page = pdf.addPage(A4);
  let y = A4[1] - margin;

  const hLogo = await dibujarLogo(pdf, page, logo, margin, y, 110);
  if (hLogo) y -= hLogo + 8;

  page.drawText("LUXAMED Hiperbárica — Reporte de nómina", { x: margin, y, size: 15, font: bold, color: AZUL });
  y -= 20;
  page.drawText(`Período: ${fecha(opts.desde)} a ${fecha(opts.hasta)}`, { x: margin, y, size: 10, font, color: GRIS });
  y -= 14;
  page.drawText(`Total: ${rd(opts.total)}   ·   Promedio mensual: ${rd(opts.promedioMensual)}   ·   ${opts.filas.length} pagos`, { x: margin, y, size: 10, font: bold, color: NEGRO });
  y -= 20;

  // Encabezados de tabla
  const cols = { emp: margin, fecha: 250, metodo: 340, monto: 470 };
  const header = () => {
    page.drawText("Empleado", { x: cols.emp, y, size: 9, font: bold, color: GRIS });
    page.drawText("Fecha", { x: cols.fecha, y, size: 9, font: bold, color: GRIS });
    page.drawText("Método", { x: cols.metodo, y, size: 9, font: bold, color: GRIS });
    page.drawText("Monto", { x: cols.monto, y, size: 9, font: bold, color: GRIS });
    y -= 6;
    page.drawLine({ start: { x: margin, y }, end: { x: A4[0] - margin, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    y -= 12;
  };
  header();

  for (const f of opts.filas) {
    if (y < margin + 30) {
      page = pdf.addPage(A4);
      y = A4[1] - margin;
      header();
    }
    page.drawText(f.empleado.slice(0, 38), { x: cols.emp, y, size: 9, font, color: NEGRO });
    page.drawText(fecha(f.fecha_pago), { x: cols.fecha, y, size: 9, font, color: NEGRO });
    page.drawText(f.metodo, { x: cols.metodo, y, size: 9, font, color: NEGRO });
    page.drawText(rd(f.monto), { x: cols.monto, y, size: 9, font, color: NEGRO });
    y -= 16;
  }

  return Buffer.from(await pdf.save()).toString("base64");
}
