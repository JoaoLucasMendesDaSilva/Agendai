import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GerenciarAgendamento from './GerenciarAgendamento';

const publicoServiceMock = vi.hoisted(() => ({
  buscarAgendamentoPublico: vi.fn(),
  cancelarAgendamentoPublico: vi.fn(),
  confirmarPresencaPublica: vi.fn(),
  listarHorariosReagendamento: vi.fn(),
  reagendarAgendamentoPublico: vi.fn(),
}));

vi.mock('../services/publicoService', () => publicoServiceMock);

function criarAgendamento(status = 'pendente') {
  return {
    cliente_nome: 'Ana Souza',
    data_hora_inicio: '2026-07-20T09:00:00',
    negocio_nome: 'Studio Teste',
    observacoes: 'Chegar com dez minutos de antecedência',
    profissional_nome: 'Maria',
    servico_nome: 'Corte',
    status,
  };
}

function criarPromessaControlada() {
  let resolve;
  let reject;
  const promise = new Promise((resolver, rejeitar) => {
    resolve = resolver;
    reject = rejeitar;
  });

  return { promise, reject, resolve };
}

describe('GerenciarAgendamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    publicoServiceMock.cancelarAgendamentoPublico.mockResolvedValue({});
    publicoServiceMock.confirmarPresencaPublica.mockResolvedValue({});
    publicoServiceMock.reagendarAgendamentoPublico.mockResolvedValue({});
  });

  it.each([
    ['cancelado', 'Cancelado'],
    ['concluido', 'Concluído'],
  ])(
    'mantém os detalhes de um agendamento %s sem ações de alteração',
    async (status, statusLabel) => {
      publicoServiceMock.buscarAgendamentoPublico.mockResolvedValue({
        agendamento: criarAgendamento(status),
      });

      render(<GerenciarAgendamento token="token-teste" />);

      expect(await screen.findByText(statusLabel)).toBeInTheDocument();
      expect(screen.getByText('Ana Souza')).toBeInTheDocument();
      expect(screen.getByText('Corte')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(
        /não permite novas alterações/i,
      );
      expect(
        screen.queryByRole('button', { name: /confirmar presença/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /reagendar/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', {
          name: /cancelar agendamento|agendamento cancelado/i,
        }),
      ).not.toBeInTheDocument();
    },
  );

  it('mantém somente os horários da consulta de data mais recente', async () => {
    const user = userEvent.setup();
    const consultaDataA = criarPromessaControlada();
    const consultaDataB = criarPromessaControlada();

    publicoServiceMock.buscarAgendamentoPublico.mockResolvedValue({
      agendamento: criarAgendamento(),
    });
    publicoServiceMock.listarHorariosReagendamento
      .mockReturnValueOnce(consultaDataA.promise)
      .mockReturnValueOnce(consultaDataB.promise);

    render(<GerenciarAgendamento token="token-teste" />);

    await user.click(
      await screen.findByRole('button', { name: 'Reagendar' }),
    );

    const novaData = screen.getByLabelText('Nova data');
    fireEvent.change(novaData, { target: { value: '2026-07-21' } });
    await waitFor(() => {
      expect(
        publicoServiceMock.listarHorariosReagendamento,
      ).toHaveBeenCalledWith('token-teste', '2026-07-21');
    });

    fireEvent.change(novaData, { target: { value: '2026-07-22' } });
    await waitFor(() => {
      expect(
        publicoServiceMock.listarHorariosReagendamento,
      ).toHaveBeenCalledWith('token-teste', '2026-07-22');
    });

    await act(async () => {
      consultaDataA.resolve({
        horarios: [{ data_hora_inicio: '2026-07-21T09:00:00' }],
      });
    });

    expect(
      screen.queryByRole('button', { name: '09:00' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Carregando horários...',
    );

    await act(async () => {
      consultaDataB.resolve({
        horarios: [{ data_hora_inicio: '2026-07-22T10:00:00' }],
      });
    });

    expect(
      await screen.findByRole('button', { name: '10:00' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '09:00' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Carregando horários...'),
    ).not.toBeInTheDocument();
  });
});
