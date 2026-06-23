-- =============================================================================
-- 0031  Documentos del paciente (respaldo de imágenes escaneadas)
-- =============================================================================
-- Guarda la imagen ORIGINAL de los documentos escaneados (cédula, referimiento,
-- laboratorio) adjunta al expediente. Datos médicos sensibles (Ley 172-13):
--   * Bucket de Storage PRIVADO (no público).
--   * Tabla con RLS + FORCE RLS: el personal (admin/enfermera/recepción) que ya
--     ve y registra pacientes puede ver/adjuntar; borrar solo admin.
--   * audit_log en la tabla.
-- Idempotente.
-- =============================================================================

-- 1) Bucket privado para los documentos.
insert into storage.buckets (id, name, public)
values ('documentos-pacientes', 'documentos-pacientes', false)
on conflict (id) do nothing;

-- 2) Tabla de metadatos (qué documento, de quién, dónde está, quién lo subió).
create table if not exists public.documentos_paciente (
  id           uuid primary key default gen_random_uuid(),
  paciente_id  uuid not null references public.pacientes (id) on delete cascade,
  tipo         text not null default 'documento',  -- cedula | referimiento | laboratorio | estudio | documento
  storage_path text not null,
  mime         text,
  nota         text,
  subido_por   uuid references public.user_profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_documentos_paciente_pac on public.documentos_paciente (paciente_id, created_at desc);

drop trigger if exists trg_audit_documentos_paciente on public.documentos_paciente;
create trigger trg_audit_documentos_paciente
  after insert or update or delete on public.documentos_paciente
  for each row execute function public.fn_audit();

revoke all on public.documentos_paciente from anon, public;
grant select, insert, update, delete on public.documentos_paciente to authenticated;
alter table public.documentos_paciente enable row level security;
alter table public.documentos_paciente force  row level security;

drop policy if exists docpac_select on public.documentos_paciente;
create policy docpac_select on public.documentos_paciente
  for select to authenticated using (public.is_staff());
drop policy if exists docpac_insert on public.documentos_paciente;
create policy docpac_insert on public.documentos_paciente
  for insert to authenticated with check (public.is_staff());
drop policy if exists docpac_delete on public.documentos_paciente;
create policy docpac_delete on public.documentos_paciente
  for delete to authenticated using (public.is_admin());

-- 3) RLS en los objetos de Storage, acotado a ESTE bucket.
--    Solo el personal puede subir/ver; borrar solo admin. (anon: nada.)
drop policy if exists docpac_obj_select on storage.objects;
create policy docpac_obj_select on storage.objects
  for select to authenticated
  using (bucket_id = 'documentos-pacientes' and public.is_staff());

drop policy if exists docpac_obj_insert on storage.objects;
create policy docpac_obj_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documentos-pacientes' and public.is_staff());

drop policy if exists docpac_obj_delete on storage.objects;
create policy docpac_obj_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'documentos-pacientes' and public.is_admin());
