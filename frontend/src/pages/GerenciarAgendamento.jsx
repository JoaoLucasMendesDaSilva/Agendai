import {
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import BrandLogo from '../components/BrandLogo';
import {
  buscarAgendamentoPublico,
  cancelarAgendamentoPublico,
  confirmarPresencaPublica,
  listarHorariosReagendamento,
  reagendarAgendamentoPublico,
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

function hojeIso() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}

function formatarHorario(valor) {
  return String(valor || '').slice(11, 16);
}

function GerenciarAgendamento({ token }) {
  const [agendamento, setAgendamento] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [cancelando, setCancelando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [exibindoReagendamento, setExibindoReagendamento] = useState(false);
  const [novaData, setNovaData] = useState('');
  const [horarios, setHorarios] = useState([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [salvandoReagendamento, setSalvandoReagendamento] = useState(false);
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
      setExibindoReagendamento(false);
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

  async function selecionarNovaData(valor) {
    setNovaData(valor);
    setHorarios([]);
    setErro('');
    setSucesso('');

    if (!valor) {
      return;
    }

    setCarregandoHorarios(true);

    try {
      const resposta = await listarHorariosReagendamento(token, valor);
      setHorarios(resposta.horarios || []);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregandoHorarios(false);
    }
  }

  function alternarReagendamento() {
    setExibindoReagendamento((valorAtual) => !valorAtual);
    setNovaData('');
    setHorarios([]);
    setErro('');
    setSucesso('');
  }

  async function reagendar(horario) {
    if (
      !window.confirm(
        `Deseja reagendar para ${formatarDataHora(
          horario.data_hora_inicio
        )}?`
      )
    ) {
      return;
    }

    setSalvandoReagendamento(true);
    setErro('');
    setSucesso('');

    try {
      const resposta = await reagendarAgendamentoPublico(
        token,
        horario.data_hora_inicio
      );
      setAgendamento(resposta.agendamento);
      setSucesso(
        `Agendamento reagendado para ${formatarDataHora(
          horario.data_hora_inicio
        )}.`
      );
      setExibindoReagendamento(false);
      setNovaData('');
      setHorarios([]);
    } catch (err) {
      setErro(
        err.message.includes('indisponível')
          ? 'Este horário ficou indisponível. Escolha outro horário.'
          : err.message
      );
    } finally {
      setSalvandoReagendamento(false);
    }
  }

  return (
    <main className="page public-booking-page manage-booking-page">
      <section className="public-booking-card manage-booking-card">
        <div className="public-booking-topbar">
          <BrandLogo />
          <span><ShieldCheck aria-hidden="true" size={15} /> Link protegido</span>
        </div>
        <header className="public-booking-header">
          <h1>Gerenciar agendamento</h1>
          <p>Consulte, confirme, reagende ou cancele seu horário.</p>
        </header>

        <div className="public-booking-content manage-booking-content">
          {carregando && (
            <p className="message message-info" aria-live="polite">
              Carregando agendamento...
            </p>
          )}

          {erro && agendamento && (
            <p className="message message-error">{erro}</p>
          )}
          {sucesso && <p className="message message-success">{sucesso}</p>}

          {!carregando && !agendamento && (
            <div className="dashboard-empty">
              <span className="empty-icon" aria-hidden="true">
                <CalendarX size={24} strokeWidth={2} />
              </span>
              <div>
                <strong>Não foi possível abrir este agendamento</strong>
                <p>
                  O link pode estar incorreto, incompleto ou ter expirado.
                  Solicite um novo endereço ao negócio.
                </p>
                <a className="button button-secondary button-small" href="/">
                  Voltar ao início
                </a>
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

              {exibindoReagendamento &&
                agendamento.status !== 'cancelado' && (
                  <div className="booking-review-card">
                    <div>
                      <p className="step-label">Reagendamento</p>
                      <h3>Escolha uma nova data e horário</h3>
                    </div>

                    <label>
                      Nova data
                      <input
                        min={hojeIso()}
                        onChange={(event) =>
                          selecionarNovaData(event.target.value)
                        }
                        type="date"
                        value={novaData}
                      />
                    </label>

                    {carregandoHorarios && (
                      <p className="message message-info">
                        Carregando horários...
                      </p>
                    )}

                    {!carregandoHorarios && novaData && horarios.length === 0 && (
                      <div className="dashboard-empty">
                        <span className="empty-icon" aria-hidden="true">
                          <CalendarX size={24} strokeWidth={2} />
                        </span>
                        <div>
                          <strong>Nenhum horário disponível</strong>
                          <p>Escolha outra data para consultar novos horários.</p>
                        </div>
                      </div>
                    )}

                    <div className="time-grid">
                      {horarios.map((horario) => (
                        <button
                          className="time-button"
                          disabled={salvandoReagendamento}
                          key={horario.data_hora_inicio}
                          onClick={() => reagendar(horario)}
                          type="button"
                        >
                          {formatarHorario(horario.data_hora_inicio)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              <div className="button-row">
                {agendamento.status !== 'cancelado' && (
                  <button
                    className="button button-primary"
                    disabled={
                      confirmando || cancelando || salvandoReagendamento
                    }
                    onClick={confirmarPresenca}
                    type="button"
                  >
                    <CheckCircle2 aria-hidden="true" size={17} />
                    {confirmando ? 'Confirmando...' : 'Confirmar presença'}
                  </button>
                )}

                {agendamento.status !== 'cancelado' && (
                  <button
                    className="button button-secondary"
                    disabled={
                      confirmando || cancelando || salvandoReagendamento
                    }
                    onClick={alternarReagendamento}
                    type="button"
                  >
                    <RefreshCw aria-hidden="true" size={17} />
                    {exibindoReagendamento ? 'Fechar reagendamento' : 'Reagendar'}
                  </button>
                )}

                <button
                  className="button button-danger"
                  disabled={
                    cancelando ||
                    confirmando ||
                    salvandoReagendamento ||
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
