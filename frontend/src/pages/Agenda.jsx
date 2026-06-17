import { useEffect, useState } from 'react';
import { CalendarDays, CalendarX } from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import { useAuth } from '../contexts/AuthContext';
import {
  atualizarStatusAgendamento,
  cancelarAgendamento,
  listarAgendamentos,
  listarAgendamentosHoje,
} from '../services/agendamentosService';

const STATUS = ['pendente', 'confirmado', 'cancelado', 'concluido'];
const STATUS_LABELS = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
  concluido: 'Concluído',
};

function formatarDataHora(valor) {
  const data = new Date(String(valor || '').replace(' ', 'T'));

  if (Number.isNaN(data.getTime())) {
    return valor || 'Data não informada';
  }

  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function normalizarMensagem(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
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

  async function carregarAgendamentos(filtroAtual = filtro) {
    setCarregando(true);
    setErro('');

    try {
      const resposta =
        filtroAtual === 'hoje'
          ? await listarAgendamentosHoje()
          : await listarAgendamentos();

      setAgendamentos(resposta.agendamentos || []);
    } catch (err) {
      setErro(err.message);
      setAgendamentos([]);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarAgendamentos(filtro);
  }, [filtro]);

  async function alterarStatus(agendamento, status) {
    setErro('');
    setSucesso('');
    setSalvandoId(agendamento.id);

    try {
      const resposta = await atualizarStatusAgendamento(agendamento.id, status);
      setSucesso(resposta.mensagem || 'Status atualizado com sucesso.');
      await carregarAgendamentos(filtro);
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvandoId(null);
    }
  }

  async function cancelar(agendamento) {
    const confirmado = window.confirm(
      `Deseja cancelar o agendamento de ${agendamento.cliente_nome}?`
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
      await carregarAgendamentos(filtro);
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
            Acompanhe os horários do seu negócio em uma lista simples.
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
              Use os filtros para acompanhar tudo ou focar no dia de hoje.
            </p>
          </div>
        </div>

        <div className="filter-row" aria-label="Filtro de agendamentos">
          <button
            className={`button ${
              filtro === 'todos' ? 'button-primary' : 'button-secondary'
            }`}
            onClick={() => setFiltro('todos')}
            type="button"
          >
            Todos
          </button>
          <button
            className={`button ${
              filtro === 'hoje' ? 'button-primary' : 'button-secondary'
            }`}
            onClick={() => setFiltro('hoje')}
            type="button"
          >
            Hoje
          </button>
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
          <div className="dashboard-empty">
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
          agendamentos.length === 0 && (
            <div className="dashboard-empty">
              <span className="empty-icon" aria-hidden="true">
                <CalendarX size={24} strokeWidth={2} />
              </span>
              <div>
                <strong>Nenhum agendamento encontrado</strong>
                <p>Não há horários para o filtro selecionado.</p>
              </div>
            </div>
          )}

        <div className="entity-list">
          {agendamentos.map((agendamento) => (
            <article className="entity-card agenda-card" key={agendamento.id}>
              <div className="entity-card-header">
                <div>
                  <h3>{agendamento.cliente_nome}</h3>
                  <p>{formatarDataHora(agendamento.data_hora_inicio)}</p>
                </div>
                <span className={`status-badge status-${agendamento.status}`}>
                  {STATUS_LABELS[agendamento.status] || agendamento.status}
                </span>
              </div>

              <dl className="details-list">
                <div>
                  <dt>Telefone</dt>
                  <dd>{agendamento.cliente_telefone}</dd>
                </div>
                {agendamento.cliente_email && (
                  <div>
                    <dt>E-mail</dt>
                    <dd>{agendamento.cliente_email}</dd>
                  </div>
                )}
                <div>
                  <dt>Serviço</dt>
                  <dd>{agendamento.servico_nome}</dd>
                </div>
                <div>
                  <dt>Profissional</dt>
                  <dd>{agendamento.profissional_nome}</dd>
                </div>
                {agendamento.observacoes && (
                  <div>
                    <dt>Observações</dt>
                    <dd>{agendamento.observacoes}</dd>
                  </div>
                )}
              </dl>

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
            </article>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}

export default Agenda;
