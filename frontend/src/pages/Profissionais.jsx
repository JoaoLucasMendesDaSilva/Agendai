import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import { useAuth } from '../contexts/AuthContext';
import {
  atualizarProfissional,
  criarProfissional,
  desativarProfissional,
  listarProfissionais,
} from '../services/profissionaisService';

const FORM_INICIAL = {
  nome: '',
  especialidade: '',
  telefone: '',
  email: '',
};

function montarForm(profissional) {
  if (!profissional) {
    return FORM_INICIAL;
  }

  return {
    nome: profissional.nome || '',
    especialidade: profissional.especialidade || '',
    telefone: profissional.telefone || '',
    email: profissional.email || '',
  };
}

function montarPayload(form) {
  return {
    nome: form.nome,
    especialidade: form.especialidade,
    telefone: form.telefone,
    email: form.email,
  };
}

function normalizarMensagem(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function Profissionais({ navigate }) {
  const { logout, usuario } = useAuth();
  const [profissionais, setProfissionais] = useState([]);
  const [profissionalEditando, setProfissionalEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const erroNormalizado = normalizarMensagem(erro);
  const precisaCadastrarNegocio =
    erroNormalizado.includes('cadastre um negocio') ||
    erroNormalizado.includes('cadastre um neg');

  async function carregarProfissionais() {
    setCarregando(true);
    setErro('');

    try {
      const resposta = await listarProfissionais();
      setProfissionais(resposta.profissionais || []);
    } catch (err) {
      setErro(err.message);
      setProfissionais([]);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarProfissionais();
  }, []);

  function atualizarCampo(campo, valor) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function iniciarEdicao(profissional) {
    setProfissionalEditando(profissional);
    setForm(montarForm(profissional));
    setErro('');
    setSucesso('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelarEdicao() {
    setProfissionalEditando(null);
    setForm(FORM_INICIAL);
    setErro('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setSucesso('');
    setSalvando(true);

    try {
      const payload = montarPayload(form);
      const editando = Boolean(profissionalEditando);

      if (editando) {
        await atualizarProfissional(profissionalEditando.id, payload);
      } else {
        await criarProfissional(payload);
      }

      setSucesso(
        editando
          ? 'Profissional atualizado. Os novos dados já estão disponíveis.'
          : 'Profissional criado. Ele já pode receber agendamentos.',
      );
      setProfissionalEditando(null);
      setForm(FORM_INICIAL);
      await carregarProfissionais();
    } catch (err) {
      setErro(
        err.message ||
          'Não foi possível salvar o profissional. Tente novamente.',
      );
    } finally {
      setSalvando(false);
    }
  }

  async function handleDesativar(profissional) {
    const confirmado = window.confirm(
      `Deseja desativar o profissional "${profissional.nome}"?`
    );

    if (!confirmado) {
      return;
    }

    setErro('');
    setSucesso('');

    try {
      await desativarProfissional(profissional.id);
      setSucesso(
        'Profissional desativado. Ele não aparecerá em novos agendamentos.',
      );

      if (profissionalEditando?.id === profissional.id) {
        cancelarEdicao();
      }

      await carregarProfissionais();
    } catch (err) {
      setErro(err.message);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <DashboardShell
      currentPath="/profissionais"
      navigate={navigate}
      onLogout={handleLogout}
      usuario={usuario}
    >
      <header className="page-title">
        <div>
          <p className="eyebrow">Painel do empreendedor</p>
          <h1>Profissionais</h1>
          <p className="panel-text">
            Gerencie quem atende os agendamentos do seu negócio.
          </p>
        </div>
      </header>

      <section className="management-grid">
        <div className="dashboard-panel management-form-card">
          <div className="panel-heading">
            <div>
              <h2 id="profissionais-form-title">
                {profissionalEditando ? 'Editar profissional' : 'Novo profissional'}
              </h2>
              <p className="panel-text">
                Cadastre quem poderá atender os agendamentos do negócio.
              </p>
            </div>
          </div>

          {carregando && (
            <p className="message message-info" aria-live="polite">
              Carregando profissionais...
            </p>
          )}

          {!carregando && erro && <p className="message message-error">{erro}</p>}
          {!carregando && sucesso && (
            <p className="message message-success">{sucesso}</p>
          )}

          {!carregando && precisaCadastrarNegocio && (
            <div className="dashboard-empty">
              <span className="empty-icon" aria-hidden="true">
                <Users size={24} strokeWidth={2} />
              </span>
              <div>
                <strong>Cadastre o negócio primeiro</strong>
                <p>Depois disso, você poderá adicionar profissionais.</p>
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

          {!carregando && !precisaCadastrarNegocio && (
            <form className="form" onSubmit={handleSubmit}>
              <label>
                Nome do profissional
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
                Especialidade
                <input
                  onChange={(event) =>
                    atualizarCampo('especialidade', event.target.value)
                  }
                  type="text"
                  value={form.especialidade}
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
                  E-mail
                  <input
                    inputMode="email"
                    onChange={(event) =>
                      atualizarCampo('email', event.target.value)
                    }
                    type="email"
                    value={form.email}
                  />
                </label>
              </div>

              <div className="button-row">
                <button
                  className="button button-primary"
                  disabled={salvando}
                  type="submit"
                >
                  {salvando ? 'Salvando...' : 'Salvar profissional'}
                </button>

                {profissionalEditando && (
                  <button
                    className="button button-secondary"
                    onClick={cancelarEdicao}
                    type="button"
                  >
                    Cancelar edição
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        <div className="dashboard-panel management-list-card">
          <div className="panel-heading">
            <div>
              <h2 id="profissionais-list-title">Profissionais cadastrados</h2>
              <p className="panel-text">
                Profissionais ativos ficam disponíveis no agendamento público.
              </p>
            </div>
          </div>

          {!carregando &&
            !precisaCadastrarNegocio &&
            profissionais.length === 0 && (
              <div className="dashboard-empty">
                <span className="empty-icon" aria-hidden="true">
                  <Users size={24} strokeWidth={2} />
                </span>
                <div>
                  <strong>Você ainda não cadastrou nenhum profissional</strong>
                  <p>
                    Cadastre o primeiro profissional para disponibilizar
                    horários aos clientes.
                  </p>
                </div>
              </div>
            )}

          <div className="entity-list">
            {profissionais.map((profissional) => (
              <article className="entity-card professional-card" key={profissional.id}>
                <div className="entity-card-header">
                  <div className="professional-title">
                    <span className="entity-avatar" aria-hidden="true">
                      {profissional.nome?.charAt(0)?.toUpperCase() || 'P'}
                    </span>
                    <div>
                      <h3>{profissional.nome}</h3>
                      <p>{profissional.especialidade || 'Sem especialidade informada.'}</p>
                    </div>
                  </div>
                  <span className="status-badge status-confirmado">Ativo</span>
                </div>

                <dl className="meta-list">
                  <div>
                    <dt>Telefone</dt>
                    <dd>{profissional.telefone || 'Não informado'}</dd>
                  </div>
                  <div>
                    <dt>E-mail</dt>
                    <dd>{profissional.email || 'Não informado'}</dd>
                  </div>
                </dl>

                <div className="entity-actions">
                  <button
                    className="button button-secondary button-small"
                    onClick={() => iniciarEdicao(profissional)}
                    type="button"
                  >
                    Editar
                  </button>
                  <button
                    className="button button-danger button-small"
                    onClick={() => handleDesativar(profissional)}
                    type="button"
                  >
                    Desativar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}

export default Profissionais;
