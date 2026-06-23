import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PortalVerifyForm } from "@/components/portal/portal-verify-form";
import { PORTAL_COOKIE } from "@/lib/portal";
import { getPortalData } from "@/lib/portal-server";

export const dynamic = "force-dynamic";

export default async function PortalVerifyPage({
  params,
}: {
  params: { token: string };
}) {
  // Si ya hay una sesión verificada válida, ir directo al panel.
  const session = cookies().get(PORTAL_COOKIE)?.value;
  const data = await getPortalData(params.token, session);
  if (data) redirect(`/portal/${params.token}/panel`);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-secondary/50 via-background to-background px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <div className="rounded-capsule bg-white p-3 shadow-soft">
            <Image
              src="/luxamed-logo.jpeg"
              alt="LUXAMED Hiperbárica"
              width={1172}
              height={798}
              priority
              className="h-12 w-auto"
            />
          </div>
          <h1 className="mt-6 text-xl font-semibold tracking-tight">
            Portal del paciente
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Para proteger tu información, verifica tu identidad con tu cédula o tu
            fecha de nacimiento.
          </p>
        </div>

        <div className="mt-8 rounded-capsule border border-border/70 bg-card p-6 shadow-soft">
          <PortalVerifyForm token={params.token} />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          LUXAMED Hiperbárica · Tus datos médicos están protegidos
        </p>
      </div>
    </main>
  );
}
