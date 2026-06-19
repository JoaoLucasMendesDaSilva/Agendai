import { useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import { useAuth } from '../contexts/AuthContext';
import {
  atualizarNegocio,
  buscarNegocio,
  criarNegocio,
} from '../services/negocioService';

const DIAS_SEMANA = [
  { valor: 0, label: 'Domingo' },
  { valor: 1, label: 'Segunda' },
  { valor: 2, label: 'Terça' },
  { valor: 3, label: 'Quarta' },
  { valor: 4, label: 'Quinta' },
  { valor: 5, label: 'Sexta' },
  { valor: 6, label: 'Sábado' },
];

const FORM_INICIAL = {
  nome: '',
  descricao: '',
  telefone: '',
  endereco: '',
  cidade: 'Cubatão',
  horario_abertura: '08:00',
  horario_fechamento: '18:00',
  dias_funcionamento: [1, 2, 3, 4, 5],
};

function normalizarHorario(horario) {
  return String(horario || '').slice(0, 5);
}

function montarForm(negocio) {
  if (!negocio) {
    return FORM_INICIAL;
  }

  return {
    nome: negocio.nome || '',
    descricao: negocio.descricao || '',
    telefone: negocio.telefone || '',
    endereco: negocio.endereco || '',
    cidade: negocio.cidade || '',
    horario_abertura: normalizarHorario(negocio.horario_abertura),
    horario_fechamento: normalizarHorario(negocio.horario_fechamento),
    dias_funcionamento: Array.isArray(negocio.dias_funcionamento)
      ? negocio.dias_funcionamento
      : [],
  };
}

function montarPayload(form) {
  return {
    nome: form.nome,
    descricao: form.descricao,
    telefone: form.telefone,
    endereco: form.endereco,
    cidade: form.cidade,
    horario_abertura: form.horario_abertura,
    horario_fechamento: form.horario_fechamento,
    dias_funcionamento: form.dias_funcionamento,
  };
}

function montarLinkPublico(slug) {
  if (!slug || typeof window === 'undefined') {
    return '';
  }

  return `${window.location.origin}/agendar/${slug}`;
}

function Negocio({ navigate }) {
  const { logout, usuario } = useAuth();
  const [negocio, setNegocio] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [feedbackLink, setFeedbackLink] = useState('');
  const linkPublico = montarLinkPublico(negocio?.slug_publico);

  useEffect(() => {
    let ativo = true;

    async function carregarNegocio() {
      setCarregando(true);
      setErro('');

      try {
        const resposta = await buscarNegocio();

        if (ativo) {
          setNegocio(resposta.negocio);
          setForm(montarForm(resposta.negocio));
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

    carregarNegocio();

    return () => {
      ativo = false;
    };
  }, []);

  function atualizarCampo(campo, valor) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function alternarDia(dia) {
    setForm((atual) => {
      const dias = atual.dias_funcionamento.includes(dia)
        ? atual.dias_funcionamento.filter((item) => item !== dia)
        : [...atual.dias_funcionamento, dia].sort((a, b) => a - b);

      return {
        ...atual,
        dias_funcionamento: dias,
      };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setSucesso('');
    setSalvando(true);

    try {
      const payload = montarPayload(form);
      const resposta = negocio
        ? await atualizarNegocio(negocio.id, payload)
        : await criarNegocio(payload);

      setNegocio(resposta.negocio);
      setForm(montarForm(resposta.negocio));
      setSucesso(resposta.mensagem || 'Negócio salvo com sucesso.');
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  async function copiarLinkPublico() {
    if (!linkPublico) {
      return;
    }

    setFeedbackLink('');

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(linkPublico);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = linkPublico;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        const copiou = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (!copiou) {
          throw new Error('copy-failed');
        }
      }

      setFeedbackLink('Link copiado!');
      window.setTimeout(() => setFeedbackLink(''), 2500);
    } catch {
      setFeedbackLink(
        'Não foi possível copiar. Selecione e copie o link manualmente.',
      );
    }
  }

  return (
    <DashboardShell
      currentPath="/negocio"
      navigate={navigate}
      onLogout={handleLogout}
      usuario={usuario}
    >
      <header className="page-title">
        <div>
          <p className="eyebrow">Painel do empreendedor</p>
          <h1>Meu negócio</h1>
          <p className="panel-text">
            Configure os dados que aparecem para seus clientes.
          </p>
        </div>
      </header>

      <section className="management-grid" aria-labelledby="negocio-title">
        <div className="dashboard-panel management-form-card">
          <div className="panel-heading">
            <div>
              <h2 id="negocio-title">
                {negocio ? 'Editar dados do negócio' : 'Cadastrar negócio'}
              </h2>
              <p className="panel-text">
                Informe os dados básicos usados no agendamento público.
              </p>
            </div>
          </div>

          {carregando && (
            <p className="message message-info" aria-live="polite">
              Carregando negócio...
            </p>
          )}

          {!carregando && erro && <p className="message message-error">{erro}</p>}
          {!carregando && sucesso && (
            <p className="message message-success">{sucesso}</p>
          )}

          {!carregando && (
            <form className="form" onSubmit={handleSubmit}>
              <fieldset className="form-section">
                <legend>Dados do negócio</legend>

                <label>
                  Nome do negócio
                  <input
                    onChange={(event) =>
                      atualizarCampo('nome', event.target.value)
                    }
                    required
                    type="text"
                    value={form.nome}
                  />
                </label>

                <label>
                  Descrição
                  <textarea
                    onChange={(event) =>
                      atualizarCampo('descricao', event.target.value)
                    }
                    rows="4"
                    value={form.descricao}
                  />
                </label>

                <div className="form-grid">
                  <label>
                    Telefone
                    <input
                      inputMode="tel"
                      onChange={(event) =>
                        atualizarCampo('telefone', event.target.value)
                      }
                      type="tel"
                      value={form.telefone}
                    />
                  </label>

                  <label>
                    Cidade
                    <input
                      onChange={(event) =>
                        atualizarCampo('cidade', event.target.value)
                      }
                      type="text"
                      value={form.cidade}
                    />
                  </label>
                </div>

                <label>
                  Endereço
                  <input
                    onChange={(event) =>
                      atualizarCampo('endereco', event.target.value)
                    }
                    type="text"
                    value={form.endereco}
                  />
                </label>
              </fieldset>

              <fieldset className="form-section">
                <legend>Horários</legend>

                <div className="form-grid">
                  <label>
                    Horário de abertura
                    <input
                      onChange={(event) =>
                        atualizarCampo('horario_abertura', event.target.value)
                      }
                      required
                      type="time"
                      value={form.horario_abertura}
                    />
                  </label>

                  <label>
                    Horário de fechamento
                    <input
                      onChange={(event) =>
                        atualizarCampo('horario_fechamento', event.target.value)
                      }
                      required
                      type="time"
                      value={form.horario_fechamento}
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="form-section">
                <legend>Dias de funcionamento</legend>
                <div className="day-selector">
                  {DIAS_SEMANA.map((dia) => (
                    <label className="day-pill" key={dia.valor}>
                      <input
                        checked={form.dias_funcionamento.includes(dia.valor)}
                        onChange={() => alternarDia(dia.valor)}
                        type="checkbox"
                      />
                      <span>{dia.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <button
                className="button button-primary"
                disabled={salvando}
                type="submit"
              >
                {salvando ? 'Salvando...' : 'Salvar negócio'}
              </button>
            </form>
          )}
        </div>

        <aside className="dashboard-panel management-summary">
          <span className="summary-icon" aria-hidden="true">
            <Store size={24} strokeWidth={2} />
          </span>
          <h2>Status do negócio</h2>
          <p className="panel-text">
            {negocio
              ? 'Seu negócio já está configurado para receber agendamentos.'
              : 'Cadastre seu negócio para liberar serviços, profissionais e agenda.'}
          </p>

          {negocio && (
            <dl className="details-list compact-details">
              <div>
                <dt>Nome</dt>
                <dd>{negocio.nome}</dd>
              </div>
              <div>
                <dt>Link público</dt>
                <dd>
                  <div className="public-link-box">
                    <span className="public-link-text">{linkPublico}</span>
                    <button
                      className="button button-primary button-small"
                      onClick={copiarLinkPublico}
                      type="button"
                    >
                      Copiar link
                    </button>
                  </div>
                  {feedbackLink && (
                    <p
                      aria-live="polite"
                      className={`copy-feedback ${
                        feedbackLink.startsWith('Não') ? 'is-error' : ''
                      }`}
                    >
                      {feedbackLink}
                    </p>
                  )}
                </dd>
              </div>
              <div>
                <dt>Cidade</dt>
                <dd>{negocio.cidade || 'Não informada'}</dd>
              </div>
            </dl>
          )}
        </aside>
      </section>
    </DashboardShell>
  );
}

export default Negocio;
