-- Execute depois da migration 001.
ALTER TABLE negocios
  ADD COLUMN logo_url VARCHAR(500),
  ADD COLUMN banner_url VARCHAR(500);
