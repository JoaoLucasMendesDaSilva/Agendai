-- Execute depois da migration 002.
ALTER TABLE agendamentos
  ADD COLUMN token_publico_hash CHAR(64),
  ADD CONSTRAINT uk_agendamentos_token_publico_hash UNIQUE (token_publico_hash);
