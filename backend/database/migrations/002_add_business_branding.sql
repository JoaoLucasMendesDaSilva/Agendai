-- Migration 002: adiciona identidade visual aos negocios existentes.
-- Selecione o schema configurado em DB_NAME e execute uma unica vez depois da migration 001.

ALTER TABLE negocios
  ADD COLUMN logo_url VARCHAR(500) NULL AFTER dias_funcionamento,
  ADD COLUMN banner_url VARCHAR(500) NULL AFTER logo_url;

