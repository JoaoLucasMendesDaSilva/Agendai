import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AgendamentoPublico from './AgendamentoPublico';

const publicoServiceMock = vi.hoisted(() => ({
  buscarNegocioPublico: vi.fn(),
  criarAgendamentoPublico: vi.fn(),
  listarHorariosDisponiveis: vi.fn(),
  listarProfissionaisPublicos: vi.fn(),
  listarServicosPublicos: vi.fn(),
}));

vi.mock('../services/publicoService', () => publicoServiceMock);

function criarPromessaControlada() {
  let resolve;
  let reject;
  const promise = new Promise((resolver, rejeitar) => {
    resolve = resolver;
    reject = rejeitar;
  });

  return { promise, reject, resolve };
}

describe('AgendamentoPublico', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    publicoServiceMock.buscarNegocioPublico.mockResolvedValue({
      negocio: {
        id: 1,
        nome: 'Studio Teste',
        descricao: 'Atendimento por agendamento',
        cidade: 'Cubatao',
        endereco: 'Centro',
        telefone: '13999990000',
        dias_funcionamento: [1, 2, 3, 4, 5],
        horario_abertura: '08:00:00',
        horario_fechamento: '18:00:00',
      },
    });
    publicoServiceMock.listarServicosPublicos.mockResolvedValue({
      servicos: [
        {
          id: 1,
          nome: 'Corte rapido',
          descricao: 'Atendimento simples',
          duracao_minutos: 30,
          preco: 50,
        },
      ],
    });
    publicoServiceMock.listarProfissionaisPublicos.mockResolvedValue({
      profissionais: [
        {
          id: 2,
          nome: 'Maria',
          especialidade: 'Cabelos',
        },
      ],
    });
    publicoServiceMock.listarHorariosDisponiveis.mockResolvedValue({
      horarios: [
        {
          data_hora_inicio: '2026-06-26T09:00:00',
        },
      ],
    });
  });

  it('marca servico, profissional e horario selecionados', async () => {
    const user = userEvent.setup();

    render(<AgendamentoPublico slugOuId="studio-teste" />);

    const servico = await screen.findByRole('button', { name: /Corte rapido/i });
    expect(servico).toHaveAttribute('aria-pressed', 'false');
    await user.click(servico);

    expect(servico).toHaveClass('is-selected');
    expect(servico).toHaveAttribute('aria-pressed', 'true');

    const profissional = await screen.findByRole('button', { name: /Maria/i });
    await user.click(profissional);

    expect(profissional).toHaveClass('is-selected');
    expect(profissional).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => {
      expect(publicoServiceMock.listarHorariosDisponiveis).toHaveBeenCalledWith(
        'studio-teste',
        expect.objectContaining({
          profissional_id: '2',
          servico_id: '1',
        }),
      );
    });

    const horario = await screen.findByRole('button', { name: '09:00' });
    await user.click(horario);

    expect(horario).toHaveClass('is-selected');
    expect(horario).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '4');
    expect(
      screen.getByRole('heading', { name: /Informe seus dados/i }),
    ).toBeInTheDocument();
  });

  it('anuncia falhas de carregamento como alerta acessivel', async () => {
    publicoServiceMock.buscarNegocioPublico.mockRejectedValueOnce(
      new Error('Negócio indisponível'),
    );

    render(<AgendamentoPublico slugOuId="studio-teste" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Confira o endereço recebido',
    );
  });

  it('mantem a confirmacao quando a atualizacao auxiliar de horarios falha', async () => {
    const user = userEvent.setup();
    const atualizacaoAuxiliar = criarPromessaControlada();
    publicoServiceMock.listarHorariosDisponiveis
      .mockResolvedValueOnce({
        horarios: [{ data_hora_inicio: '2026-06-26T09:00:00' }],
      })
      .mockImplementationOnce(() => atualizacaoAuxiliar.promise);
    publicoServiceMock.criarAgendamentoPublico.mockResolvedValue({
      mensagem: 'Agendamento confirmado com sucesso.',
      agendamento: { token_gerenciamento: 'token-de-teste' },
    });

    render(<AgendamentoPublico slugOuId="studio-teste" />);

    await user.click(
      await screen.findByRole('button', { name: /Corte rapido/i }),
    );
    await user.click(await screen.findByRole('button', { name: /Maria/i }));
    await user.click(await screen.findByRole('button', { name: '09:00' }));
    await user.type(screen.getByRole('textbox', { name: /^Nome$/i }), 'Joao');
    await user.type(
      screen.getByRole('textbox', { name: /^Telefone$/i }),
      '13999990000',
    );
    await user.click(
      screen.getByRole('button', { name: /Confirmar agendamento/i }),
    );

    await waitFor(() => {
      expect(
        publicoServiceMock.listarHorariosDisponiveis,
      ).toHaveBeenCalledTimes(2);
    });
    await act(async () => {
      atualizacaoAuxiliar.reject(new Error('Falha ao atualizar horários'));
      await atualizacaoAuxiliar.promise.catch(() => {});
    });

    expect(
      await screen.findByRole('heading', { name: /Agendamento confirmado/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Agendamento confirmado com sucesso.',
    );
    expect(
      screen.getByRole('link', { name: /Gerenciar agendamento/i }),
    ).toHaveAttribute(
      'href',
      `${window.location.origin}/gerenciar-agendamento/token-de-teste`,
    );
    expect(
      screen.queryByRole('button', { name: '09:00' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(publicoServiceMock.criarAgendamentoPublico).toHaveBeenCalledTimes(1);
  });

  it('exibe apenas os horarios da consulta de data mais recente', async () => {
    const user = userEvent.setup();
    const consultaDataA = criarPromessaControlada();
    const consultaDataB = criarPromessaControlada();
    publicoServiceMock.listarHorariosDisponiveis
      .mockResolvedValueOnce({
        horarios: [{ data_hora_inicio: '2026-07-11T08:00:00' }],
      })
      .mockImplementationOnce(() => consultaDataA.promise)
      .mockImplementationOnce(() => consultaDataB.promise);

    render(<AgendamentoPublico slugOuId="studio-teste" />);

    await user.click(
      await screen.findByRole('button', { name: /Corte rapido/i }),
    );
    await user.click(await screen.findByRole('button', { name: /Maria/i }));
    await waitFor(() => {
      expect(
        publicoServiceMock.listarHorariosDisponiveis,
      ).toHaveBeenCalledTimes(1);
    });
    expect(
      await screen.findByRole('button', { name: '08:00' }),
    ).toBeInTheDocument();

    const campoData = screen.getByLabelText(/Data do agendamento/i);
    fireEvent.change(campoData, { target: { value: '2026-07-14' } });
    expect(
      screen.queryByRole('button', { name: '08:00' }),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(publicoServiceMock.listarHorariosDisponiveis).toHaveBeenCalledWith(
        'studio-teste',
        expect.objectContaining({ data: '2026-07-14' }),
      );
    });
    fireEvent.change(campoData, { target: { value: '2026-07-15' } });
    await waitFor(() => {
      expect(publicoServiceMock.listarHorariosDisponiveis).toHaveBeenCalledWith(
        'studio-teste',
        expect.objectContaining({ data: '2026-07-15' }),
      );
    });

    await act(async () => {
      consultaDataA.resolve({
        horarios: [{ data_hora_inicio: '2026-07-14T09:00:00' }],
      });
      await consultaDataA.promise;
    });

    expect(
      screen.queryByRole('button', { name: '09:00' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      /Carregando horários/i,
    );

    await act(async () => {
      consultaDataB.resolve({
        horarios: [{ data_hora_inicio: '2026-07-15T10:00:00' }],
      });
      await consultaDataB.promise;
    });

    expect(
      await screen.findByRole('button', { name: '10:00' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '09:00' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
