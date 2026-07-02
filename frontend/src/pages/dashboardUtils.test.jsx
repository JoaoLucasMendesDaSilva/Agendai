import { describe, expect, it } from 'vitest';
import {
  contarClientesUnicos,
  filtrarAgendamentosPorPeriodo,
} from './dashboardUtils';

describe('dashboardUtils', () => {
  it('filtra agendamentos incluindo o primeiro e ultimo dia do periodo', () => {
    const agendamentos = [
      { id: 1, data_hora_inicio: '2026-06-09T23:59:59' },
      { id: 2, data_hora_inicio: '2026-06-10T00:00:00' },
      { id: 3, data_hora_inicio: '2026-06-15T12:30:00' },
      { id: 4, data_hora_inicio: '2026-06-20T23:59:59' },
      { id: 5, data_hora_inicio: '2026-06-21T00:00:00' },
      { id: 6, data_hora_inicio: 'data-invalida' },
    ];

    expect(
      filtrarAgendamentosPorPeriodo(agendamentos, '2026-06-10', '2026-06-20')
        .map((agendamento) => agendamento.id),
    ).toEqual([2, 3, 4]);
  });

  it('conta clientes unicos priorizando telefone, email e nome', () => {
    const agendamentos = [
      {
        cliente_nome: 'Ana Paula',
        cliente_telefone: '(13) 99999-0000',
        cliente_email: 'ana@exemplo.com',
      },
      {
        cliente_nome: 'Outro nome',
        cliente_telefone: '13999990000',
        cliente_email: 'outro@exemplo.com',
      },
      {
        cliente_nome: 'Bruno',
        cliente_telefone: '',
        cliente_email: 'BRUNO@EXEMPLO.COM',
      },
      {
        cliente_nome: 'Bruno Silva',
        cliente_telefone: '',
        cliente_email: 'bruno@exemplo.com',
      },
      {
        cliente_nome: 'Carla',
        cliente_telefone: '',
        cliente_email: '',
      },
      {
        cliente_nome: 'carla',
        cliente_telefone: '',
        cliente_email: '',
      },
    ];

    expect(contarClientesUnicos(agendamentos)).toBe(3);
  });
});
