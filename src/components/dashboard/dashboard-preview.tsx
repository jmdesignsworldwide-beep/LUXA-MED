"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { CalendarDays, FileText, Plus, Users, Wind } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { fadeUp } from "@/lib/motion";

const tarjetas = [
  {
    icon: Users,
    titulo: "Pacientes",
    valor: "—",
    desc: "Registro y altas (demográfico).",
  },
  {
    icon: Wind,
    titulo: "Sesiones de hoy",
    valor: "—",
    desc: "Terapia hiperbárica: SpO2, ATA, evolución.",
  },
  {
    icon: FileText,
    titulo: "Historia clínica",
    valor: "—",
    desc: "Diagnósticos (acceso por rol).",
  },
  {
    icon: CalendarDays,
    titulo: "Agenda",
    valor: "—",
    desc: "Citas y disponibilidad.",
  },
];

export function DashboardPreview({ nombre }: { nombre: string }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/40 via-background to-background">
      {/* Encabezado */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-pill bg-white p-1.5 shadow-soft">
              <Image
                src="/luxamed-logo.jpeg"
                alt="LUXAMED"
                width={1172}
                height={798}
                className="h-7 w-auto"
              />
            </div>
            <span className="text-sm font-semibold tracking-tight text-primary">
              LUXA-MED
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Contenido */}
      <div className="container py-10">
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Panel
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Hola, <span className="text-primary">{nombre}</span>
          </h1>
          <p className="mt-1 text-muted-foreground">
            Vista de muestra del ADN visual. Los módulos llegan después.
          </p>
        </motion.div>

        {/* Acción principal — único naranja (con disciplina) */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={0.1}
          className="mt-6"
        >
          <Button variant="vital">
            <Plus className="h-4 w-4" />
            Nuevo paciente
          </Button>
        </motion.div>

        {/* Tarjetas */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {tarjetas.map((t, i) => (
            <motion.div
              key={t.titulo}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0.2 + i * 0.08}
            >
              <Card className="h-full transition-all duration-300 ease-breath hover:-translate-y-1 hover:shadow-lift">
                <CardHeader>
                  <div className="flex h-11 w-11 items-center justify-center rounded-pill bg-accent text-primary">
                    <t.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="pt-3 text-base">{t.titulo}</CardTitle>
                  <CardDescription>{t.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-3xl font-semibold tracking-tight">
                    {t.valor}
                  </span>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
