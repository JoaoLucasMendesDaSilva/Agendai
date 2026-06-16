import { useEffect, useMemo, useState } from 'react';
import {
  buscarNegocioPublico,
  criarAgendamentoPublico,
  listarHorariosDisponiveis,
  listarProfissionaisPublicos,
  listarServicosPublicos,
} from '../services/publicoService';

const CLIENTE_INICIAL = {
  nome: '',
  telefone: '',
  email: '',
  observacoes: '',
};

function hojeIso() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}

function formatarPreco(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    currency: 'BRL',
    style: 'currency',
  });
}

function formatarHorario(dataHora) {
  return String(dataHora || '').slice(11, 16);
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

  function selecionarServico(id) {
    setServicoId(id);
    setHorarioSelecionado(null);
  }

  function selecionarProfissional(id) {
    setProfissionalId(id);
    setHorarioSelecionado(null);
  }

  function selecionarData(valor) {
    setData(valor);
    setHorarioSelecionado(null);
  }

  async function confirmarAgendamento(event) {
    event.preventDefault();
    setErro('');
    setSucesso('');

    if (!horarioSelecionado) {
      setErro('Escolha um horario disponivel.');
      return;
    }

    setEnviando(true);

    try {
      const resposta = await criarAgendamentoPublico(slugOuId, {
        servico_id: Number(servicoId),
        profissional_id: Number(profissionalId),
        cliente_nome: cliente.nome,
        cliente_telefone: cliente.telefone,
        cliente_email: cliente.email || undefined,
        observacoes: cliente.observacoes || undefined,
        data_hora_inicio: horarioSelecionado.data_hora_inicio,
      });

      setSucesso(
        resposta.mensagem ||
          'Agendamento confirmado. Anote o dia e horario escolhidos.'
      );
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
          ? 'Este horario ficou indisponivel. Escolha outro horario.'
          : err.message
      );
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return (
      <main className="page public-page">
        <section className="dashboard-panel" aria-live="polite">
          <p className="eyebrow">Agendamento online</p>
          <h1>Carregando negocio</h1>
        </section>
      </main>
    );
  }

  if (erro && !negocio) {
    return (
      <main className="page public-page">
        <section className="dashboard-panel">
          <p className="eyebrow">Agendamento online</p>
          <h1>Nao foi possivel carregar</h1>
          <p className="message message-error">{erro}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page public-page">
      <header className="public-header">
        <p className="eyebrow">Agendamento online</p>
        <h1>{negocio?.nome}</h1>
        {negocio?.descricao && <p className="panel-text">{negocio.descricao}</p>}
        <p className="panel-text">
          {negocio?.cidade}
          {negocio?.telefone ? ` - ${negocio.telefone}` : ''}
        </p>
      </header>

      {erro && <p className="message message-error">{erro}</p>}
      {sucesso && <p className="message message-success">{sucesso}</p>}

      <section className="dashboard-panel" aria-labelledby="servico-title">
        <p className="step-label">1 de 6</p>
        <h2 id="servico-title">Escolha o servico</h2>

        {servicos.length === 0 && (
          <p className="panel-text">Nenhum servico disponivel no momento.</p>
        )}

        <div className="choice-list">
          {servicos.map((servico) => (
            <button
              className={`choice-card ${
                String(servico.id) === String(servicoId) ? 'is-selected' : ''
              }`}
              key={servico.id}
              onClick={() => selecionarServico(String(servico.id))}
              type="button"
            >
              <strong>{servico.nome}</strong>
              <span>{servico.duracao_minutos} min</span>
              <span>{formatarPreco(servico.preco)}</span>
            </button>
          ))}
        </div>
      </section>

      {servicoId && (
        <section className="dashboard-panel" aria-labelledby="profissional-title">
          <p className="step-label">2 de 6</p>
          <h2 id="profissional-title">Escolha o profissional</h2>

          {profissionais.length === 0 && (
            <p className="panel-text">
              Nenhum profissional disponivel no momento.
            </p>
          )}

          <div className="choice-list">
            {profissionais.map((profissional) => (
              <button
                className={`choice-card ${
                  String(profissional.id) === String(profissionalId)
                    ? 'is-selected'
                    : ''
                }`}
                key={profissional.id}
                onClick={() => selecionarProfissional(String(profissional.id))}
                type="button"
              >
                <strong>{profissional.nome}</strong>
                {profissional.especialidade && (
                  <span>{profissional.especialidade}</span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {servicoId && profissionalId && (
        <section className="dashboard-panel" aria-labelledby="data-title">
          <p className="step-label">3 de 6</p>
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
        <section className="dashboard-panel" aria-labelledby="horario-title">
          <p className="step-label">4 de 6</p>
          <h2 id="horario-title">Escolha o horario</h2>

          {carregandoHorarios && (
            <p className="message message-info">Carregando horarios...</p>
          )}

          {!carregandoHorarios && horarios.length === 0 && (
            <p className="panel-text">
              Nenhum horario disponivel para esta data.
            </p>
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
                onClick={() => setHorarioSelecionado(horario)}
                type="button"
              >
                {formatarHorario(horario.data_hora_inicio)}
              </button>
            ))}
          </div>
        </section>
      )}

      {horarioSelecionado && (
        <section className="dashboard-panel" aria-labelledby="cliente-title">
          <p className="step-label">5 de 6</p>
          <h2 id="cliente-title">Seus dados</h2>

          <form className="form" onSubmit={confirmarAgendamento}>
            <label>
              Nome
              <input
                autoComplete="name"
                onChange={(event) => atualizarCliente('nome', event.target.value)}
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

            <label>
              E-mail opcional
              <input
                autoComplete="email"
                inputMode="email"
                onChange={(event) => atualizarCliente('email', event.target.value)}
                type="email"
                value={cliente.email}
              />
            </label>

            <label>
              Observacoes opcionais
              <textarea
                onChange={(event) =>
                  atualizarCliente('observacoes', event.target.value)
                }
                rows="3"
                value={cliente.observacoes}
              />
            </label>

            <div className="summary-box">
              <p className="step-label">6 de 6</p>
              <p>
                <strong>Servico:</strong> {servicoSelecionado?.nome}
              </p>
              <p>
                <strong>Profissional:</strong> {profissionalSelecionado?.nome}
              </p>
              <p>
                <strong>Data e horario:</strong> {data} as{' '}
                {formatarHorario(horarioSelecionado.data_hora_inicio)}
              </p>
            </div>

            <button className="button button-primary" disabled={enviando} type="submit">
              {enviando ? 'Confirmando...' : 'Confirmar agendamento'}
            </button>
          </form>
        </section>
      )}
    </main>
  );
}

export default AgendamentoPublico;
