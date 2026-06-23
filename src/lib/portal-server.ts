import "server-only";

import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export type PortalCita = { inicio: string; fin: string };
export type PortalSesion = {
  fecha: string;
  numero: number | null;
  spo2_antes: number | null;
  spo2_despues: number | null;
};
export type PortalData = {
  ok: true;
  paciente: {
    nombre: string;
    cedula: string | null;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
    fecha_nacimiento: string | null;
  };
  citas: PortalCita[];
  progreso: { hechas: number; total: number | null };
  sesiones: PortalSesion[];
  tiene_documento: boolean;
};

/**
 * Valida token + sesión verificada y devuelve SOLO los datos del paciente
 * dueño del enlace (vía función SECURITY DEFINER en la BD). null si no procede.
 */
export async function getPortalData(
  token: string,
  session: string | undefined,
): Promise<PortalData | null> {
  if (!session || !getSupabaseServerConfig().configured) return null;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("portal_panel", {
    p_token: token,
    p_session: session,
  });
  if (error || !data || data.ok !== true) return null;
  return data as PortalData;
}
