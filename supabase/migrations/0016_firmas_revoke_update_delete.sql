-- =============================================================================
-- 0016  Blindar la inmutabilidad de las firmas (revocar UPDATE/DELETE)
-- =============================================================================
-- La tabla firmas_consentimiento no tiene políticas RLS de UPDATE/DELETE (afecta
-- 0 filas), pero los privilegios por defecto de Supabase otorgan update/delete a
-- 'authenticated'. Los revocamos explícitamente para que cualquier intento falle
-- de forma ruidosa (permission denied) — integridad legal a prueba de balas.
-- Idempotente.
-- =============================================================================

revoke update, delete, truncate on public.firmas_consentimiento from authenticated;
revoke update, delete, truncate on public.firmas_consentimiento from anon;
