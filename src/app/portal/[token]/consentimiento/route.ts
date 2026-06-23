import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { PORTAL_COOKIE } from "@/lib/portal";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Sirve el PDF del consentimiento firmado SOLO al paciente verificado dueño del
 * enlace (vía función SECURITY DEFINER que valida token + sesión).
 */
export async function GET(
  req: Request,
  { params }: { params: { token: string } },
) {
  if (!getSupabaseServerConfig().configured) {
    return new NextResponse("No disponible.", { status: 503 });
  }
  const session = cookies().get(PORTAL_COOKIE)?.value;
  if (!session) {
    return NextResponse.redirect(new URL(`/portal/${params.token}`, req.url));
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("portal_documento", {
    p_token: params.token,
    p_session: session,
  });

  if (error || !data) {
    return new NextResponse("Documento no encontrado.", { status: 404 });
  }

  const bytes = Buffer.from(data as string, "base64");
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="consentimiento-luxamed.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
