import { CalendarCheck, CalendarX } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  buscarAgendamentoPublico,
  cancelarAgendamentoPublico,
  confirmarPresencaPublica,
} from '../services/publicoService';

const STATUS_LABELS = {
  cancelado: 'Cancelado',
  concluido: 'Concluído',
  confirmado: 'Confirmado',
  pendente: 'Pendente',
};

function formatarDataHora(valor) {
  const texto = String(valor || '');
  const [data, horario] = texto.split('T');
  const [ano, mes, dia] = String(data || '').split('-');

  if (!ano || !mes || !dia || !horario) {
    return 'Data não informada';
  }

  return `${dia}/${mes}/${ano} às ${horario.slice(0, 5)}`;
}

function GerenciarAgendamento({ token }) {
  const [agendamento, setAgendamento] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [cancelando, setCancelando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    let ativo = true;

    async function carregarAgendamento() {
      try {
        const resposta = await buscarAgendamentoPublico(token);

        if (ativo) {
          setAgendamento(resposta.agendamento);
        }
      } catch (err) {
        if (ativo) {
          setErro(err.message);
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarAgendamento();

    return () => {
      ativo = false;
    };
  }, [token]);

  async function cancelar() {
    if (!window.confirm('Deseja realmente cancelar este agendamento?')) {
      return;
    }

    setCancelando(true);
    setErro('');
    setSucesso('');

    try {
      const resposta = await cancelarAgendamentoPublico(token);
      setAgendamento(resposta.agendamento);
      setSucesso(resposta.mensagem || 'Agendamento cancelado com sucesso.');
    } catch (err) {
      setErro(err.message);
    } finally {
      setCancelando(false);
    }
  }

  async function confirmarPresenca() {
    if (!window.confirm('Deseja confirmar sua presença neste agendamento?')) {
      return;
    }

    setConfirmando(true);
    setErro('');
    setSucesso('');

    try {
      const resposta = await confirmarPresencaPublica(token);
      setAgendamento(resposta.agendamento);
      setSucesso(resposta.mensagem || 'Presença confirmada com sucesso.');
    } catch (err) {
      setErro(err.message);
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <main className="page public-booking-page">
      <section className="public-booking-card">
        <header className="public-booking-header">
          <p className="eyebrow">Agendai</p>
          <h1>Gerenciar agendamento</h1>
          <p>Consulte os dados e cancele seu horário quando necessário.</p>
        </header>

        <div className="public-booking-content">
          {carregando && (
            <p className="message message-info" aria-live="polite">
              Carregando agendamento...
            </p>
          )}

          {erro && <p className="message message-error">{erro}</p>}
          {sucesso && <p className="message message-success">{sucesso}</p>}

          {!carregando && !agendamento && (
            <div className="dashboard-empty">
              <span className="empty-icon" aria-hidden="true">
                <CalendarX size={24} strokeWidth={2} />
              </span>
              <div>
                <strong>Agendamento não encontrado</strong>
                <p>Confira se o link está completo e tente novamente.</p>
              </div>
            </div>
          )}

          {agendamento && (
            <section className="booking-section confirmation-card">
              <span className="confirmation-icon" aria-hidden="true">
                <CalendarCheck size={24} strokeWidth={2} />
              </span>
              <div>
                <p className="step-label">{agendamento.negocio_nome}</p>
                <h2>Dados do agendamento</h2>
              </div>

              <dl className="details-list booking-summary">
                <div>
                  <dt>Cliente</dt>
                  <dd>{agendamento.cliente_nome}</dd>
                </div>
                <div>
                  <dt>Serviço</dt>
                  <dd>{agendamento.servico_nome}</dd>
                </div>
                <div>
                  <dt>Profissional</dt>
                  <dd>{agendamento.profissional_nome}</dd>
                </div>
                <div>
                  <dt>Data e horário</dt>
                  <dd>{formatarDataHora(agendamento.data_hora_inicio)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span
                      className={`status-badge status-${agendamento.status}`}
                    >
                      {STATUS_LABELS[agendamento.status] || agendamento.status}
                    </span>
                  </dd>
                </div>
                {agendamento.observacoes && (
                  <div>
                    <dt>Observações</dt>
                    <dd>{agendamento.observacoes}</dd>
                  </div>
                )}
              </dl>

              <div className="button-row">
                {agendamento.status !== 'cancelado' && (
                  <button
                    className="button button-primary"
                    disabled={confirmando || cancelando}
                    onClick={confirmarPresenca}
                    type="button"
                  >
                    {confirmando ? 'Confirmando...' : 'Confirmar presença'}
                  </button>
                )}

                <button
                  className="button button-danger"
                  disabled={
                    cancelando ||
                    confirmando ||
                    agendamento.status === 'cancelado'
                  }
                  onClick={cancelar}
                  type="button"
                >
                  {agendamento.status === 'cancelado'
                    ? 'Agendamento cancelado'
                    : cancelando
                      ? 'Cancelando...'
                      : 'Cancelar agendamento'}
                </button>
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

export default GerenciarAgendamento;
