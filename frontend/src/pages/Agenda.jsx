import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarCheck2,
  CalendarDays,
  CalendarX,
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  Scissors,
  Search,
  User,
} from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import PageHeader from '../components/ui/PageHeader';
import PanelSkeleton from '../components/ui/PanelSkeleton';
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

function filtrarAgendamentos(agendamentos, filtro, busca) {
  const termo = normalizarMensagem(busca).trim();
  let resultado = agendamentos;

  if (filtro === 'hoje') {
    const hoje = new Date();

    resultado = agendamentos.filter((agendamento) => {
      const data = obterData(agendamento.data_hora_inicio);
      return data && mesmaData(data, hoje);
    });
  } else if (filtro !== 'todos') {
    resultado = agendamentos.filter(
      (agendamento) => agendamento.status === filtro,
    );
  }

  if (!termo) {
    return resultado;
  }

  return resultado.filter((agendamento) =>
    normalizarMensagem(
      `${agendamento.cliente_nome} ${agendamento.cliente_telefone} ${agendamento.cliente_email} ${agendamento.servico_nome} ${agendamento.profissional_nome}`,
    ).includes(termo),
  );
}

function formatarDataExtensa(data) {
  if (!data) return '';

  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function calcularDuracao(inicio, fim) {
  const dataInicio = obterData(inicio);
  const dataFim = obterData(fim);

  if (!dataInicio || !dataFim) return '';

  const minutos = Math.max(0, Math.round((dataFim - dataInicio) / 60000));
  return `${minutos} min`;
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
  const montadoRef = useRef(false);
  const [agendamentos, setAgendamentos] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const erroNormalizado = normalizarMensagem(erro);
  const precisaCadastrarNegocio =
    erroNormalizado.includes('cadastre um negocio') ||
    erroNormalizado.includes('cadastre um neg');

  const agendamentosFiltrados = useMemo(
    () => filtrarAgendamentos(agendamentos, filtro, busca),
    [agendamentos, busca, filtro],
  );

  const resumoAgenda = useMemo(() => {
    const hoje = new Date();

    return {
      hoje: agendamentos.filter((agendamento) => {
        const data = obterData(agendamento.data_hora_inicio);
        return data && mesmaData(data, hoje);
      }).length,
      confirmados: agendamentos.filter((item) => item.status === 'confirmado').length,
      pendentes: agendamentos.filter((item) => item.status === 'pendente').length,
      concluidos: agendamentos.filter((item) => item.status === 'concluido').length,
    };
  }, [agendamentos]);

  const gruposAgenda = useMemo(
    () => agruparPorData(agendamentosFiltrados),
    [agendamentosFiltrados],
  );

  const carregarAgendamentos = useCallback(async (silencioso = false) => {
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
    carregarAgendamentos();

    function handleFocus() {
      carregarAgendamentos(true);
    }

    window.addEventListener('focus', handleFocus);

    return () => {
      montadoRef.current = false;
      window.removeEventListener('focus', handleFocus);
    };
  }, [carregarAgendamentos]);

  async function alterarStatus(agendamento, status) {
    setErro('');
    setSucesso('');
    setSalvandoId(agendamento.id);

    try {
      await atualizarStatusAgendamento(agendamento.id, status);
      setSucesso(`Status alterado para ${STATUS_LABELS[status] || status}.`);
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
      await cancelarAgendamento(agendamento.id);
      setSucesso(
        `Agendamento de ${agendamento.cliente_nome} cancelado com sucesso.`,
      );
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
      <PageHeader
        title="Agenda"
        description="Gerencie os atendimentos e mantenha o dia do seu negócio fluindo."
        meta={
          <span className="dashboard-date-chip">
            <CalendarDays aria-hidden="true" size={17} />
            {formatarDataExtensa(new Date())}
          </span>
        }
      />

      <section className="agenda-overview-grid" aria-label="Resumo da agenda">
        {[
          { label: 'Agendamentos hoje', valor: resumoAgenda.hoje, Icon: CalendarDays, tone: 'blue' },
          { label: 'Confirmados', valor: resumoAgenda.confirmados, Icon: CalendarCheck2, tone: 'green' },
          { label: 'Pendentes', valor: resumoAgenda.pendentes, Icon: Clock3, tone: 'yellow' },
          { label: 'Concluídos', valor: resumoAgenda.concluidos, Icon: CheckCircle2, tone: 'violet' },
        ].map(({ label, valor, Icon, tone }) => (
          <article className="agenda-overview-item" key={label}>
            <span className={`agenda-overview-icon tone-${tone}`} aria-hidden="true">
              <Icon size={20} strokeWidth={2} />
            </span>
            <div>
              <small>{label}</small>
              <strong>{carregando ? '—' : valor}</strong>
            </div>
          </article>
        ))}
      </section>

      <section
        className="dashboard-panel agenda-panel"
        aria-labelledby="agenda-title"
      >
        <div className="agenda-toolbar">
          <div className="agenda-filter-row" aria-label="Filtro de agendamentos">
            {FILTROS.map((item) => (
              <button
                aria-pressed={filtro === item.valor}
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
          <label className="agenda-search-field">
            <Search aria-hidden="true" size={17} />
            <span className="sr-only">Buscar agendamento</span>
            <input
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar cliente, serviço ou telefone"
              type="search"
              value={busca}
            />
          </label>
        </div>

        {carregando && (
          <div aria-live="polite"><PanelSkeleton lines={4} /></div>
        )}

        {!carregando && erro && <p className="message message-error" role="alert">{erro}</p>}
        {!carregando && sucesso && (
          <p className="message message-success" role="status">{sucesso}</p>
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
                <strong>
                  {busca
                    ? 'Nenhum agendamento corresponde à busca'
                    : filtro === 'todos'
                    ? 'Sua agenda ainda está vazia'
                    : 'Nenhum agendamento neste filtro'}
                </strong>
                <p>
                  {busca
                    ? 'Revise o nome, telefone, serviço ou profissional informado.'
                    : filtro === 'todos'
                    ? 'Quando um cliente usar seu link público, o atendimento aparecerá aqui.'
                    : 'Tente outro filtro para consultar os demais atendimentos.'}
                </p>
                {(filtro !== 'todos' || busca) && (
                  <button
                    className="button button-secondary button-small"
                    onClick={() => {
                      setFiltro('todos');
                      setBusca('');
                    }}
                    type="button"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            </div>
          )}

        <div className="agenda-date-groups">
          {gruposAgenda.map((grupo) => (
            <section className="agenda-date-group" key={grupo.chave}>
              <div className="agenda-date-heading">
                <div>
                  <h3>{grupo.label}</h3>
                  <p>{formatarDataExtensa(grupo.data)}</p>
                </div>
                <span>{grupo.itens.length} atendimento{grupo.itens.length === 1 ? '' : 's'}</span>
              </div>

              <div className="agenda-card-list">
                {grupo.itens.map((agendamento) => (
                  <article className="agenda-card-pro" key={agendamento.id}>
                    <div className="agenda-card-time">
                      <strong>{formatarHorario(agendamento.data_hora_inicio)}</strong>
                      <span>{calcularDuracao(agendamento.data_hora_inicio, agendamento.data_hora_fim)}</span>
                    </div>

                    <div className="agenda-client-cell">
                      <span className="agenda-client-avatar" aria-hidden="true">
                        {String(agendamento.cliente_nome || '').trim().charAt(0).toLocaleUpperCase('pt-BR') || 'C'}
                      </span>
                      <div>
                        <strong>{agendamento.cliente_nome}</strong>
                        <span><Phone aria-hidden="true" size={14} />{agendamento.cliente_telefone}</span>
                        {agendamento.cliente_email && (
                          <span><Mail aria-hidden="true" size={14} />{agendamento.cliente_email}</span>
                        )}
                      </div>
                    </div>

                    <div className="agenda-service-cell">
                      <strong><Scissors aria-hidden="true" size={15} />{agendamento.servico_nome}</strong>
                      <span><User aria-hidden="true" size={15} />{agendamento.profissional_nome}</span>
                    </div>

                    <span className={`status-badge status-${agendamento.status}`}>
                      {STATUS_LABELS[agendamento.status] || agendamento.status}
                    </span>

                    <div className="agenda-actions">
                      <label>
                        <span className="sr-only">Alterar status de {agendamento.cliente_nome}</span>
                        <select
                          disabled={salvandoId === agendamento.id}
                          onChange={(event) => alterarStatus(agendamento, event.target.value)}
                          value={agendamento.status}
                        >
                          {STATUS.map((status) => (
                            <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                          ))}
                        </select>
                      </label>

                      {agendamento.status !== 'cancelado' && (
                        <button
                          className="agenda-cancel-button"
                          disabled={salvandoId === agendamento.id}
                          onClick={() => cancelar(agendamento)}
                          type="button"
                        >
                          {salvandoId === agendamento.id ? 'Salvando...' : 'Cancelar'}
                        </button>
                      )}
                    </div>

                    {agendamento.observacoes && (
                      <p className="agenda-observations">
                        <strong>Observações:</strong> {agendamento.observacoes}
                      </p>
                    )}
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
