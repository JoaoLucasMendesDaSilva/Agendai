-- Todo agendamento deve referenciar serviço e profissional do mesmo negócio.
-- A execução deve ocorrer pelo migration runner do projeto.

DO $appointment_tenant_relationships$
DECLARE
  service_mismatch_count BIGINT;
  professional_mismatch_count BIGINT;
BEGIN
  SELECT
    COUNT(*) FILTER (
      WHERE service.id IS NULL
        OR service.negocio_id IS DISTINCT FROM appointment.negocio_id
    ),
    COUNT(*) FILTER (
      WHERE professional.id IS NULL
        OR professional.negocio_id IS DISTINCT FROM appointment.negocio_id
    )
  INTO service_mismatch_count, professional_mismatch_count
  FROM public.agendamentos AS appointment
  LEFT JOIN public.servicos AS service
    ON service.id = appointment.servico_id
  LEFT JOIN public.profissionais AS professional
    ON professional.id = appointment.profissional_id;

  IF service_mismatch_count > 0 OR professional_mismatch_count > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = format(
        'Migration 007 bloqueada: %s agendamentos com servico inconsistente; %s com profissional inconsistente.',
        service_mismatch_count,
        professional_mismatch_count
      );
  END IF;
END;
$appointment_tenant_relationships$;

ALTER TABLE public.servicos
  ADD CONSTRAINT uk_servicos_id_negocio_id UNIQUE (id, negocio_id);

ALTER TABLE public.profissionais
  ADD CONSTRAINT uk_profissionais_id_negocio_id UNIQUE (id, negocio_id);

ALTER TABLE public.agendamentos
  ADD CONSTRAINT fk_agendamentos_servico_negocio
    FOREIGN KEY (servico_id, negocio_id)
    REFERENCES public.servicos (id, negocio_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
    NOT VALID,
  ADD CONSTRAINT fk_agendamentos_profissional_negocio
    FOREIGN KEY (profissional_id, negocio_id)
    REFERENCES public.profissionais (id, negocio_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
    NOT VALID;

ALTER TABLE public.agendamentos
  VALIDATE CONSTRAINT fk_agendamentos_servico_negocio;

ALTER TABLE public.agendamentos
  VALIDATE CONSTRAINT fk_agendamentos_profissional_negocio;

ALTER TABLE public.agendamentos
  DROP CONSTRAINT fk_agendamentos_servico,
  DROP CONSTRAINT fk_agendamentos_profissional;
