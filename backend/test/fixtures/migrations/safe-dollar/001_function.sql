CREATE FUNCTION public.fixture_function()
RETURNS trigger
LANGUAGE plpgsql
AS $body$
BEGIN
  NEW.nome := 'COMMIT; CREATE INDEX CONCURRENTLY';
  RETURN NEW;
END;
$body$;
