import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarX,
  CheckCircle2,
  CircleAlert,
  Clock,
  MapPin,
  Phone,
  Scissors,
  ShieldCheck,
  Users,
} from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import {
  buscarNegocioPublico,
  criarAgendamentoPublico,
  listarHorariosDisponiveis,
  listarProfissionaisPublicos,
  listarServicosPublicos,
} from '../services/publicoService';
import { resolverAssetUrl } from '../services/api';
import {
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

function PublicBookingShell({ children, statePage = false }) {
  return (
    <main className="page public-booking-page public-new-booking-page">
      <section
        className={`public-booking-card public-new-booking-card ${
          statePage ? 'is-state-page' : ''
        }`}
      >
        <div className="public-booking-topbar public-new-booking-topbar">
          <BrandLogo />
          <span>
            <ShieldCheck aria-hidden="true" size={16} strokeWidth={2} />
            Agendamento protegido
          </span>
        </div>
        {children}
      </section>
    </main>
  );
}

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
  const confirmacaoRef = useRef(null);
  const ultimaConsultaHorariosId = useRef(0);

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
    async function carregarHorarios() {
      const consultaId = ++ultimaConsultaHorariosId.current;

      if (!servicoId || !profissionalId || !data) {
        if (consultaId === ultimaConsultaHorariosId.current) {
          setHorarios([]);
          setHorarioSelecionado(null);
          setCarregandoHorarios(false);
        }
        return;
      }

      if (consultaId === ultimaConsultaHorariosId.current) {
        setCarregandoHorarios(true);
        setHorarios([]);
        setHorarioSelecionado(null);
        setErro('');
      }

      try {
        const resposta = await listarHorariosDisponiveis(slugOuId, {
          data,
          servico_id: servicoId,
          profissional_id: profissionalId,
        });

        if (consultaId === ultimaConsultaHorariosId.current) {
          setHorarios(resposta.horarios || []);
          setHorarioSelecionado(null);
        }
      } catch (err) {
        if (consultaId === ultimaConsultaHorariosId.current) {
          setHorarios([]);
          setHorarioSelecionado(null);
          setErro(err.message);
        }
      } finally {
        if (consultaId === ultimaConsultaHorariosId.current) {
          setCarregandoHorarios(false);
        }
      }
    }

    carregarHorarios();

    return () => {
      ultimaConsultaHorariosId.current += 1;
    };
  }, [data, profissionalId, servicoId, slugOuId]);

  useEffect(() => {
    if (resumoConfirmado) {
      confirmacaoRef.current?.scrollIntoView?.({ block: 'start' });
    }
  }, [resumoConfirmado]);

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
    if (String(id) !== String(servicoId)) {
      ultimaConsultaHorariosId.current += 1;
      setHorarios([]);
    }
    setErro('');
    limparConfirmacao();
    setServicoId(id);
    setHorarioSelecionado(null);
  }

  function selecionarProfissional(id) {
    if (String(id) !== String(profissionalId)) {
      ultimaConsultaHorariosId.current += 1;
      setHorarios([]);
    }
    setErro('');
    limparConfirmacao();
    setProfissionalId(id);
    setHorarioSelecionado(null);
  }

  function selecionarData(valor) {
    if (valor !== data) {
      ultimaConsultaHorariosId.current += 1;
      setHorarios([]);
    }
    setErro('');
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

    const geracaoSelecaoAoConfirmar = ++ultimaConsultaHorariosId.current;
    setEnviando(true);

    const horarioConfirmado = horarioSelecionado;
    const resumo = {
      cliente_nome: cliente.nome,
      cliente_telefone: cliente.telefone,
      cliente_email: cliente.email,
      data,
      horario: formatarHorario(horarioConfirmado.data_hora_inicio),
      profissional: profissionalSelecionado?.nome,
      servico: servicoSelecionado?.nome,
    };
    let resposta;

    try {
      resposta = await criarAgendamentoPublico(slugOuId, {
        servico_id: Number(servicoId),
        profissional_id: Number(profissionalId),
        cliente_nome: cliente.nome,
        cliente_telefone: cliente.telefone,
        cliente_email: cliente.email || undefined,
        observacoes: cliente.observacoes || undefined,
        data_hora_inicio: horarioConfirmado.data_hora_inicio,
      });
    } catch (err) {
      setErro(
        err.message.includes('indispon') || err.message.includes('conflito')
          ? 'Este horário ficou indisponível. Escolha outro horário.'
          : err.message
      );
      setEnviando(false);
      return;
    }

    const tokenGerenciamento = resposta.agendamento?.token_gerenciamento;
    const linkGerenciamento = tokenGerenciamento
      ? `${window.location.origin}/gerenciar-agendamento/${encodeURIComponent(
          tokenGerenciamento
        )}`
      : '';
    const selecaoPermaneceAtual =
      geracaoSelecaoAoConfirmar === ultimaConsultaHorariosId.current;

    if (selecaoPermaneceAtual) {
      setErro('');
    }
    setSucesso(
      resposta.mensagem ||
        'Agendamento confirmado. Anote o dia e horário escolhidos.'
    );
    setResumoConfirmado({ ...resumo, linkGerenciamento });
    if (selecaoPermaneceAtual) {
      setCliente(CLIENTE_INICIAL);
      setHorarioSelecionado(null);
    }
    setEnviando(false);

    if (!selecaoPermaneceAtual) {
      return;
    }

    setHorarios((atuais) =>
      atuais.filter(
        (horario) =>
          horario.data_hora_inicio !== horarioConfirmado.data_hora_inicio
      )
    );

    const consultaId = ++ultimaConsultaHorariosId.current;

    try {
      const horariosResposta = await listarHorariosDisponiveis(slugOuId, {
        data,
        servico_id: servicoId,
        profissional_id: profissionalId,
      });

      if (consultaId === ultimaConsultaHorariosId.current) {
        const horariosAtualizados = horariosResposta.horarios || [];
        setHorarios(horariosAtualizados);
        setHorarioSelecionado((horarioAtual) =>
          horariosAtualizados.find(
            (horario) =>
              horario.data_hora_inicio === horarioAtual?.data_hora_inicio
          ) || null
        );
      }
    } catch {
      if (consultaId === ultimaConsultaHorariosId.current) {
        // O POST confirmado é autoritativo; esta atualização é auxiliar.
        setHorarios((atuais) =>
          atuais.filter(
            (horario) =>
              horario.data_hora_inicio !== horarioConfirmado.data_hora_inicio
          )
        );
      }
    } finally {
      if (consultaId === ultimaConsultaHorariosId.current) {
        setCarregandoHorarios(false);
      }
    }
  }

  if (carregando) {
    return (
      <PublicBookingShell statePage>
        <div
          aria-busy="true"
          aria-live="polite"
          className="public-booking-loading"
          role="status"
        >
          <span className="booking-loading-copy">Carregando página de agendamento</span>
          <div className="booking-loading-identity" aria-hidden="true">
            <span className="booking-skeleton booking-skeleton-avatar" />
            <span>
              <i className="booking-skeleton booking-skeleton-title" />
              <i className="booking-skeleton booking-skeleton-text" />
            </span>
          </div>
          <div className="booking-loading-body" aria-hidden="true">
            <i className="booking-skeleton booking-skeleton-line" />
            <i className="booking-skeleton booking-skeleton-line is-short" />
            <i className="booking-skeleton booking-skeleton-block" />
          </div>
        </div>
      </PublicBookingShell>
    );
  }

  if (erro && !negocio) {
    const negocioNaoEncontrado = erro
      .toLocaleLowerCase('pt-BR')
      .includes('não encontrado');

    return (
      <PublicBookingShell statePage>
        <div className="public-booking-state" role="alert">
          <span className="public-booking-state-icon is-error" aria-hidden="true">
            <CircleAlert size={28} strokeWidth={2} />
          </span>
          <div>
            <h1>
              {negocioNaoEncontrado
                ? 'Negócio não encontrado'
                : 'Não foi possível abrir esta página'}
            </h1>
            <p>
              {negocioNaoEncontrado
                ? 'Confira se o link recebido está completo ou peça um novo link ao negócio.'
                : 'Verifique sua conexão e tente abrir a página novamente.'}
            </p>
          </div>
          <div className="public-booking-state-actions">
            {!negocioNaoEncontrado && (
              <a className="button button-primary" href={window.location.href}>
                Tentar novamente
              </a>
            )}
            <a className="button button-secondary" href="/">
              Ir para o Agendai
            </a>
          </div>
        </div>
      </PublicBookingShell>
    );
  }

  return (
    <PublicBookingShell>
        {bannerUrl && (
          <div className="public-business-banner public-new-business-banner">
            <img src={bannerUrl} alt={`Capa de ${negocio?.nome || 'negócio'}`} />
          </div>
        )}
        <header className="public-booking-header public-new-booking-header">
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

          <div className="public-business-meta" aria-label="Informações do negócio">
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

          <div className="business-hours-note public-business-hours">
            <strong>Dias de funcionamento</strong>
            <span>
              {formatarDiasFuncionamento(negocio?.dias_funcionamento)}
            </span>
          </div>
        </header>

        <div className="public-booking-progress-wrap">
          <div className="booking-current-step">
            <span>Etapa {etapaAtual} de {ETAPAS.length}</span>
            <strong>{ETAPAS[etapaAtual - 1]}</strong>
          </div>
          <ol className="booking-steps" aria-label="Etapas do agendamento">
            {ETAPAS.map((etapa, index) => {
              const numero = index + 1;
              const ativo = numero === etapaAtual;
              const concluido = numero < etapaAtual;

              return (
                <li
                  aria-current={ativo ? 'step' : undefined}
                  className={`booking-step ${ativo ? 'is-active' : ''} ${
                    concluido ? 'is-complete' : ''
                  }`}
                  key={etapa}
                >
                  <span>{concluido ? <CheckCircle2 aria-hidden="true" size={15} /> : numero}</span>
                  <strong>{etapa}</strong>
                </li>
              );
            })}
          </ol>
          <div
            aria-label={`Progresso do agendamento: etapa ${etapaAtual} de ${ETAPAS.length}`}
            aria-valuemax={ETAPAS.length}
            aria-valuemin="1"
            aria-valuenow={etapaAtual}
            className="booking-progress"
            role="progressbar"
          >
            <span style={{ '--booking-progress': progressoEtapa / 100 }} />
          </div>
        </div>

        <div className="public-booking-content public-new-booking-content">
          {erro && <p className="message message-error" role="alert">{erro}</p>}

          {resumoConfirmado ? (
            <section
              className="booking-success"
              aria-labelledby="confirmacao-title"
              ref={confirmacaoRef}
            >
              <span className="public-booking-state-icon is-success" aria-hidden="true">
                <CheckCircle2 size={30} strokeWidth={2} />
              </span>
              <div className="booking-success-heading">
                <h2 id="confirmacao-title">Agendamento confirmado</h2>
                {sucesso && <p role="status">{sucesso}</p>}
              </div>
              <div className="booking-appointment-strip">
                <span>
                  <small>Data</small>
                  <strong>{formatarData(resumoConfirmado.data)}</strong>
                </span>
                <span>
                  <small>Horário</small>
                  <strong>{resumoConfirmado.horario}</strong>
                </span>
              </div>
              <dl className="booking-success-details">
                <div>
                  <dt>Serviço</dt>
                  <dd>{resumoConfirmado.servico}</dd>
                </div>
                <div>
                  <dt>Profissional</dt>
                  <dd>{resumoConfirmado.profissional}</dd>
                </div>
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
              </dl>
              <p className="booking-success-note">
                Guarde os dados acima. Use o link abaixo para consultar, reagendar ou cancelar.
              </p>
              {resumoConfirmado.linkGerenciamento && (
                <a className="button button-primary" href={resumoConfirmado.linkGerenciamento}>
                  Gerenciar agendamento
                </a>
              )}
            </section>
          ) : (
          <div className="booking-workspace public-booking-workspace">
            <div className="booking-flow">
          <section className="booking-section" aria-labelledby="servico-title">
            <div className="booking-section-heading">
              <span className="booking-section-number">1</span>
              <div>
                <h2 id="servico-title">Escolha o serviço</h2>
                <p>Qual atendimento você deseja?</p>
              </div>
            </div>

            {servicos.length === 0 && (
              <div className="public-booking-empty" role="status">
                <span className="public-booking-empty-icon" aria-hidden="true">
                  <Scissors size={24} strokeWidth={2} />
                </span>
                <div>
                  <strong>Nenhum serviço disponível</strong>
                  <p>Este negócio não está recebendo agendamentos no momento.</p>
                </div>
              </div>
            )}

            <div className="choice-list">
              {servicos.map((servico) => (
                <button
                  aria-pressed={String(servico.id) === String(servicoId)}
                  className={`choice-card booking-choice ${
                    String(servico.id) === String(servicoId) ? 'is-selected' : ''
                  }`}
                  disabled={enviando}
                  key={servico.id}
                  onClick={() => selecionarServico(String(servico.id))}
                  type="button"
                >
                  <span className="booking-choice-copy">
                    <strong>{servico.nome}</strong>
                    <small>{servico.descricao || 'Serviço do estabelecimento'}</small>
                    <span className="choice-meta">
                      <span>{servico.duracao_minutos} min</span>
                      <span>{formatarPreco(servico.preco)}</span>
                    </span>
                  </span>
                  <CheckCircle2 className="booking-choice-check" aria-hidden="true" size={21} />
                </button>
              ))}
            </div>
          </section>

          {servicoId && (
            <section
              className="booking-section"
              aria-labelledby="profissional-title"
            >
              <div className="booking-section-heading">
                <span className="booking-section-number">2</span>
                <div>
                  <h2 id="profissional-title">Escolha o profissional</h2>
                  <p>Quem vai realizar o atendimento?</p>
                </div>
              </div>

              {profissionais.length === 0 && (
                <div className="public-booking-empty" role="status">
                  <span className="public-booking-empty-icon" aria-hidden="true">
                    <Users size={24} strokeWidth={2} />
                  </span>
                  <div>
                    <strong>Nenhum profissional disponível</strong>
                    <p>Não há profissional disponível para este agendamento.</p>
                  </div>
                </div>
              )}

              <div className="choice-list">
                {profissionais.map((profissional) => (
                  <button
                    aria-pressed={String(profissional.id) === String(profissionalId)}
                    className={`choice-card booking-choice professional-choice ${
                      String(profissional.id) === String(profissionalId)
                        ? 'is-selected'
                        : ''
                    }`}
                    disabled={enviando}
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
                    <CheckCircle2 className="booking-choice-check" aria-hidden="true" size={21} />
                  </button>
                ))}
              </div>
            </section>
          )}

          {servicoId && profissionalId && (
            <section className="booking-section" aria-labelledby="data-title">
              <div className="booking-section-heading">
                <span className="booking-section-number">3</span>
                <div>
                  <h2 id="data-title">Escolha data e horário</h2>
                  <p>Mostramos somente horários livres.</p>
                </div>
              </div>

              <label className="booking-date-field">
                Data do agendamento
                <input
                  disabled={enviando}
                  min={hojeIso()}
                  onChange={(event) => selecionarData(event.target.value)}
                  required
                  type="date"
                  value={data}
                />
              </label>
              {data && (
                <div className="booking-time-group" aria-labelledby="horario-title">
                  <h3 id="horario-title">Horários disponíveis</h3>

                  {carregandoHorarios && (
                    <div className="booking-time-loading" role="status">
                      <span>Carregando horários...</span>
                      <div aria-hidden="true">
                        <i className="booking-skeleton" />
                        <i className="booking-skeleton" />
                        <i className="booking-skeleton" />
                      </div>
                    </div>
                  )}

                  {!carregandoHorarios && !erro && horarios.length === 0 && (
                    <div className="public-booking-empty is-compact" role="status">
                      <span className="public-booking-empty-icon" aria-hidden="true">
                        <CalendarX size={24} strokeWidth={2} />
                      </span>
                      <div>
                        <strong>Nenhum horário nesta data</strong>
                        <p>Escolha outro dia para consultar novos horários.</p>
                      </div>
                    </div>
                  )}

                  <div className="time-grid">
                    {horarios.map((horario) => (
                      <button
                        aria-pressed={
                          horarioSelecionado?.data_hora_inicio ===
                          horario.data_hora_inicio
                        }
                        className={`time-button ${
                          horarioSelecionado?.data_hora_inicio ===
                          horario.data_hora_inicio
                            ? 'is-selected'
                            : ''
                        }`}
                        disabled={enviando}
                        key={horario.data_hora_inicio}
                        onClick={() => {
                          setErro('');
                          limparConfirmacao();
                          setHorarioSelecionado(horario);
                        }}
                        type="button"
                      >
                        {formatarHorario(horario.data_hora_inicio)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {horarioSelecionado && (
            <section className="booking-section" aria-labelledby="cliente-title">
              <div className="booking-section-heading">
                <span className="booking-section-number">4</span>
                <div>
                  <h2 id="cliente-title">Informe seus dados</h2>
                  <p>Usaremos estes dados para identificar seu agendamento.</p>
                </div>
              </div>

              <form className="form" onSubmit={confirmarAgendamento}>
                <div className="form-grid">
                  <label>
                    Nome
                    <input
                      autoComplete="name"
                      disabled={enviando}
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
                      disabled={enviando}
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
                    <span className="booking-field-label">
                      E-mail <span className="booking-optional">(opcional)</span>
                    </span>
                  <input
                    autoComplete="email"
                    disabled={enviando}
                    inputMode="email"
                    onChange={(event) =>
                      atualizarCliente('email', event.target.value)
                    }
                    type="email"
                    value={cliente.email}
                  />
                </label>

                <label>
                  <span className="booking-field-label">
                    Observações <span className="booking-optional">(opcional)</span>
                  </span>
                  <textarea
                    disabled={enviando}
                    onChange={(event) =>
                      atualizarCliente('observacoes', event.target.value)
                    }
                    rows="3"
                    value={cliente.observacoes}
                  />
                </label>

                <div className="booking-review-card">
                  <span>
                    <small>Seu horário</small>
                    <strong>{formatarData(data)} às {formatarHorario(horarioSelecionado.data_hora_inicio)}</strong>
                  </span>
                  <span>{servicoSelecionado?.nome} com {profissionalSelecionado?.nome}</span>
                </div>

                <button
                  aria-busy={enviando}
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

            <aside className="booking-selection-summary" aria-label="Resumo das suas escolhas">
              <h2>Seu agendamento</h2>
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
                Se mudar uma escolha, os horários disponíveis serão atualizados.
              </p>
            </aside>
          </div>
          )}
        </div>
    </PublicBookingShell>
  );
}

export default AgendamentoPublico;
