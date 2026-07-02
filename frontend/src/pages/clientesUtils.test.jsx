import { describe, expect, it } from 'vitest';
import { agruparClientes } from './clientesUtils';

describe('clientesUtils', () => {
  it('agrupa clientes pelo telefone antes de email e nome', () => {
    const clientes = agruparClientes([
      {
        id: 1,
        cliente_nome: 'Ana',
        cliente_telefone: '(13) 99999-0000',
        cliente_email: 'ana@exemplo.com',
        data_hora_inicio: '2026-06-10T10:00:00',
      },
      {
        id: 2,
        cliente_nome: 'Nome alterado',
        cliente_telefone: '13999990000',
        cliente_email: 'outro@exemplo.com',
        data_hora_inicio: '2026-06-11T10:00:00',
      },
    ]);

    expect(clientes).toHaveLength(1);
    expect(clientes[0]).toMatchObject({
      chave: '13999990000',
      totalAgendamentos: 2,
    });
  });

  it('agrupa clientes pelo email normalizado quando nao ha telefone', () => {
    const clientes = agruparClientes([
      {
        id: 1,
        cliente_nome: 'Bruno',
        cliente_telefone: '',
        cliente_email: 'BRUNO@EXEMPLO.COM ',
        data_hora_inicio: '2026-06-10T10:00:00',
      },
      {
        id: 2,
        cliente_nome: 'Bruno Silva',
        cliente_telefone: '',
        cliente_email: 'bruno@exemplo.com',
        data_hora_inicio: '2026-06-12T10:00:00',
      },
    ]);

    expect(clientes).toHaveLength(1);
    expect(clientes[0].chave).toBe('bruno@exemplo.com');
  });

  it('agrupa clientes pelo nome normalizado quando nao ha contato', () => {
    const clientes = agruparClientes([
      {
        id: 1,
        cliente_nome: 'João da Silva',
        cliente_telefone: '',
        cliente_email: '',
        data_hora_inicio: '2026-06-10T10:00:00',
      },
      {
        id: 2,
        cliente_nome: ' joao da silva ',
        cliente_telefone: '',
        cliente_email: '',
        data_hora_inicio: '2026-06-12T10:00:00',
      },
    ]);

    expect(clientes).toHaveLength(1);
    expect(clientes[0]).toMatchObject({
      chave: 'joao da silva',
      totalAgendamentos: 2,
    });
  });
});
