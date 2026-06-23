import { NextResponse } from "next/server";

import { METODO_PAGO_LABEL } from "@/lib/constants/nominas";
import { PUESTO_LABEL } from "@/lib/constants/empleados";
import { generarReciboPDF } from "@/lib/nomina-pdf";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Recibo de pago (PDF). SOLO admin — la RLS de nominas/empleados_privado lo refuerza. */
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!getSupabaseServerConfig().configured) {
    return new NextResponse("No disponible.", { status: 503 });
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const { data: pago } = await supabase
    .from("nominas")
    .select("monto, fecha_pago, periodo, metodo, notas, empleado_id, empleados(nombre_completo, puesto)")
    .eq("id", params.id)
    .maybeSingle();

  // Si no es admin, la RLS devuelve 0 filas -> no hay recibo.
  if (!pago) return new NextResponse("No autorizado o no encontrado.", { status: 404 });

  const emp = (pago as unknown as {
    empleados: { nombre_completo: string; puesto: string | null } | null;
  }).empleados;

  // Cédula (privada): solo admin puede leerla.
  const { data: priv } = await supabase
    .from("empleados_privado")
    .select("cedula")
    .eq("empleado_id", (pago as { empleado_id: string }).empleado_id)
    .maybeSingle();

  const base64 = await generarReciboPDF({
    empleadoNombre: emp?.nombre_completo ?? "Empleado",
    empleadoCedula: priv?.cedula ?? null,
    puesto: emp?.puesto ? PUESTO_LABEL[emp.puesto] ?? emp.puesto : null,
    monto: Number((pago as { monto: number }).monto),
    fechaPago: (pago as { fecha_pago: string }).fecha_pago,
    periodo: (pago as { periodo: string }).periodo,
    metodo: METODO_PAGO_LABEL[(pago as { metodo: string }).metodo] ?? (pago as { metodo: string }).metodo,
    notas: (pago as { notas: string | null }).notas,
  });

  return new NextResponse(Buffer.from(base64, "base64"), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="recibo-nomina-luxamed.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
