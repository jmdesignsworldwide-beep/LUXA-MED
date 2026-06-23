import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { etiquetaRol } from "@/lib/gender";
import { createClient, getSupabaseServerConfig } from "@/lib/supabase/server";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LUXAMED Hiperbárica",
  description: "Sistema de gestión para clínica hiperbárica — oxígeno y claridad.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let nombre = "";
  let rolLabel = "";
  let autenticado = false;

  if (getSupabaseServerConfig().configured) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: perfil } = await supabase
        .from("user_profiles")
        .select("role, nombre_completo, genero")
        .eq("id", user.id)
        .maybeSingle();
      if (perfil) {
        autenticado = true;
        nombre = perfil.nombre_completo ?? "";
        rolLabel = etiquetaRol(perfil.role, perfil.genero);
      }
    }
  }

  return (
    <html lang="es-DO" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AppShell nombre={nombre} rolLabel={rolLabel} autenticado={autenticado}>
            {children}
          </AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
