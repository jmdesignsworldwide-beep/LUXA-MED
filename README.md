# LUXA-MED

Sistema de gestión para una **clínica hiperbárica** en República Dominicana.
Maneja **datos médicos reales** — la seguridad (RLS + auditoría) es la columna
vertebral, no un extra.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui · Framer Motion ·
Supabase · Vercel.

## Seguridad desde el día 1

- **RLS + FORCE RLS** en todas las tablas.
- **4 roles fijos** (un usuario = un rol): admin, médico, enfermera, recepción.
  - Recepción **nunca** ve diagnósticos ni historia clínica (garantizado por RLS).
  - Solo Admin ve datos privados de empleados.
- **`audit_log`** desde el inicio (quién hizo qué, cuándo).
- Validación con **zod** del lado del servidor.

## Documentación

- [`docs/SETUP.md`](docs/SETUP.md) — entorno, migraciones, despliegue, test RLS.
- [`PENDIENTES.md`](PENDIENTES.md) — decisiones fiscales/legales abiertas.

> Rama principal del repositorio: **`main`**.
