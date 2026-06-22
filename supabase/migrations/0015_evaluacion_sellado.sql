-- =============================================================================
-- 0015  Sellado de la evaluación: inmutable una vez finalizada (firmada)
-- =============================================================================
-- Flujo: la evaluación vive como 'borrador' (editable libremente). Al firmar el
-- consentimiento, pasa a 'finalizada' y queda SELLADA: no se puede editar más.
-- Para correcciones posteriores se crea una NUEVA evaluación (anexo); el
-- original sellado se conserva intacto.
-- Se enforce con un trigger BEFORE UPDATE. Idempotente.
-- =============================================================================

create or replace function public.fn_eval_bloquea_finalizada()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.estado = 'finalizada' then
    raise exception 'La evaluación está firmada y sellada; no se puede editar (cree un anexo).'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_eval_bloquea_finalizada on public.evaluaciones_hbo;
create trigger trg_eval_bloquea_finalizada
  before update on public.evaluaciones_hbo
  for each row execute function public.fn_eval_bloquea_finalizada();
