import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Search, UserCheck, Users } from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import { useAuth } from '../contexts/AuthContext';
import { listarAgendamentos } from '../services/agendamentosService';

const STATUS_LABELS = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
  concluido: 'Concluído',
};

function normalizarTexto(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function obterData(valor) {
  const data = new Date(String(valor || '').replace(' ', 'T'));
  return Number.isNaN(data.getTime()) ? null : data;
}

function formatarData(valor) {
  const data = valor instanceof Date ? valor : obterData(valor);

  if (!data) {
    return 'Data não informada';
  }

  return data.toLocaleDateString('pt-BR');
}

function criarChaveCliente(agendamento) {
  const telefone = String(agendamento.cliente_telefone || '').replace(/\D/g, '');
  const email = String(agendamento.cliente_email || '').trim().toLowerCase();
  const nome = normalizarTexto(agendamento.cliente_nome);

  return telefone || email || nome;
}

function ordenarPorDataDesc(a, b) {
  const dataA = obterData(a.data_hora_inicio)?.getTime() || 0;
  const dataB = obterData(b.data_hora_inicio)?.getTime() || 0;

  return dataB - dataA;
}

function agruparClientes(agendamentos) {
  const mapaClientes = new Map();

  agendamentos.forEach((agendamento) => {
    const chave = criarChaveCliente(agendamento);

    if (!chave) {
      return;
    }

    if (!mapaClientes.has(chave)) {
      mapaClientes.set(chave, {
        chave,
        nome: agendamento.cliente_nome || 'Cliente sem nome',
        telefone: agendamento.cliente_telefone || '',
        email: agendamento.cliente_email || '',
        agendamentos: [],
        totalAgendamentos: 0,
        primeiroAtendimento: null,
        ultimoAtendimento: null,
      });
    }

    const cliente = mapaClientes.get(chave);
    const dataAtendimento = obterData(agendamento.data_hora_inicio);

    cliente.agendamentos.push(agendamento);
    cliente.totalAgendamentos += 1;
    cliente.nome = cliente.nome || agendamento.cliente_nome || 'Cliente sem nome';
    cliente.telefone = cliente.telefone || agendamento.cliente_telefone || '';
    cliente.email = cliente.email || agendamento.cliente_email || '';

    if (dataAtendimento) {
      if (!cliente.primeiroAtendimento || dataAtendimento < cliente.primeiroAtendimento) {
        cliente.primeiroAtendimento = dataAtendimento;
      }

      if (!cliente.ultimoAtendimento || dataAtendimento > cliente.ultimoAtendimento) {
        cliente.ultimoAtendimento = dataAtendimento;
      }
    }
  });

  return Array.from(mapaClientes.values())
    .map((cliente) => ({
      ...cliente,
      agendamentos: cliente.agendamentos.sort(ordenarPorDataDesc),
    }))
    .sort((a, b) => {
      const dataA = a.ultimoAtendimento?.getTime() || 0;
      const dataB = b.ultimoAtendimento?.getTime() || 0;

      return dataB - dataA;
    });
}

function filtrarClientes(clientes, busca) {
  const termo = normalizarTexto(busca);

  if (!termo) {
    return clientes;
  }

  return clientes.filter((cliente) => {
    const conteudo = normalizarTexto(
      `${cliente.nome} ${cliente.telefone} ${cliente.email}`,
    );

    return conteudo.includes(termo);
  });
}

function calcularNovosClientes(clientes) {
  const limite = new Date();
  limite.setHours(0, 0, 0, 0);
  limite.setDate(limite.getDate() - 30);

  return clientes.filter(
    (cliente) =>
      cliente.primeiroAtendimento && cliente.primeiroAtendimento >= limite,
  ).length;
}

function Clientes({ navigate }) {
  const { logout, usuario } = useAuth();
  const montadoRef = useRef(false);
  const [agendamentos, setAgendamentos] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregarClientes = useCallback(async (silencioso = false) => {
      if (!silencioso) {
        setCarregando(true);
      }
      setErro('');

      try {
        const resposta = await listarAgendamentos();

        if (montadoRef.current) {
          setAgendamentos(resposta.agendamentos || []);
        }
      } catch (err) {
        if (montadoRef.current) {
          setErro(err.message);

          if (!silencioso) {
            setAgendamentos([]);
          }
        }
      } finally {
        if (montadoRef.current && !silencioso) {
          setCarregando(false);
        }
      }
  }, []);

  useEffect(() => {
    montadoRef.current = true;

    carregarClientes();

    function handleFocus() {
      carregarClientes(true);
    }

    window.addEventListener('focus', handleFocus);

    return () => {
      montadoRef.current = false;
      window.removeEventListener('focus', handleFocus);
    };
  }, [carregarClientes]);

  const clientes = useMemo(() => agruparClientes(agendamentos), [agendamentos]);
  const clientesFiltrados = useMemo(
    () => filtrarClientes(clientes, busca),
    [clientes, busca],
  );
  const clienteAtivo =
    clientes.find((cliente) => cliente.chave === clienteSelecionado) ||
    clientesFiltrados[0] ||
    null;

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <DashboardShell
      currentPath="/clientes"
      navigate={navigate}
      onLogout={handleLogout}
      usuario={usuario}
    >
      <header className="page-title">
        <div>
          <p className="eyebrow">Painel do empreendedor</p>
          <h1>Clientes</h1>
          <p className="panel-text">
            Consulte clientes reais gerados pelos agendamentos do seu negócio.
          </p>
        </div>
      </header>

      {erro && <p className="message message-error">{erro}</p>}

      <section className="metrics-grid" aria-label="Resumo de clientes">
        <article className="metric-card">
          <span className="metric-icon" aria-hidden="true">
            <Users size={22} strokeWidth={2} />
          </span>
          <div>
            <p>Total de clientes</p>
            <strong>{carregando ? '...' : clientes.length}</strong>
            <small>Clientes únicos identificados</small>
          </div>
        </article>

        <article className="metric-card">
          <span className="metric-icon metric-blue" aria-hidden="true">
            <UserCheck size={22} strokeWidth={2} />
          </span>
          <div>
            <p>Clientes recorrentes</p>
            <strong>
              {carregando
                ? '...'
                : clientes.filter((cliente) => cliente.totalAgendamentos > 1).length}
            </strong>
            <small>Mais de 1 agendamento</small>
          </div>
        </article>

        <article className="metric-card">
          <span className="metric-icon metric-yellow" aria-hidden="true">
            <CalendarDays size={22} strokeWidth={2} />
          </span>
          <div>
            <p>Novos clientes</p>
            <strong>{carregando ? '...' : calcularNovosClientes(clientes)}</strong>
            <small>Primeiro agendamento em 30 dias</small>
          </div>
        </article>
      </section>

      <section className="clients-grid">
        <article className="dashboard-panel" aria-labelledby="clientes-title">
          <div className="panel-heading">
            <div>
              <h2 id="clientes-title">Lista de clientes</h2>
              <p className="panel-text">
                Busque por nome, telefone ou e-mail.
              </p>
            </div>
          </div>

          <label className="search-field">
            <Search aria-hidden="true" size={18} strokeWidth={2} />
            <span className="sr-only">Buscar cliente</span>
            <input
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar cliente"
              type="search"
              value={busca}
            />
          </label>

          {carregando && (
            <p className="message message-info" aria-live="polite">
              Carregando clientes...
            </p>
          )}

          {!carregando && clientesFiltrados.length === 0 && (
            <div className="dashboard-empty">
              <span className="empty-icon" aria-hidden="true">
                <Users size={24} strokeWidth={2} />
              </span>
              <div>
                <strong>Nenhum cliente encontrado</strong>
                <p>
                  Clientes aparecem aqui depois que existem agendamentos no
                  negócio.
                </p>
              </div>
            </div>
          )}

          <div className="entity-list clients-list">
            {clientesFiltrados.map((cliente) => (
              <button
                className={`client-card ${
                  clienteAtivo?.chave === cliente.chave ? 'is-selected' : ''
                }`}
                key={cliente.chave}
                onClick={() => setClienteSelecionado(cliente.chave)}
                type="button"
              >
                <div className="client-card-header">
                  <span className="client-avatar" aria-hidden="true">
                    {cliente.nome.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <strong>{cliente.nome}</strong>
                    <small>
                      {cliente.totalAgendamentos} agendamento
                      {cliente.totalAgendamentos === 1 ? '' : 's'}
                    </small>
                  </div>
                </div>
                <dl className="details-list client-card-details">
                  <div>
                    <dt>Telefone</dt>
                    <dd>{cliente.telefone || 'Não informado'}</dd>
                  </div>
                  <div>
                    <dt>E-mail</dt>
                    <dd>{cliente.email || 'Não informado'}</dd>
                  </div>
                  <div>
                    <dt>Último atendimento</dt>
                    <dd>{formatarData(cliente.ultimoAtendimento)}</dd>
                  </div>
                </dl>
              </button>
            ))}
          </div>
        </article>

        <aside className="dashboard-panel client-history-panel">
          <div className="panel-heading">
            <div>
              <h2>Histórico resumido</h2>
              <p className="panel-text">
                Clique em um cliente para ver seus últimos agendamentos.
              </p>
            </div>
          </div>

          {!clienteAtivo && (
            <div className="dashboard-empty">
              <span className="empty-icon" aria-hidden="true">
                <CalendarDays size={24} strokeWidth={2} />
              </span>
              <div>
                <strong>Nenhum cliente selecionado</strong>
                <p>Selecione um cliente na lista para consultar o histórico.</p>
              </div>
            </div>
          )}

          {clienteAtivo && (
            <div className="client-history">
              <div className="client-history-header">
                <span className="client-avatar" aria-hidden="true">
                  {clienteAtivo.nome.charAt(0).toUpperCase()}
                </span>
                <div>
                  <strong>{clienteAtivo.nome}</strong>
                  <small>
                    {clienteAtivo.totalAgendamentos} agendamento
                    {clienteAtivo.totalAgendamentos === 1 ? '' : 's'} no total
                  </small>
                </div>
              </div>

              <div className="history-list">
                {clienteAtivo.agendamentos.map((agendamento) => (
                  <article className="history-item" key={agendamento.id}>
                    <div>
                      <strong>{formatarData(agendamento.data_hora_inicio)}</strong>
                      <span>{agendamento.servico_nome || 'Serviço não informado'}</span>
                    </div>
                    <div>
                      <span>
                        {agendamento.profissional_nome ||
                          'Profissional não informado'}
                      </span>
                      <em className={`status-badge status-${agendamento.status}`}>
                        {STATUS_LABELS[agendamento.status] || agendamento.status}
                      </em>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </aside>
      </section>
    </DashboardShell>
  );
}

export default Clientes;
