import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PortalPanel } from "@/components/portal/portal-panel";
import { PORTAL_COOKIE } from "@/lib/portal";
import { getPortalData } from "@/lib/portal-server";

export const dynamic = "force-dynamic";

export default async function PortalPanelPage({
  params,
}: {
  params: { token: string };
}) {
  const session = cookies().get(PORTAL_COOKIE)?.value;
  const data = await getPortalData(params.token, session);
  if (!data) redirect(`/portal/${params.token}`);

  return <PortalPanel token={params.token} data={data} />;
}
