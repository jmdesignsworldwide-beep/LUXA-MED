import { createHash } from "crypto";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type DatosFirma = {
  pacienteNombre: string;
  pacienteCedula: string | null;
  consentimientoTexto: string;
  tipoFirma: "dibujada" | "tipografica";
  firmaImagen?: string | null; // data URL PNG
  firmaTexto?: string | null;
  firmadoEn: Date;
};

/** Parte líneas largas para que quepan en el ancho dado. */
function wrap(text: string, font: any, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph.trim() === "") {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

/**
 * Genera el PDF del consentimiento firmado y devuelve sus bytes en base64 y el
 * hash SHA-256 (para verificar que no se altere). Se guardan los bytes tal cual,
 * así el hash siempre corresponde al documento almacenado.
 */
export async function generarConsentimientoPDF(d: DatosFirma): Promise<{
  base64: string;
  hash: string;
}> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Consentimiento informado - LUXAMED Hiperbárica");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const A4: [number, number] = [595.28, 841.89];
  const margin = 56;
  const azul = rgb(0.11, 0.44, 0.73);
  let page = pdf.addPage(A4);
  let y = A4[1] - margin;
  const maxW = A4[0] - margin * 2;

  const nuevaPagina = () => {
    page = pdf.addPage(A4);
    y = A4[1] - margin;
  };
  const linea = (
    text: string,
    size = 10,
    f = font,
    color = rgb(0.1, 0.1, 0.1),
    gap = 4,
  ) => {
    if (y < margin + 60) nuevaPagina();
    page.drawText(text, { x: margin, y, size, font: f, color });
    y -= size + gap;
  };

  // Encabezado
  linea("LUXAMED Hiperbárica", 18, bold, azul, 6);
  linea("Consentimiento informado para terapia de oxigenación hiperbárica", 11, bold, rgb(0.1, 0.1, 0.1), 10);

  // Datos del paciente
  linea(`Paciente: ${d.pacienteNombre}`, 10, bold);
  linea(`Cédula: ${d.pacienteCedula ?? "—"}`, 10);
  y -= 8;

  // Texto del consentimiento
  for (const l of wrap(d.consentimientoTexto, font, 10, maxW)) {
    if (l === "") {
      y -= 8;
      continue;
    }
    linea(l, 10);
  }

  // Firma
  y -= 16;
  if (y < margin + 150) nuevaPagina();
  linea("Firma del paciente:", 11, bold, rgb(0.1, 0.1, 0.1), 8);

  if (d.tipoFirma === "dibujada" && d.firmaImagen) {
    try {
      const png = await pdf.embedPng(d.firmaImagen);
      const w = 220;
      const h = (png.height / png.width) * w;
      page.drawImage(png, { x: margin, y: y - h, width: w, height: h });
      y -= h + 8;
    } catch {
      linea("(firma no disponible)", 10);
    }
  } else {
    linea(d.firmaTexto ?? "", 16, bold, azul, 6);
  }

  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + 240, y },
    thickness: 1,
    color: rgb(0.6, 0.6, 0.6),
  });
  y -= 14;
  linea(d.pacienteNombre, 9);
  linea(
    `Firmado el ${new Intl.DateTimeFormat("es-DO", {
      timeZone: "America/Santo_Domingo",
      dateStyle: "long",
      timeStyle: "short",
    }).format(d.firmadoEn)} (hora RD)`,
    9,
    font,
    rgb(0.4, 0.4, 0.4),
  );

  const bytes = await pdf.save();
  const buf = Buffer.from(bytes);
  const hash = createHash("sha256").update(buf).digest("hex");
  return { base64: buf.toString("base64"), hash };
}
