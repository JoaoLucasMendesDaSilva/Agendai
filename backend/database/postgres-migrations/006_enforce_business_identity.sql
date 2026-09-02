-- Um empreendedor autenticado possui no máximo um negócio.
-- A execução deve ocorrer pelo migration runner do projeto.

LOCK TABLE public.negocios IN SHARE ROW EXCLUSIVE MODE;

DO $business_identity$
DECLARE
  duplicate_owner_group_count BIGINT;
BEGIN
  SELECT COUNT(*)
  INTO duplicate_owner_group_count
  FROM (
    SELECT usuario_id
    FROM public.negocios
    GROUP BY usuario_id
    HAVING COUNT(*) > 1
  ) AS duplicate_owner_groups;

  IF duplicate_owner_group_count > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = format(
        'Migration 006 bloqueada: %s proprietarios possuem mais de um negocio.',
        duplicate_owner_group_count
      );
  END IF;
END;
$business_identity$;

ALTER TABLE public.negocios
  ADD CONSTRAINT uk_negocios_usuario_id UNIQUE (usuario_id);

DROP INDEX public.idx_negocios_usuario_id;
