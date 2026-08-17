ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negocios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public.usuarios,
  public.negocios,
  public.servicos,
  public.profissionais,
  public.agendamentos
FROM PUBLIC;

REVOKE ALL PRIVILEGES ON SEQUENCE
  public.usuarios_id_seq,
  public.negocios_id_seq,
  public.servicos_id_seq,
  public.profissionais_id_seq,
  public.agendamentos_id_seq
FROM PUBLIC;

REVOKE ALL PRIVILEGES ON FUNCTION public.atualizar_updated_at() FROM PUBLIC;

DO $$
DECLARE
  data_api_role text;
BEGIN
  FOR data_api_role IN
    SELECT rolname
    FROM pg_roles
    WHERE rolname IN ('anon', 'authenticated', 'service_role')
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE
      public.usuarios,
      public.negocios,
      public.servicos,
      public.profissionais,
      public.agendamentos
      FROM %I', data_api_role);

    EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE
      public.usuarios_id_seq,
      public.negocios_id_seq,
      public.servicos_id_seq,
      public.profissionais_id_seq,
      public.agendamentos_id_seq
      FROM %I', data_api_role);

    EXECUTE format('REVOKE ALL PRIVILEGES ON FUNCTION
      public.atualizar_updated_at() FROM %I', data_api_role);
  END LOOP;
END;
$$;
