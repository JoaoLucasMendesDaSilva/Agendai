import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  ChevronRight,
  Mail,
  Phone,
  Search,
  UserCheck,
  Users,
} from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { listarAgendamentos } from '../services/agendamentosService';
import { listarServicos } from '../services/servicosService';
import { agruparClientes, normalizarTexto, obterData } from './clientesUtils';

const STATUS_LABELS = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
  concluido: 'Concluído',
};

function formatarData(valor) {
  const data = valor instanceof Date ? valor : obterData(valor);

  if (!data) {
    return 'Data não informada';
  }

  return data.toLocaleDateString('pt-BR');
}

function formatarHorario(valor) {
  const data = valor instanceof Date ? valor : obterData(valor);

  if (!data) {
    return 'Horário não informado';
  }

  return data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    currency: 'BRL',
    style: 'currency',
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

function calcularPerfilCliente(cliente, servicos, precosDisponiveis) {
  if (!cliente) {
    return null;
  }

  const contagemServicos = new Map();
  const precosPorServico = new Map(
    servicos.map((servico) => [Number(servico.id), Number(servico.preco)]),
  );
  let cancelamentos = 0;
  let valorEstimado = 0;
  let agendamentosSemPreco = 0;

  cliente.agendamentos.forEach((agendamento) => {
    const nomeServico = agendamento.servico_nome || 'Serviço não informado';
    contagemServicos.set(
      nomeServico,
      (contagemServicos.get(nomeServico) || 0) + 1,
    );

    if (agendamento.status === 'cancelado') {
      cancelamentos += 1;
      return;
    }

    const preco = precosPorServico.get(Number(agendamento.servico_id));

    if (Number.isFinite(preco)) {
      valorEstimado += preco;
    } else {
      agendamentosSemPreco += 1;
    }
  });

  return {
    cancelamentos,
    servicosMaisUsados: Array.from(contagemServicos.entries())
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome))
      .slice(0, 3),
    valorEstimado,
    valorEstimadoDisponivel: precosDisponiveis,
    valorEstimadoParcial: precosDisponiveis && agendamentosSemPreco > 0,
  };
}

function Clientes({ navigate }) {
  const { logout, usuario } = useAuth();
  const montadoRef = useRef(false);
  const [agendamentos, setAgendamentos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [precosDisponiveis, setPrecosDisponiveis] = useState(false);
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
        const [resultadoAgendamentos, resultadoServicos] =
          await Promise.allSettled([listarAgendamentos(), listarServicos()]);

        if (montadoRef.current) {
          if (resultadoAgendamentos.status === 'fulfilled') {
            setAgendamentos(resultadoAgendamentos.value.agendamentos || []);
          } else {
            throw resultadoAgendamentos.reason;
          }

          if (resultadoServicos.status === 'fulfilled') {
            setServicos(resultadoServicos.value.servicos || []);
            setPrecosDisponiveis(true);
          } else if (!silencioso) {
            setServicos([]);
            setPrecosDisponiveis(false);
          }
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
    clientes.find((cliente) => cliente.chave === clienteSelecionado) || null;
  const perfilCliente = useMemo(
    () => calcularPerfilCliente(clienteAtivo, servicos, precosDisponiveis),
    [clienteAtivo, precosDisponiveis, servicos],
  );

  useEffect(() => {
    if (clientes.length === 0) {
      setClienteSelecionado(null);
      return;
    }

    const selecaoAindaExiste = clientes.some(
      (cliente) => cliente.chave === clienteSelecionado,
    );

    if (!selecaoAindaExiste) {
      setClienteSelecionado(clientes[0].chave);
    }
  }, [clienteSelecionado, clientes]);

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
      <PageHeader
        title="Clientes"
        description="Conheça quem volta, acompanhe preferências e consulte o histórico de atendimentos."
        actions={
          <button className="button button-primary button-small" onClick={() => navigate('/agenda')} type="button">
            <CalendarDays aria-hidden="true" size={17} /> Abrir agenda
          </button>
        }
      />

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
        <article className="dashboard-panel clients-main-panel" aria-labelledby="clientes-title">
          <div className="clients-toolbar">
            <div>
              <h2 id="clientes-title">Lista de clientes</h2>
              <p className="panel-text">{clientesFiltrados.length} cliente{clientesFiltrados.length === 1 ? '' : 's'} encontrado{clientesFiltrados.length === 1 ? '' : 's'}</p>
            </div>
            <label className="search-field">
              <Search aria-hidden="true" size={18} strokeWidth={2} />
              <span className="sr-only">Buscar cliente</span>
              <input
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por nome, telefone ou e-mail"
                type="search"
                value={busca}
              />
            </label>
          </div>

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
                <strong>
                  {busca
                    ? 'Nenhum cliente corresponde à busca'
                    : 'Sua lista de clientes ainda está vazia'}
                </strong>
                <p>
                  {busca
                    ? 'Revise o nome, telefone ou e-mail informado.'
                    : 'Os clientes aparecerão aqui após o primeiro agendamento.'}
                </p>
                {busca && (
                  <button
                    className="button button-secondary button-small"
                    onClick={() => setBusca('')}
                    type="button"
                  >
                    Limpar busca
                  </button>
                )}
              </div>
            </div>
          )}

          {clientesFiltrados.length > 0 && (
            <div className="client-table-head" aria-hidden="true">
              <span>Cliente</span>
              <span>Contato</span>
              <span>Agendamentos</span>
              <span>Último atendimento</span>
              <span />
            </div>
          )}

          <div className="entity-list clients-list" role="list">
            {clientesFiltrados.map((cliente) => (
              <button
                className={`client-card ${
                  clienteAtivo?.chave === cliente.chave ? 'is-selected' : ''
                }`}
                key={cliente.chave}
                onClick={() => setClienteSelecionado(cliente.chave)}
                role="listitem"
                type="button"
              >
                <div className="client-card-header">
                  <span className="client-avatar" aria-hidden="true">
                    {cliente.nome.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <strong>{cliente.nome}</strong>
                    {cliente.totalAgendamentos > 1 && <small className="client-recurrent-badge">Recorrente</small>}
                  </div>
                </div>
                <span className="client-card-contact">
                  <small>{cliente.telefone || 'Telefone não informado'}</small>
                  <small>{cliente.email || 'E-mail não informado'}</small>
                </span>
                <strong className="client-card-total">{cliente.totalAgendamentos}</strong>
                <span className="client-card-last">{formatarData(cliente.ultimoAtendimento)}</span>
                <ChevronRight className="client-card-arrow" aria-hidden="true" size={18} />
              </button>
            ))}
          </div>
        </article>

        <aside className="dashboard-panel client-history-panel">
          <div className="panel-heading">
            <div>
              <h2>Perfil do cliente</h2>
              <p className="panel-text">
                Dados, preferências e histórico de atendimento.
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
                  {clienteAtivo.totalAgendamentos > 1 && <small className="client-recurrent-badge">Cliente recorrente</small>}
                </div>
              </div>

              <dl className="details-list client-profile-contact">
                <div>
                  <dt><Phone aria-hidden="true" size={15} /> Telefone</dt>
                  <dd>{clienteAtivo.telefone || 'Não informado'}</dd>
                </div>
                <div>
                  <dt><Mail aria-hidden="true" size={15} /> E-mail</dt>
                  <dd>{clienteAtivo.email || 'Não informado'}</dd>
                </div>
              </dl>

              <button className="button button-primary client-agenda-button" onClick={() => navigate('/agenda')} type="button">
                <CalendarDays aria-hidden="true" size={17} /> Consultar agenda
              </button>

              <div className="client-profile-metrics">
                <div className="client-profile-metric">
                  <span>Total de agendamentos</span>
                  <strong>{clienteAtivo.totalAgendamentos}</strong>
                </div>
                <div className="client-profile-metric">
                  <span>Último atendimento</span>
                  <strong>{formatarData(clienteAtivo.ultimoAtendimento)}</strong>
                </div>
                <div className="client-profile-metric">
                  <span>Cancelamentos</span>
                  <strong>{perfilCliente.cancelamentos}</strong>
                </div>
                <div className="client-profile-metric">
                  <span>Valor total estimado</span>
                  <strong>
                    {perfilCliente.valorEstimadoDisponivel
                      ? formatarMoeda(perfilCliente.valorEstimado)
                      : 'Indisponível'}
                  </strong>
                  {perfilCliente.valorEstimadoParcial && (
                    <small>Estimativa parcial com preços atuais</small>
                  )}
                </div>
              </div>

              <section className="client-top-services" aria-labelledby="top-services-title">
                <h3 id="top-services-title">Serviços mais usados</h3>
                <div>
                  {perfilCliente.servicosMaisUsados.length > 0 ? (
                    perfilCliente.servicosMaisUsados.map((servico) => (
                      <span key={servico.nome}>
                        {servico.nome} <strong>{servico.total}x</strong>
                      </span>
                    ))
                  ) : (
                    <p className="panel-text">Ainda não há serviços registrados.</p>
                  )}
                </div>
              </section>

              <div className="client-history-heading">
                <h3>Histórico completo</h3>
                <span>{clienteAtivo.totalAgendamentos} registro(s)</span>
              </div>

              <div className="history-list">
                {clienteAtivo.agendamentos.map((agendamento) => (
                  <article className="history-item" key={agendamento.id}>
                    <div className="history-item-date">
                      <strong>{formatarData(agendamento.data_hora_inicio)}</strong>
                      <span>{formatarHorario(agendamento.data_hora_inicio)}</span>
                    </div>
                    <div className="history-item-service">
                      <strong>
                        {agendamento.servico_nome || 'Serviço não informado'}
                      </strong>
                      <span>
                        {agendamento.profissional_nome ||
                          'Profissional não informado'}
                      </span>
                      <em className={`status-badge status-${agendamento.status}`}>
                        {STATUS_LABELS[agendamento.status] || agendamento.status}
                      </em>
                    </div>
                    {agendamento.observacoes && (
                      <p className="history-observations">
                        <strong>Observações:</strong> {agendamento.observacoes}
                      </p>
                    )}
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
