import { render, screen, waitFor } from '@testing-library/react';
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
});
