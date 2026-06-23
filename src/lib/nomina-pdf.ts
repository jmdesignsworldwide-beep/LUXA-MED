import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type DatosRecibo = {
  empleadoNombre: string;
  empleadoCedula: string | null;
  puesto: string | null;
  monto: number;
  fechaPago: string; // YYYY-MM-DD
  periodo: string;
  metodo: string;
  notas: string | null;
};

function formatRD(n: number): string {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    currencyDisplay: "symbol",
  }).format(n);
}

function formatFecha(d: string): string {
  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${d}T12:00:00`));
}

/** Genera un recibo de pago simple (PDF) y devuelve sus bytes base64. */
export async function generarReciboPDF(d: DatosRecibo): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Recibo de pago - LUXAMED Hiperbárica");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const A4: [number, number] = [595.28, 841.89];
  const margin = 56;
  const azul = rgb(0.11, 0.44, 0.73);
  const gris = rgb(0.4, 0.4, 0.4);
  const page = pdf.addPage(A4);
  let y = A4[1] - margin;

  const linea = (
    text: string,
    size = 10,
    f = font,
    color = rgb(0.1, 0.1, 0.1),
    gap = 6,
  ) => {
    page.drawText(text, { x: margin, y, size, font: f, color });
    y -= size + gap;
  };
  const fila = (label: string, valor: string) => {
    page.drawText(label, { x: margin, y, size: 10, font, color: gris });
    page.drawText(valor, { x: margin + 160, y, size: 10, font: bold });
    y -= 22;
  };

  linea("LUXAMED Hiperbárica", 18, bold, azul, 4);
  linea("Recibo de pago de nómina", 11, bold, rgb(0.1, 0.1, 0.1), 16);

  page.drawLine({
    start: { x: margin, y: y + 6 },
    end: { x: A4[0] - margin, y: y + 6 },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });
  y -= 12;

  fila("Empleado:", d.empleadoNombre);
  fila("Cédula:", d.empleadoCedula ?? "—");
  if (d.puesto) fila("Puesto:", d.puesto);
  fila("Período:", d.periodo);
  fila("Fecha de pago:", formatFecha(d.fechaPago));
  fila("Método:", d.metodo);

  y -= 8;
  page.drawLine({
    start: { x: margin, y: y + 6 },
    end: { x: A4[0] - margin, y: y + 6 },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });
  y -= 14;

  page.drawText("Monto pagado:", { x: margin, y, size: 13, font: bold });
  page.drawText(formatRD(d.monto), {
    x: margin + 160,
    y,
    size: 16,
    font: bold,
    color: azul,
  });
  y -= 32;

  if (d.notas) {
    linea("Notas:", 10, bold, gris, 4);
    linea(d.notas, 10);
    y -= 8;
  }

  y -= 40;
  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + 220, y },
    thickness: 1,
    color: rgb(0.6, 0.6, 0.6),
  });
  y -= 14;
  linea("Recibí conforme", 9, font, gris);

  linea(
    `Emitido el ${new Intl.DateTimeFormat("es-DO", {
      timeZone: "America/Santo_Domingo",
      dateStyle: "long",
    }).format(new Date())}`,
    9,
    font,
    gris,
  );

  const bytes = await pdf.save();
  return Buffer.from(bytes).toString("base64");
}
