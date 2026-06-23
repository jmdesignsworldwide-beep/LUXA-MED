import { redirect } from "next/navigation";

import {
  DashboardView,
  type AgendaItem,
  type TendenciaDia,
} from "@/components/dashboard/dashboard-view";
import { HomeExperience } from "@/components/home-experience";
import { RD_OFFSET, RD_TZ } from "@/lib/constants/citas";
import { CONTRAINDICACIONES_RELATIVAS } from "@/lib/constants/evaluacion";
import { hoyRD } from "@/lib/format";
import { bienvenida, tratamientoMedico } from "@/lib/gender";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Saludo según la hora en RD. */
function saludoRD(): string {
  const hora = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: RD_TZ,
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date()),
  );
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** Fecha RD (YYYY-MM-DD) de un instante. */
function fechaRD(instante: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: RD_TZ }).format(
    new Date(instante),
  );
}

/** Lunes de la semana actual (en RD), como YYYY-MM-DD. */
function lunesDeLaSemanaRD(): string {
  const d = new Date(`${hoyRD()}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0=domingo … 6=sábado
  const desdeLunes = (dow + 6) % 7;
  d.setUTCDate(d.getUTCDate() - desdeLunes);
  return d.toISOString().slice(0, 10);
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default async function Home() {
  if (!getSupabaseServerConfig().configured) redirect("/login");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("user_profiles")
    .select("role, nombre_completo, genero")
    .eq("id", user.id)
    .maybeSingle();

  const rol = (perfil?.role ?? "recepcion") as
    | "admin"
    | "enfermera"
    | "recepcion";
  const genero = perfil?.genero as "M" | "F" | null | undefined;
  const esClinico = rol === "admin" || rol === "enfermera";

  const primerNombre = (perfil?.nombre_completo ?? "").trim().split(/\s+/)[0] || "";
  const nombreSaludo = `${tratamientoMedico(genero, rol)}${primerNombre}`;

  const hoy = hoyRD();

  // --- Datos visibles para TODOS los roles (RLS: pacientes y citas = is_staff) ---
  const [{ data: citasRaw }, { count: pacientesActivos }, { data: camara }] =
    await Promise.all([
      supabase
        .from("citas")
        .select("id, paciente_id, inicio, fin, estado, pacientes(nombre_completo)")
        .gte("inicio", `${hoy}T00:00:00${RD_OFFSET}`)
        .lte("inicio", `${hoy}T23:59:59${RD_OFFSET}`)
        .order("inicio", { ascending: true }),
      supabase
        .from("pacientes")
        .select("id", { count: "exact", head: true })
        .eq("activo", true),
      supabase
        .from("camara")
        .select("estado, proximo_mantenimiento")
        .limit(1)
        .maybeSingle(),
    ]);

  type CitaRaw = {
    id: string;
    paciente_id: string;
    inicio: string;
    fin: string;
    estado: string;
    pacientes: { nombre_completo: string } | null;
  };
  const citas = (citasRaw ?? []) as unknown as CitaRaw[];

  const agenda: AgendaItem[] = citas.map((c) => ({
    id: c.id,
    paciente_id: c.paciente_id,
    inicio: c.inicio,
    fin: c.fin,
    estado: c.estado,
    paciente: c.pacientes?.nombre_completo ?? "Paciente",
  }));

  // Próxima cita: la primera programada que aún no terminó.
  const ahora = new Date();
  let proximaLabel: string | null = null;
  let proximaPaciente: string | null = null;
  const proxima = citas.find(
    (c) => c.estado === "programada" && new Date(c.fin) > ahora,
  );
  if (proxima) {
    const inicio = new Date(proxima.inicio);
    proximaPaciente = proxima.pacientes?.nombre_completo ?? null;
    if (inicio <= ahora) {
      proximaLabel = "En curso ahora";
    } else {
      const min = Math.round((inicio.getTime() - ahora.getTime()) / 60000);
      if (min < 60) {
        proximaLabel = `Próxima en ${min} min`;
      } else {
        const hh = Math.floor(min / 60);
        const mm = min % 60;
        proximaLabel =
          mm === 0
            ? `Próxima en ${hh} h`
            : `Próxima en ${hh} h ${mm} min`;
      }
    }
  }

  // --- Datos SOLO clínicos (RLS: sesiones y evaluaciones = is_clinical_staff) ---
  let sesionesSemana: number | undefined;
  let alertas: number | undefined;
  let tendencia: TendenciaDia[] | undefined;

  if (esClinico) {
    const lunes = lunesDeLaSemanaRD();
    const domingo = sumarDias(lunes, 6);

    const [{ data: sesRaw }, { data: evalRaw }] = await Promise.all([
      supabase
        .from("sesiones")
        .select("fecha")
        .gte("fecha", `${lunes}T00:00:00${RD_OFFSET}`)
        .lte("fecha", `${domingo}T23:59:59${RD_OFFSET}`),
      supabase
        .from("evaluaciones_hbo")
        .select("paciente_id, created_at, contraindicaciones, pacientes(activo)")
        .order("created_at", { ascending: false }),
    ]);

    const sesiones = (sesRaw ?? []) as { fecha: string }[];
    sesionesSemana = sesiones.length;

    // Tendencia: una barra por día (Lun..Dom).
    const conteo: Record<string, number> = {};
    for (const s of sesiones) {
      const f = fechaRD(s.fecha);
      conteo[f] = (conteo[f] ?? 0) + 1;
    }
    tendencia = DIAS_CORTOS.map((label, i) => {
      const f = sumarDias(lunes, i);
      return { label, count: conteo[f] ?? 0 };
    });

    // Alertas: pacientes ACTIVOS cuya última evaluación tiene contraindicación.
    type EvalRaw = {
      paciente_id: string;
      created_at: string;
      contraindicaciones: Record<string, unknown> | null;
      pacientes: { activo: boolean } | null;
    };
    const evals = (evalRaw ?? []) as unknown as EvalRaw[];
    const vistos = new Set<string>();
    let conContraindicacion = 0;
    for (const e of evals) {
      if (vistos.has(e.paciente_id)) continue; // solo la más reciente
      vistos.add(e.paciente_id);
      if (e.pacientes?.activo === false) continue;
      const c = e.contraindicaciones ?? {};
      const tieneRelativa = CONTRAINDICACIONES_RELATIVAS.some((o) => c[o.key]);
      if (c.neumotorax_no_tratado || tieneRelativa || c.otros) {
        conContraindicacion += 1;
      }
    }
    alertas = conContraindicacion;
  }

  return (
    <HomeExperience nombre={primerNombre || "LUXAMED"} saludo={bienvenida(genero)}>
      <DashboardView
        saludo={saludoRD()}
        nombre={nombreSaludo || bienvenida(genero)}
        rol={rol}
        citasHoy={citas.length}
        proximaLabel={proximaLabel}
        proximaPaciente={proximaPaciente}
        pacientesActivos={pacientesActivos ?? 0}
        agenda={agenda}
        camaraEstado={camara?.estado ?? null}
        proximoMantenimiento={camara?.proximo_mantenimiento ?? null}
        sesionesSemana={sesionesSemana}
        alertas={alertas}
        tendencia={tendencia}
      />
    </HomeExperience>
  );
}
