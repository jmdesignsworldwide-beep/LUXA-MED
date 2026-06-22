# LUXA-MED · Configuración

## 1. Variables de entorno

Tres variables (valores desde Supabase → **Settings → API**):

| Variable | Origen en Supabase | ¿Prefijo `NEXT_PUBLIC_`? | Visibilidad |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | **Sí** | Cliente + servidor |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public | **Sí** | Cliente + servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role | **No** | **Solo servidor** |

> La `service_role` se salta RLS y da acceso total a la base de datos.
> Nunca debe llevar `NEXT_PUBLIC_` ni usarse en código de cliente.

### Local

```bash
cp .env.example .env.local
# pega tus valores en .env.local (está en .gitignore, no se sube)
```

## 2. Vercel → Environment Variables

En el proyecto de Vercel: **Settings → Environment Variables**. Añade las 3,
marcando los entornos **Production**, **Preview** y **Development**:

| Name | Sensitive |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No |
| `SUPABASE_SERVICE_ROLE_KEY` | **Sí (Sensitive)** |

Para `SUPABASE_SERVICE_ROLE_KEY` activa **"Sensitive"** al crearla: Vercel
la cifra y no la vuelve a mostrar en el dashboard (solo se puede sobrescribir).

> Tras añadir o cambiar variables, hay que **redeploy** para que tomen efecto.

## 3. Migraciones (crear/cambiar tablas) — método PAT temporal

No se usa connection string ni terminal local. El flujo es:

1. Generas un **Personal Access Token** en Supabase:
   **Account → Access Tokens → Generate new token**.
2. Me lo pasas (junto con el **Project Ref**, visible en Settings → General).
3. Aplico todas las migraciones agrupadas vía la **Supabase Management API**.
4. Te aviso al terminar para que **revoques (borres) el token** de inmediato.

Las migraciones se guardan versionadas en [`supabase/migrations/`](../supabase/migrations/)
para tener historial, aunque se apliquen vía API.
