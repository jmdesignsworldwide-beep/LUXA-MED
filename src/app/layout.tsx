import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LUXA-MED",
  description: "Sistema de gestión para clínica hiperbárica",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-DO" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
