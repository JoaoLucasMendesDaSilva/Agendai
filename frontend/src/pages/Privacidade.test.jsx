import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import Privacidade from './Privacidade';

const publicoServiceMock = vi.hoisted(() => ({
  buscarNegocioPublico: vi.fn(),
}));

vi.mock('../services/publicoService', () => publicoServiceMock);

vi.mock('../services/privacidadeService', () => ({
  criarSolicitacaoPrivacidade: vi.fn(),
}));

describe('Privacidade', () => {
  afterEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/privacidade');
  });

  test('identifica o controlador e o contato do negocio no aviso', async () => {
    window.history.replaceState({}, '', '/privacidade?negocio=12');
    publicoServiceMock.buscarNegocioPublico.mockResolvedValue({
      negocio: {
        nome: 'Studio Teste',
        contato_privacidade: 'privacidade@studio.test',
      },
    });

    render(<Privacidade />);

    await waitFor(() => {
      expect(screen.getByText('Studio Teste')).toBeInTheDocument();
    });
    expect(
      screen.getByRole('link', { name: 'privacidade@studio.test' })
    ).toHaveAttribute('href', 'mailto:privacidade@studio.test');
  });
});
