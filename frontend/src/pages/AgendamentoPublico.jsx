import { useEffect, useMemo, useState } from 'react';
import {
  CalendarX,
  CheckCircle2,
  CircleAlert,
  Clock,
  MapPin,
  Phone,
  Scissors,
  Users,
} from 'lucide-react';
import {
  buscarNegocioPublico,
  criarAgendamentoPublico,
  listarHorariosDisponiveis,
  listarProfissionaisPublicos,
  listarServicosPublicos,
} from '../services/publicoService';
import { resolverAssetUrl } from '../services/api';
import {
  ETAPA_DESCRICOES,
  ETAPAS,
  formatarCidade,
  formatarData,
  formatarDiasFuncionamento,
  formatarHorario,
  formatarPreco,
  formatarTelefoneCabecalho,
  hojeIso,
  negocioEstaAberto,
  normalizarHorario,
} from './agendamentoPublicoUtils';

const CLIENTE_INICIAL = {
  nome: '',
  telefone: '',
  email: '',
  observacoes: '',
};

function AgendamentoPublico({ slugOuId }) {
  const [negocio, setNegocio] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [servicoId, setServicoId] = useState('');
  const [profissionalId, setProfissionalId] = useState('');
  const [data, setData] = useState(hojeIso());
  const [horarioSelecionado, setHorarioSelecionado] = useState(null);
  const [cliente, setCliente] = useState(CLIENTE_INICIAL);
  const [resumoConfirmado, setResumoConfirmado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const servicoSelecionado = useMemo(
    () => servicos.find((servico) => String(servico.id) === String(servicoId)),
    [servicoId, servicos]
  );
  const profissionalSelecionado = useMemo(
    () =>
      profissionais.find(
        (profissional) => String(profissional.id) === String(profissionalId)
      ),
    [profissionalId, profissionais]
  );

  const etapaAtual = resumoConfirmado
    ? 5
    : horarioSelecionado
      ? 4
      : servicoId && profissionalId
        ? 3
        : servicoId
          ? 2
          : 1;
  const progressoEtapa = Math.max(
    0,
    ((etapaAtual - 1) / (ETAPAS.length - 1)) * 100
  );
  const statusAberto = negocioEstaAberto(negocio);
  const logoUrl = resolverAssetUrl(negocio?.logo_url);
  const bannerUrl = resolverAssetUrl(negocio?.banner_url);
  const localizacao = [
    negocio?.cidade && formatarCidade(negocio.cidade),
    negocio?.endereco,
  ]
    .filter(Boolean)
    .join(' • ');
  const horarioFuncionamento =
    negocio?.horario_abertura && negocio?.horario_fechamento
      ? `${normalizarHorario(negocio.horario_abertura)} às ${normalizarHorario(
          negocio.horario_fechamento,
        )}`
      : '';

  useEffect(() => {
    let ativo = true;

    async function carregarDadosPublicos() {
      setCarregando(true);
      setErro('');

      try {
        const [negocioResposta, servicosResposta, profissionaisResposta] =
          await Promise.all([
            buscarNegocioPublico(slugOuId),
            listarServicosPublicos(slugOuId),
            listarProfissionaisPublicos(slugOuId),
          ]);

        if (ativo) {
          setNegocio(negocioResposta.negocio);
          setServicos(servicosResposta.servicos || []);
          setProfissionais(profissionaisResposta.profissionais || []);
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

    carregarDadosPublicos();

    return () => {
      ativo = false;
    };
  }, [slugOuId]);

  useEffect(() => {
    let ativo = true;

    async function carregarHorarios() {
      if (!servicoId || !profissionalId || !data) {
        setHorarios([]);
        return;
      }

      setCarregandoHorarios(true);
      setErro('');

      try {
        const resposta = await listarHorariosDisponiveis(slugOuId, {
          data,
          servico_id: servicoId,
          profissional_id: profissionalId,
        });

        if (ativo) {
          setHorarios(resposta.horarios || []);
          setHorarioSelecionado(null);
        }
      } catch (err) {
        if (ativo) {
          setHorarios([]);
          setHorarioSelecionado(null);
          setErro(err.message);
        }
      } finally {
        if (ativo) {
          setCarregandoHorarios(false);
        }
      }
    }

    carregarHorarios();

    return () => {
      ativo = false;
    };
  }, [data, profissionalId, servicoId, slugOuId]);

  function atualizarCliente(campo, valor) {
    setCliente((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function limparConfirmacao() {
    setResumoConfirmado(null);
    setSucesso('');
  }

  function selecionarServico(id) {
    limparConfirmacao();
    setServicoId(id);
    setHorarioSelecionado(null);
  }

  function selecionarProfissional(id) {
    limparConfirmacao();
    setProfissionalId(id);
    setHorarioSelecionado(null);
  }

  function selecionarData(valor) {
    limparConfirmacao();
    setData(valor);
    setHorarioSelecionado(null);
  }

  async function confirmarAgendamento(event) {
    event.preventDefault();
    setErro('');
    setSucesso('');

    if (!horarioSelecionado) {
      setErro('Escolha um horário disponível.');
      return;
    }

    setEnviando(true);

    try {
      const resumo = {
        cliente_nome: cliente.nome,
        cliente_telefone: cliente.telefone,
        cliente_email: cliente.email,
        data,
        horario: formatarHorario(horarioSelecionado.data_hora_inicio),
        profissional: profissionalSelecionado?.nome,
        servico: servicoSelecionado?.nome,
      };
      const resposta = await criarAgendamentoPublico(slugOuId, {
        servico_id: Number(servicoId),
        profissional_id: Number(profissionalId),
        cliente_nome: cliente.nome,
        cliente_telefone: cliente.telefone,
        cliente_email: cliente.email || undefined,
        observacoes: cliente.observacoes || undefined,
        data_hora_inicio: horarioSelecionado.data_hora_inicio,
      });
      const tokenGerenciamento = resposta.agendamento?.token_gerenciamento;
      const linkGerenciamento = tokenGerenciamento
        ? `${window.location.origin}/gerenciar-agendamento/${encodeURIComponent(
            tokenGerenciamento
          )}`
        : '';

      setSucesso(
        resposta.mensagem ||
          'Agendamento confirmado. Anote o dia e horário escolhidos.'
      );
      setResumoConfirmado({ ...resumo, linkGerenciamento });
      setCliente(CLIENTE_INICIAL);
      setHorarioSelecionado(null);
      const horariosResposta = await listarHorariosDisponiveis(slugOuId, {
        data,
        servico_id: servicoId,
        profissional_id: profissionalId,
      });
      setHorarios(horariosResposta.horarios || []);
    } catch (err) {
      setErro(
        err.message.includes('indispon') || err.message.includes('conflito')
          ? 'Este horário ficou indisponível. Escolha outro horário.'
          : err.message
      );
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return (
      <main className="page public-booking-page">
        <section className="public-booking-card" aria-live="polite">
          <div className="public-booking-header">
            <p className="eyebrow">Agendamento online</p>
            <h1>Carregando negócio</h1>
            <p>Preparando os horários disponíveis.</p>
          </div>
        </section>
      </main>
    );
  }

  if (erro && !negocio) {
    const negocioNaoEncontrado = erro
      .toLocaleLowerCase('pt-BR')
      .includes('não encontrado');

    return (
      <main className="page public-booking-page">
        <section className="public-booking-card">
          <div className="public-booking-header">
            <p className="eyebrow">Agendamento online</p>
            <h1>
              {negocioNaoEncontrado
                ? 'Negócio não encontrado'
                : 'Não foi possível abrir esta página'}
            </h1>
            <p>
              {negocioNaoEncontrado
                ? 'Este link pode estar incorreto ou o negócio não está disponível.'
                : 'Verifique sua conexão e tente novamente em alguns instantes.'}
            </p>
          </div>
          <div className="public-booking-content">
            <div className="dashboard-empty">
              <span className="empty-icon" aria-hidden="true">
                <CircleAlert size={24} strokeWidth={2} />
              </span>
              <div>
                <strong>Confira o endereço recebido</strong>
                <p>Se o problema continuar, solicite um novo link ao negócio.</p>
                <a className="button button-secondary button-small" href="/">
                  Voltar ao início
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page public-booking-page">
      <section className="public-booking-card">
        {bannerUrl && (
          <div className="public-business-banner">
            <img src={bannerUrl} alt={`Capa de ${negocio?.nome || 'negócio'}`} />
          </div>
        )}
        <header className="public-booking-header">
          <div className="public-business-hero">
            <div className={`business-avatar ${logoUrl ? 'has-image' : ''}`}>
              {logoUrl ? (
                <img src={logoUrl} alt={`Logo de ${negocio?.nome || 'negócio'}`} />
              ) : (
                <span aria-hidden="true">
                  {negocio?.nome?.charAt(0)?.toUpperCase() || 'A'}
                </span>
              )}
            </div>
            <div>
              <p className="eyebrow">Agendamento online</p>
              <h1>{negocio?.nome}</h1>
              <p>
                {negocio?.descricao ||
                  'Agende seu horário de forma rápida e fácil.'}
              </p>
            </div>
            {statusAberto !== null && (
              <span
                className={`business-open-badge ${
                  statusAberto ? 'is-open' : 'is-closed'
                }`}
              >
                {statusAberto ? 'Aberto' : 'Fechado'}
              </span>
            )}
          </div>

          <div className="public-business-meta">
            {localizacao && (
              <span>
                <MapPin aria-hidden="true" size={16} strokeWidth={2} />
                {localizacao}
              </span>
            )}
            {negocio?.telefone && (
              <span>
                <Phone aria-hidden="true" size={16} strokeWidth={2} />
                {formatarTelefoneCabecalho(negocio.telefone)}
              </span>
            )}
            {horarioFuncionamento && (
              <span>
                <Clock aria-hidden="true" size={16} strokeWidth={2} />
                {horarioFuncionamento}
              </span>
            )}
          </div>

          <div className="business-hours-note">
            <strong>Dias de funcionamento</strong>
            <span>
              {formatarDiasFuncionamento(negocio?.dias_funcionamento)}
            </span>
          </div>
        </header>

        <div className="booking-steps" aria-label="Etapas do agendamento">
          {ETAPAS.map((etapa, index) => {
            const numero = index + 1;
            const ativo = numero === etapaAtual;
            const concluido = numero < etapaAtual;

            return (
              <div
                className={`booking-step ${ativo ? 'is-active' : ''} ${
                  concluido ? 'is-complete' : ''
                }`}
                key={etapa}
              >
                <span>{numero}</span>
                <strong>{etapa}</strong>
              </div>
            );
          })}
        </div>
        <div
          aria-label={`Progresso do agendamento: etapa ${etapaAtual} de ${ETAPAS.length}`}
          aria-valuemax={ETAPAS.length}
          aria-valuemin="1"
          aria-valuenow={etapaAtual}
          className="booking-progress"
          role="progressbar"
        >
          <span style={{ width: `${progressoEtapa}%` }} />
        </div>

        <div className="public-booking-content">
          {erro && <p className="message message-error">{erro}</p>}

          <section className="booking-intro-card">
            <span className="empty-icon" aria-hidden="true">
              <CheckCircle2 size={24} strokeWidth={2} />
            </span>
            <div>
              <strong>
                Escolha um serviço, profissional e horário para agendar seu
                atendimento.
              </strong>
              <p>
                Selecione as opções disponíveis, preencha seus dados e confirme
                o horário.
              </p>
              <small>{ETAPA_DESCRICOES[etapaAtual]}</small>
            </div>
          </section>

          <div className="booking-workspace">
            <div className="booking-flow">
          {resumoConfirmado && (
            <section
              className="booking-section confirmation-card"
              aria-labelledby="confirmacao-title"
            >
              <span className="confirmation-icon" aria-hidden="true">
                <CheckCircle2 size={24} strokeWidth={2} />
              </span>
              <div>
                <p className="step-label">Confirmação</p>
                <h2 id="confirmacao-title">Agendamento confirmado</h2>
                {sucesso && <p className="panel-text">{sucesso}</p>}
              </div>

              <dl className="details-list booking-summary">
                <div>
                  <dt>Cliente</dt>
                  <dd>{resumoConfirmado.cliente_nome}</dd>
                </div>
                <div>
                  <dt>Telefone</dt>
                  <dd>{resumoConfirmado.cliente_telefone}</dd>
                </div>
                {resumoConfirmado.cliente_email && (
                  <div>
                    <dt>E-mail</dt>
                    <dd>{resumoConfirmado.cliente_email}</dd>
                  </div>
                )}
                <div>
                  <dt>Serviço</dt>
                  <dd>{resumoConfirmado.servico}</dd>
                </div>
                <div>
                  <dt>Profissional</dt>
                  <dd>{resumoConfirmado.profissional}</dd>
                </div>
                <div>
                  <dt>Data e horário</dt>
                  <dd>
                    {formatarData(resumoConfirmado.data)} às{' '}
                    {resumoConfirmado.horario}
                  </dd>
                </div>
              </dl>

              {resumoConfirmado.linkGerenciamento && (
                <a
                  className="button button-primary button-small"
                  href={resumoConfirmado.linkGerenciamento}
                >
                  Gerenciar agendamento
                </a>
              )}
            </section>
          )}

          <section className="booking-section" aria-labelledby="servico-title">
            <p className="step-label">Serviço</p>
            <h2 id="servico-title">Escolha o serviço</h2>

            {servicos.length === 0 && (
              <div className="dashboard-empty">
                <span className="empty-icon" aria-hidden="true">
                  <Scissors size={24} strokeWidth={2} />
                </span>
                <div>
                  <strong>Nenhum serviço disponível</strong>
                  <p>Este negócio ainda não possui serviços para agendamento.</p>
                </div>
              </div>
            )}

            <div className="choice-list">
              {servicos.map((servico) => (
                <button
                  className={`choice-card booking-choice ${
                    String(servico.id) === String(servicoId) ? 'is-selected' : ''
                  }`}
                  key={servico.id}
                  onClick={() => selecionarServico(String(servico.id))}
                  type="button"
                >
                  <strong>{servico.nome}</strong>
                  <span>{servico.descricao || 'Serviço do estabelecimento'}</span>
                  <div className="choice-meta">
                    <span>{servico.duracao_minutos} min</span>
                    <span>{formatarPreco(servico.preco)}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {servicoId && (
            <section
              className="booking-section"
              aria-labelledby="profissional-title"
            >
              <p className="step-label">Profissional</p>
              <h2 id="profissional-title">Escolha o profissional</h2>

              {profissionais.length === 0 && (
                <div className="dashboard-empty">
                  <span className="empty-icon" aria-hidden="true">
                    <Users size={24} strokeWidth={2} />
                  </span>
                  <div>
                    <strong>Nenhum profissional disponível</strong>
                    <p>Este negócio ainda não possui profissionais ativos.</p>
                  </div>
                </div>
              )}

              <div className="choice-list">
                {profissionais.map((profissional) => (
                  <button
                    className={`choice-card booking-choice professional-choice ${
                      String(profissional.id) === String(profissionalId)
                        ? 'is-selected'
                        : ''
                    }`}
                    key={profissional.id}
                    onClick={() =>
                      selecionarProfissional(String(profissional.id))
                    }
                    type="button"
                  >
                    <span className="entity-avatar" aria-hidden="true">
                      {profissional.nome?.charAt(0)?.toUpperCase() || 'P'}
                    </span>
                    <span>
                      <strong>{profissional.nome}</strong>
                      {profissional.especialidade && (
                        <small>{profissional.especialidade}</small>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {servicoId && profissionalId && (
            <section className="booking-section" aria-labelledby="data-title">
              <p className="step-label">Data e hora</p>
              <h2 id="data-title">Escolha a data</h2>

              <label>
                Data do agendamento
                <input
                  min={hojeIso()}
                  onChange={(event) => selecionarData(event.target.value)}
                  required
                  type="date"
                  value={data}
                />
              </label>
            </section>
          )}

          {servicoId && profissionalId && data && (
            <section className="booking-section" aria-labelledby="horario-title">
              <p className="step-label">Horários disponíveis</p>
              <h2 id="horario-title">Escolha o horário</h2>

              {carregandoHorarios && (
                <p className="message message-info">Carregando horários...</p>
              )}

              {!carregandoHorarios && horarios.length === 0 && (
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
                    className={`time-button ${
                      horarioSelecionado?.data_hora_inicio ===
                      horario.data_hora_inicio
                        ? 'is-selected'
                        : ''
                    }`}
                    key={horario.data_hora_inicio}
                    onClick={() => {
                      limparConfirmacao();
                      setHorarioSelecionado(horario);
                    }}
                    type="button"
                  >
                    {formatarHorario(horario.data_hora_inicio)}
                  </button>
                ))}
              </div>
            </section>
          )}

          {horarioSelecionado && (
            <section className="booking-section" aria-labelledby="cliente-title">
              <p className="step-label">Dados</p>
              <h2 id="cliente-title">Informe seus dados</h2>

              <form className="form" onSubmit={confirmarAgendamento}>
                <div className="form-grid">
                  <label>
                    Nome
                    <input
                      autoComplete="name"
                      onChange={(event) =>
                        atualizarCliente('nome', event.target.value)
                      }
                      required
                      type="text"
                      value={cliente.nome}
                    />
                  </label>

                  <label>
                    Telefone
                    <input
                      autoComplete="tel"
                      inputMode="tel"
                      onChange={(event) =>
                        atualizarCliente('telefone', event.target.value)
                      }
                      required
                      type="tel"
                      value={cliente.telefone}
                    />
                  </label>
                </div>

                <label>
                  E-mail opcional
                  <input
                    autoComplete="email"
                    inputMode="email"
                    onChange={(event) =>
                      atualizarCliente('email', event.target.value)
                    }
                    type="email"
                    value={cliente.email}
                  />
                </label>

                <label>
                  Observações opcionais
                  <textarea
                    onChange={(event) =>
                      atualizarCliente('observacoes', event.target.value)
                    }
                    rows="3"
                    value={cliente.observacoes}
                  />
                </label>

                <div className="booking-review-card">
                  <p className="step-label">Confirmação</p>
                  <h3>Resumo do agendamento</h3>
                  <dl className="details-list booking-summary">
                    <div>
                      <dt>Serviço</dt>
                      <dd>{servicoSelecionado?.nome}</dd>
                    </div>
                    <div>
                      <dt>Profissional</dt>
                      <dd>{profissionalSelecionado?.nome}</dd>
                    </div>
                    <div>
                      <dt>Data e horário</dt>
                      <dd>
                        {formatarData(data)} às{' '}
                        {formatarHorario(horarioSelecionado.data_hora_inicio)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <button
                  className="button button-primary"
                  disabled={enviando}
                  type="submit"
                >
                  {enviando ? 'Confirmando...' : 'Confirmar agendamento'}
                </button>
              </form>
            </section>
          )}
            </div>

            <aside className="booking-selection-summary" aria-label="Resumo do agendamento">
              <p className="step-label">Resumo</p>
              <h2>Sua escolha</h2>
              <dl className="details-list booking-summary">
                <div>
                  <dt>Serviço</dt>
                  <dd>{servicoSelecionado?.nome || 'Ainda não escolhido'}</dd>
                </div>
                <div>
                  <dt>Profissional</dt>
                  <dd>{profissionalSelecionado?.nome || 'Ainda não escolhido'}</dd>
                </div>
                <div>
                  <dt>Data</dt>
                  <dd>{data ? formatarData(data) : 'Ainda não escolhida'}</dd>
                </div>
                <div>
                  <dt>Horário</dt>
                  <dd>
                    {horarioSelecionado
                      ? formatarHorario(horarioSelecionado.data_hora_inicio)
                      : 'Ainda não escolhido'}
                  </dd>
                </div>
              </dl>
              <p className="booking-summary-note">
                Os horários aparecem conforme a agenda livre do profissional.
              </p>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

export default AgendamentoPublico;
