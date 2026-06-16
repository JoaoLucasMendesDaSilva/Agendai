-- Migration 001: schema inicial do MVP de agendamento online.
-- Execute este arquivo no MySQL Workbench usando um usuario com permissao para criar banco e tabelas.

CREATE DATABASE IF NOT EXISTS tcc_agendamento
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tcc_agendamento;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Guarda os empreendedores que acessam o painel privado.
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  telefone VARCHAR(30) NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT uk_usuarios_email UNIQUE (email),
  INDEX idx_usuarios_ativo (ativo)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Empreendedores que usam o sistema.';

-- Guarda os negocios cadastrados pelos empreendedores.
CREATE TABLE IF NOT EXISTS negocios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  nome VARCHAR(150) NOT NULL,
  slug_publico VARCHAR(160) NOT NULL,
  descricao TEXT NULL,
  telefone VARCHAR(30) NULL,
  endereco VARCHAR(255) NULL,
  cidade VARCHAR(100) NULL DEFAULT 'Cubatao',
  horario_abertura TIME NOT NULL DEFAULT '08:00:00',
  horario_fechamento TIME NOT NULL DEFAULT '18:00:00',
  intervalo_agendamento_minutos INT NOT NULL DEFAULT 30,
  dias_funcionamento JSON NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT uk_negocios_slug_publico UNIQUE (slug_publico),
  CONSTRAINT fk_negocios_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT chk_negocios_intervalo_agendamento
    CHECK (intervalo_agendamento_minutos > 0),
  CONSTRAINT chk_negocios_horario_funcionamento
    CHECK (horario_fechamento > horario_abertura),
  CONSTRAINT chk_negocios_dias_funcionamento_array
    CHECK (dias_funcionamento IS NULL OR JSON_TYPE(dias_funcionamento) = 'ARRAY'),

  INDEX idx_negocios_usuario_id (usuario_id),
  INDEX idx_negocios_ativo (ativo)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Negocios que recebem servicos, profissionais e agendamentos.';

-- Guarda os servicos oferecidos por cada negocio.
CREATE TABLE IF NOT EXISTS servicos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  negocio_id INT NOT NULL,
  nome VARCHAR(120) NOT NULL,
  descricao TEXT NULL,
  duracao_minutos INT NOT NULL,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_servicos_negocio
    FOREIGN KEY (negocio_id)
    REFERENCES negocios (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT chk_servicos_duracao
    CHECK (duracao_minutos > 0),
  CONSTRAINT chk_servicos_preco
    CHECK (preco >= 0),

  INDEX idx_servicos_negocio_id (negocio_id),
  INDEX idx_servicos_negocio_ativo (negocio_id, ativo)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Servicos cadastrados por negocio; remocao logica via ativo=false.';

-- Guarda os profissionais disponiveis para atendimento em cada negocio.
CREATE TABLE IF NOT EXISTS profissionais (
  id INT AUTO_INCREMENT PRIMARY KEY,
  negocio_id INT NOT NULL,
  nome VARCHAR(120) NOT NULL,
  telefone VARCHAR(30) NULL,
  email VARCHAR(180) NULL,
  especialidade VARCHAR(120) NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_profissionais_negocio
    FOREIGN KEY (negocio_id)
    REFERENCES negocios (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  INDEX idx_profissionais_negocio_id (negocio_id),
  INDEX idx_profissionais_negocio_ativo (negocio_id, ativo)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Profissionais cadastrados por negocio; remocao logica via ativo=false.';

-- Guarda os agendamentos feitos pelos clientes no fluxo publico.
CREATE TABLE IF NOT EXISTS agendamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  negocio_id INT NOT NULL,
  servico_id INT NOT NULL,
  profissional_id INT NOT NULL,
  cliente_nome VARCHAR(120) NOT NULL,
  cliente_telefone VARCHAR(30) NOT NULL,
  cliente_email VARCHAR(180) NULL,
  data_hora_inicio DATETIME NOT NULL,
  data_hora_fim DATETIME NOT NULL,
  status ENUM('pendente', 'confirmado', 'cancelado', 'concluido') NOT NULL DEFAULT 'confirmado',
  observacoes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_agendamentos_negocio
    FOREIGN KEY (negocio_id)
    REFERENCES negocios (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_agendamentos_servico
    FOREIGN KEY (servico_id)
    REFERENCES servicos (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_agendamentos_profissional
    FOREIGN KEY (profissional_id)
    REFERENCES profissionais (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT chk_agendamentos_periodo
    CHECK (data_hora_fim > data_hora_inicio),

  INDEX idx_agendamentos_negocio_id (negocio_id),
  INDEX idx_agendamentos_servico_id (servico_id),
  INDEX idx_agendamentos_profissional_id (profissional_id),
  INDEX idx_agendamentos_negocio_inicio (negocio_id, data_hora_inicio),
  INDEX idx_agendamentos_profissional_periodo (profissional_id, data_hora_inicio, data_hora_fim),
  INDEX idx_agendamentos_profissional_status_periodo (profissional_id, status, data_hora_inicio, data_hora_fim)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Agendamentos publicos vinculados a negocio, servico e profissional.';
