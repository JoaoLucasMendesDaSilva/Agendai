export const agenda = [
  { id: 1, hora: '09:00', duracao: '45 min', cliente: 'Rafael Almeida', telefone: '(13) 99765-4321', servico: 'Corte degradê + barba', profissional: 'João Victor', status: 'Confirmado', grupo: 'Hoje' },
  { id: 2, hora: '10:15', duracao: '30 min', cliente: 'Marcos Vinícius', telefone: '(13) 97654-3210', servico: 'Barba', profissional: 'Lucas Ferreira', status: 'Pendente', grupo: 'Hoje' },
  { id: 3, hora: '11:30', duracao: '60 min', cliente: 'André Cruz', telefone: '(13) 91234-5678', servico: 'Corte + barba', profissional: 'João Victor', status: 'Cancelado', grupo: 'Hoje' },
  { id: 4, hora: '13:30', duracao: '45 min', cliente: 'Bruno Santos', telefone: '(13) 99876-5432', servico: 'Corte degradê', profissional: 'Lucas Ferreira', status: 'Em atendimento', grupo: 'Hoje' },
  { id: 5, hora: '15:30', duracao: '60 min', cliente: 'Lucas Ferreira', telefone: '(13) 94567-8901', servico: 'Corte degradê + barba', profissional: 'João Victor', status: 'Confirmado', grupo: 'Hoje' },
  { id: 6, hora: '10:00', duracao: '30 min', cliente: 'Daniel Souza', telefone: '(13) 98888-2211', servico: 'Barba', profissional: 'Marcos Vinícius', status: 'Pendente', grupo: 'Amanhã' },
  { id: 7, hora: '11:00', duracao: '45 min', cliente: 'Caio Augusto', telefone: '(13) 96666-3344', servico: 'Sobrancelha', profissional: 'João Victor', status: 'Confirmado', grupo: 'Amanhã' },
];

export const clientes = [
  { id: 1, nome: 'Rafael Almeida', telefone: '(13) 99765-4321', email: 'rafael.almeida@email.com', total: 14, ultimo: '04 jul 2026', recorrente: true, frequencia: 'A cada 18 dias', favorito: 'Corte degradê', profissional: 'João Victor' },
  { id: 2, nome: 'Marcos Vinícius', telefone: '(13) 97654-3210', email: 'marcos.vinicius@email.com', total: 9, ultimo: '02 jul 2026', recorrente: true, frequencia: 'A cada 24 dias', favorito: 'Barba', profissional: 'Lucas Ferreira' },
  { id: 3, nome: 'João Carlos', telefone: '(13) 99876-5432', email: 'joaocarlos@email.com', total: 5, ultimo: '28 jun 2026', recorrente: false, frequencia: 'A cada 42 dias', favorito: 'Corte clássico', profissional: 'Marcos Vinícius' },
  { id: 4, nome: 'Ana Paula Silva', telefone: '(13) 99123-4567', email: 'anapaula@email.com', total: 3, ultimo: '27 jun 2026', recorrente: false, frequencia: 'A cada 51 dias', favorito: 'Sobrancelha', profissional: 'João Victor' },
  { id: 5, nome: 'Lucas Santos', telefone: '(13) 98234-5678', email: 'lucas.santos@email.com', total: 12, ultimo: '26 jun 2026', recorrente: true, frequencia: 'A cada 21 dias', favorito: 'Corte + barba', profissional: 'Lucas Ferreira' },
  { id: 6, nome: 'Bruno Martins', telefone: '(13) 97543-2109', email: 'bruno.martins@email.com', total: 4, ultimo: '25 jun 2026', recorrente: false, frequencia: 'A cada 38 dias', favorito: 'Pigmentação', profissional: 'João Victor' },
];

export const servicos = [
  { id: 1, nome: 'Corte degradê', descricao: 'Acabamento preciso com máquina e tesoura.', duracao: '45 min', preco: 'R$ 45,00', ativo: true },
  { id: 2, nome: 'Barba', descricao: 'Modelagem, toalha quente e finalização.', duracao: '30 min', preco: 'R$ 30,00', ativo: true },
  { id: 3, nome: 'Corte + barba', descricao: 'Experiência completa de cuidado masculino.', duracao: '75 min', preco: 'R$ 68,00', ativo: true },
  { id: 4, nome: 'Pigmentação', descricao: 'Cobertura natural e acabamento personalizado.', duracao: '40 min', preco: 'R$ 80,00', ativo: true },
  { id: 5, nome: 'Sobrancelha', descricao: 'Limpeza e desenho natural.', duracao: '20 min', preco: 'R$ 22,00', ativo: false },
];

export const profissionais = [
  { id: 1, nome: 'João Victor', especialidade: 'Degradês e barba', agenda: 18, avaliacao: '4,9', ativo: true, foto: '/assets/professional-joao.png' },
  { id: 2, nome: 'Lucas Ferreira', especialidade: 'Cortes clássicos', agenda: 14, avaliacao: '4,8', ativo: true, foto: '/assets/professional-lucas.png' },
  { id: 3, nome: 'Marcos Vinícius', especialidade: 'Barba e design', agenda: 11, avaliacao: '4,9', ativo: true, foto: '/assets/professional-marcos.png' },
  { id: 4, nome: 'Bruno Santos', especialidade: 'Coloração', agenda: 0, avaliacao: '—', ativo: false },
];

export const semana = [12, 18, 26, 30, 22, 34, 6];
export const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
