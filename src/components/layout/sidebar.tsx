"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Boxes,
  Briefcase,
  CalendarDays,
  Gauge,
  Home,
  LineChart,
  LogOut,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { cerrarSesion } from "@/app/login/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/brand/wordmark";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  adminOnly?: boolean;
};

const ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: Home, exact: true },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/pacientes", label: "Pacientes", icon: Users },
  { href: "/inventario", label: "Inventario", icon: Boxes },
  { href: "/empleados", label: "Empleados", icon: Briefcase },
  { href: "/nominas", label: "Nómina", icon: Wallet, adminOnly: true },
  { href: "/finanzas", label: "Finanzas", icon: LineChart, adminOnly: true },
  { href: "/camara", label: "Cámara", icon: Gauge },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

function esActivo(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  nombre,
  rolLabel,
  esAdmin = false,
}: {
  nombre: string;
  rolLabel: string;
  esAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [hover, setHover] = React.useState(false);
  const inicial = (nombre.trim()[0] ?? "·").toUpperCase();
  const items = ITEMS.filter((it) => !it.adminOnly || esAdmin);

  return (
    <>
      {/* ===== Escritorio: barra lateral colapsable ===== */}
      <motion.aside
        onHoverStart={() => setHover(true)}
        onHoverEnd={() => setHover(false)}
        initial={false}
        animate={{ width: hover ? 248 : 76 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border/60 bg-card/80 backdrop-blur-xl md:flex"
      >
        {/* Logo */}
        <div className="flex h-24 items-center gap-3 px-3">
          <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-2xl bg-white shadow-soft ring-1 ring-black/5">
            <Image
              src="/luxamed-logo.jpeg"
              alt="LUXAMED Hiperbárica"
              width={1172}
              height={798}
              priority
              className="h-11 w-auto object-contain"
            />
          </div>
          <AnimatePresence>
            {hover && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Wordmark size="md" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((it) => {
            const activo = esActivo(pathname, it.href, it.exact);
            return (
              <Link
                key={it.href}
                href={it.href}
                title={it.label}
                className={`group/item relative flex h-11 items-center gap-3 rounded-pill px-3 transition-colors ${
                  activo
                    ? "bg-accent text-primary"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                }`}
              >
                <it.icon className="h-5 w-5 shrink-0" />
                <AnimatePresence>
                  {hover && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.2 }}
                      className="whitespace-nowrap text-sm font-medium"
                    >
                      {it.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {activo && (
                  <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Pie: tema + perfil + salir */}
        <div className="space-y-1 border-t border-border/60 px-3 py-3">
          <div className="flex items-center gap-2 px-1">
            <ThemeToggle />
            <AnimatePresence>
              {hover && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-muted-foreground"
                >
                  Tema
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-3 rounded-pill px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-primary/10 text-sm font-semibold text-primary">
              {inicial}
            </div>
            <AnimatePresence>
              {hover && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-sm font-medium">{nombre}</p>
                  <p className="truncate text-xs text-muted-foreground">{rolLabel}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <form action={cerrarSesion}>
              <button
                type="submit"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="flex h-9 w-9 items-center justify-center rounded-pill text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </motion.aside>

      {/* ===== Móvil: navegación inferior ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch justify-around border-t border-border/60 bg-card/90 backdrop-blur-xl md:hidden">
        {items.map((it) => {
          const activo = esActivo(pathname, it.href, it.exact);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-[0.65rem] ${
                activo ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <it.icon className="h-5 w-5" />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
