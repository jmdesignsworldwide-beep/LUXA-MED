import { NextResponse } from "next/server";

import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Devuelve el PDF firmado del consentimiento. RLS: solo personal clínico. */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  if (!getSupabaseServerConfig().configured) {
    return NextResponse.redirect(new URL("/login", _req.url));
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", _req.url));
  }

  const { data } = await supabase
    .from("firmas_consentimiento")
    .select("pdf_base64")
    .eq("paciente_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.pdf_base64) {
    return new NextResponse("Consentimiento no encontrado.", { status: 404 });
  }

  const bytes = Buffer.from(data.pdf_base64, "base64");
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="consentimiento-luxamed.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
