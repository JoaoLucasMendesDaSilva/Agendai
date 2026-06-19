import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CalendarDays,
  CalendarX,
  Mail,
  Phone,
  Scissors,
  User,
} from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import { useAuth } from '../contexts/AuthContext';
import {
  atualizarStatusAgendamento,
  cancelarAgendamento,
  listarAgendamentos,
} from '../services/agendamentosService';

const STATUS = ['pendente', 'confirmado', 'cancelado', 'concluido'];
const STATUS_LABELS = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
  concluido: 'Concluído',
};

const FILTROS = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'hoje', label: 'Hoje' },
  { valor: 'pendente', label: 'Pendentes' },
  { valor: 'confirmado', label: 'Confirmados' },
  { valor: 'cancelado', label: 'Cancelados' },
];

function obterData(valor) {
  const data = new Date(String(valor || '').replace(' ', 'T'));
  return Number.isNaN(data.getTime()) ? null : data;
}

function formatarHorario(valor) {
  const data = obterData(valor);

  if (!data) {
    return '--:--';
  }

  return data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatarData(valor) {
  const data = valor instanceof Date ? valor : obterData(valor);

  if (!data) {
    return 'Data não informada';
  }

  return data.toLocaleDateString('pt-BR');
}

function obterInicioDoDia(data) {
  const inicio = new Date(data);
  inicio.setHours(0, 0, 0, 0);
  return inicio;
}

function mesmaData(dataA, dataB) {
  return obterInicioDoDia(dataA).getTime() === obterInicioDoDia(dataB).getTime();
}

function criarLabelData(data) {
  if (!data) {
    return 'Data não informada';
  }

  const hoje = obterInicioDoDia(new Date());
  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);

  if (mesmaData(data, hoje)) {
    return 'Hoje';
  }

  if (mesmaData(data, amanha)) {
    return 'Amanhã';
  }

  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function normalizarMensagem(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function filtrarAgendamentos(agendamentos, filtro) {
  if (filtro === 'todos') {
    return agendamentos;
  }

  if (filtro === 'hoje') {
    const hoje = new Date();

    return agendamentos.filter((agendamento) => {
      const data = obterData(agendamento.data_hora_inicio);
      return data && mesmaData(data, hoje);
    });
  }

  return agendamentos.filter((agendamento) => agendamento.status === filtro);
}

function agruparPorData(agendamentos) {
  const grupos = new Map();

  agendamentos
    .map((agendamento) => ({
      ...agendamento,
      dataInicio: obterData(agendamento.data_hora_inicio),
    }))
    .sort((a, b) => {
      const dataA = a.dataInicio?.getTime() || 0;
      const dataB = b.dataInicio?.getTime() || 0;
      return dataA - dataB;
    })
    .forEach((agendamento) => {
      const chave = agendamento.dataInicio
        ? obterInicioDoDia(agendamento.dataInicio).toISOString()
        : 'sem-data';

      if (!grupos.has(chave)) {
        grupos.set(chave, {
          chave,
          label: criarLabelData(agendamento.dataInicio),
          data: agendamento.dataInicio,
          itens: [],
        });
      }

      grupos.get(chave).itens.push(agendamento);
    });

  return Array.from(grupos.values());
}

function Agenda({ navigate }) {
  const { logout, usuario } = useAuth();
  const [agendamentos, setAgendamentos] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const erroNormalizado = normalizarMensagem(erro);
  const precisaCadastrarNegocio =
    erroNormalizado.includes('cadastre um negocio') ||
    erroNormalizado.includes('cadastre um neg');

  const agendamentosFiltrados = useMemo(
    () => filtrarAgendamentos(agendamentos, filtro),
    [agendamentos, filtro],
  );

  const gruposAgenda = useMemo(
    () => agruparPorData(agendamentosFiltrados),
    [agendamentosFiltrados],
  );

  async function carregarAgendamentos() {
    setCarregando(true);
    setErro('');

    try {
      const resposta = await listarAgendamentos();
      setAgendamentos(resposta.agendamentos || []);
    } catch (err) {
      setErro(err.message);
      setAgendamentos([]);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarAgendamentos();
  }, []);

  async function alterarStatus(agendamento, status) {
    setErro('');
    setSucesso('');
    setSalvandoId(agendamento.id);

    try {
      const resposta = await atualizarStatusAgendamento(agendamento.id, status);
      setSucesso(resposta.mensagem || 'Status atualizado com sucesso.');
      await carregarAgendamentos();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvandoId(null);
    }
  }

  async function cancelar(agendamento) {
    const confirmado = window.confirm(
      `Deseja cancelar o agendamento de ${agendamento.cliente_nome}?`,
    );

    if (!confirmado) {
      return;
    }

    setErro('');
    setSucesso('');
    setSalvandoId(agendamento.id);

    try {
      const resposta = await cancelarAgendamento(agendamento.id);
      setSucesso(resposta.mensagem || 'Agendamento cancelado com sucesso.');
      await carregarAgendamentos();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvandoId(null);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <DashboardShell
      currentPath="/agenda"
      navigate={navigate}
      onLogout={handleLogout}
      usuario={usuario}
    >
      <header className="page-title">
        <div>
          <p className="eyebrow">Painel do empreendedor</p>
          <h1>Agenda</h1>
          <p className="panel-text">
            Acompanhe os horários do seu negócio em uma agenda profissional de
            atendimentos.
          </p>
        </div>
      </header>

      <section
        className="dashboard-panel agenda-panel"
        aria-labelledby="agenda-title"
      >
        <div className="panel-heading">
          <div>
            <h2 id="agenda-title">Agendamentos</h2>
            <p className="panel-text">
              Filtre por período ou status para organizar a rotina do dia.
            </p>
          </div>
        </div>

        <div className="agenda-filter-row" aria-label="Filtro de agendamentos">
          {FILTROS.map((item) => (
            <button
              className={`agenda-filter-button ${
                filtro === item.valor ? 'is-active' : ''
              }`}
              key={item.valor}
              onClick={() => setFiltro(item.valor)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        {carregando && (
          <p className="message message-info" aria-live="polite">
            Carregando agendamentos...
          </p>
        )}

        {!carregando && erro && <p className="message message-error">{erro}</p>}
        {!carregando && sucesso && (
          <p className="message message-success">{sucesso}</p>
        )}

        {!carregando && precisaCadastrarNegocio && (
          <div className="dashboard-empty agenda-empty-state">
            <span className="empty-icon" aria-hidden="true">
              <CalendarDays size={24} strokeWidth={2} />
            </span>
            <div>
              <strong>Cadastre o negócio primeiro</strong>
              <p>Depois disso, você poderá consultar os agendamentos.</p>
              <button
                className="button button-primary button-small"
                onClick={() => navigate('/negocio')}
                type="button"
              >
                Cadastrar negócio
              </button>
            </div>
          </div>
        )}

        {!carregando &&
          !precisaCadastrarNegocio &&
          agendamentosFiltrados.length === 0 && (
            <div className="dashboard-empty agenda-empty-state">
              <span className="empty-icon" aria-hidden="true">
                <CalendarX size={24} strokeWidth={2} />
              </span>
              <div>
                <strong>Nenhum agendamento encontrado</strong>
                <p>
                  Quando seus clientes agendarem pelo link público, eles
                  aparecerão aqui.
                </p>
              </div>
            </div>
          )}

        <div className="agenda-date-groups">
          {gruposAgenda.map((grupo) => (
            <section className="agenda-date-group" key={grupo.chave}>
              <div className="agenda-date-heading">
                <span aria-hidden="true">
                  <CalendarClock size={18} strokeWidth={2} />
                </span>
                <div>
                  <h3>{grupo.label}</h3>
                  <p>
                    {grupo.itens.length} atendimento
                    {grupo.itens.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              <div className="agenda-card-list">
                {grupo.itens.map((agendamento) => (
                  <article className="agenda-card-pro" key={agendamento.id}>
                    <div className="agenda-card-time">
                      <strong>{formatarHorario(agendamento.data_hora_inicio)}</strong>
                      <span>{formatarData(agendamento.data_hora_inicio)}</span>
                    </div>

                    <div className="agenda-card-content">
                      <div className="agenda-card-header">
                        <div>
                          <h4>{agendamento.cliente_nome}</h4>
                          <p>{agendamento.servico_nome}</p>
                        </div>
                        <span className={`status-badge status-${agendamento.status}`}>
                          {STATUS_LABELS[agendamento.status] || agendamento.status}
                        </span>
                      </div>

                      <div className="agenda-info-grid">
                        <span>
                          <User aria-hidden="true" size={16} strokeWidth={2} />
                          {agendamento.profissional_nome}
                        </span>
                        <span>
                          <Phone aria-hidden="true" size={16} strokeWidth={2} />
                          {agendamento.cliente_telefone}
                        </span>
                        {agendamento.cliente_email && (
                          <span>
                            <Mail aria-hidden="true" size={16} strokeWidth={2} />
                            {agendamento.cliente_email}
                          </span>
                        )}
                        <span>
                          <Scissors aria-hidden="true" size={16} strokeWidth={2} />
                          {agendamento.servico_nome}
                        </span>
                      </div>

                      {agendamento.observacoes && (
                        <p className="agenda-observations">
                          <strong>Observações:</strong> {agendamento.observacoes}
                        </p>
                      )}

                      <div className="agenda-actions">
                        <label>
                          Status
                          <select
                            disabled={salvandoId === agendamento.id}
                            onChange={(event) =>
                              alterarStatus(agendamento, event.target.value)
                            }
                            value={agendamento.status}
                          >
                            {STATUS.map((status) => (
                              <option key={status} value={status}>
                                {STATUS_LABELS[status]}
                              </option>
                            ))}
                          </select>
                        </label>

                        <button
                          className="button button-danger"
                          disabled={salvandoId === agendamento.id}
                          onClick={() => cancelar(agendamento)}
                          type="button"
                        >
                          {salvandoId === agendamento.id ? 'Salvando...' : 'Cancelar'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}

export default Agenda;
