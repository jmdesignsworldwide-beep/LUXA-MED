# SETUP — LUXAMED

Guía de configuración local, variables de entorno, migraciones y despliegue.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui · Framer Motion ·
Supabase (Postgres + Auth + RLS) · Vercel.

## 1. Variables de entorno

1. Copia `.env.example` a `.env.local`.
2. Rellena con los valores de tu proyecto Supabase:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> `.env.local` está en `.gitignore` y **NUNCA** se sube al repo.
> La **`service_role` key** salta todas las políticas RLS: **no va** en el
> repo, ni en el navegador, ni se pide por chat. Si un proceso de servidor la
> necesita, se configura como secreto **Server-only** en Vercel.

Las variables se validan con **zod** en `src/lib/env.ts`: si falta algo, la app
no arranca (falla temprano y claro).

## 2. Correr en local

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # verificación de tipos
npm run lint
```

## 3. Migraciones de base de datos

Las migraciones viven en `supabase/migrations/`, numeradas e **idempotentes**
(se pueden correr varias veces sin romper). Orden:

| Archivo | Qué hace |
|---|---|
| `0001_init_extensions_and_roles.sql` | Extensiones, enum `user_role`, `set_updated_at()` |
| `0002_user_profiles.sql` | Perfiles + helpers de rol para RLS |
| `0003_core_tables.sql` | `empleados`, `pacientes`, `historia_clinica` |
| `0004_audit_log.sql` | Bitácora de auditoría + triggers |
| `0005_rls_policies.sql` | RLS + FORCE RLS + políticas en todas las tablas |

### Cómo se aplican

Se ejecutan **una sola vez por tanda** usando un **PAT temporal** de Supabase
(Personal Access Token) contra la Management API. El PAT se usa y se **revoca
apenas termina**. Nunca se guarda en el repo.

```bash
# Project Ref se saca de la URL del proyecto: https://<REF>.supabase.co
# Ejemplo de aplicación de una migración vía Management API:
curl -sS -X POST "https://api.supabase.com/v1/projects/<REF>/database/query" \
  -H "Authorization: Bearer <PAT_TEMPORAL>" \
  -H "Content-Type: application/json" \
  --data-binary @<(jq -Rs '{query: .}' supabase/migrations/0001_init_extensions_and_roles.sql)
```

> Alternativa: pegar el contenido de cada archivo en el **SQL Editor** de
> Supabase, en orden 0001 → 0005.

## 4. Test de seguridad (RLS)

`supabase/tests/rls_simulation_test.sql` simula los 4 roles y verifica qué ve
y qué escribe cada uno. Es **no destructivo** (`BEGIN … ROLLBACK`).

```bash
psql "<connection-string>" -f supabase/tests/rls_simulation_test.sql
```

Lo crítico que valida: **Recepción no puede ver ni escribir `historia_clinica`
(diagnósticos), ni ver `empleados`, ni leer `audit_log`.**

## 5. Despliegue (Vercel)

1. Conectar el repo a Vercel.
2. Definir las variables `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` en el proyecto de Vercel.
3. La `service_role` (si llega a hacer falta) se agrega como secreto
   **Server-only**, nunca como `NEXT_PUBLIC_*`.

## Convenciones (RD)

- Fechas: **DD/MM/AAAA**
- Moneda: **RD$** (DOP)
- Cédula: **000-0000000-0**
- Idioma: español dominicano.
