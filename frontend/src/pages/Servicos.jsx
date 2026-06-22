import { useEffect, useState } from 'react';
import { Scissors } from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import { useAuth } from '../contexts/AuthContext';
import {
  atualizarServico,
  criarServico,
  desativarServico,
  listarServicos,
} from '../services/servicosService';

const FORM_INICIAL = {
  nome: '',
  descricao: '',
  duracao_minutos: '30',
  preco: '0.00',
};

function montarForm(servico) {
  if (!servico) {
    return FORM_INICIAL;
  }

  return {
    nome: servico.nome || '',
    descricao: servico.descricao || '',
    duracao_minutos: String(servico.duracao_minutos || ''),
    preco: Number(servico.preco || 0).toFixed(2),
  };
}

function montarPayload(form) {
  return {
    nome: form.nome,
    descricao: form.descricao,
    duracao_minutos: Number(form.duracao_minutos),
    preco: Number(form.preco),
  };
}

function formatarPreco(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    currency: 'BRL',
    style: 'currency',
  });
}

function normalizarMensagem(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function Servicos({ navigate }) {
  const { logout, usuario } = useAuth();
  const [servicos, setServicos] = useState([]);
  const [servicoEditando, setServicoEditando] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const erroNormalizado = normalizarMensagem(erro);
  const precisaCadastrarNegocio =
    erroNormalizado.includes('cadastre um negocio') ||
    erroNormalizado.includes('cadastre um neg');

  async function carregarServicos() {
    setCarregando(true);
    setErro('');

    try {
      const resposta = await listarServicos();
      setServicos(resposta.servicos || []);
    } catch (err) {
      setErro(err.message);
      setServicos([]);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarServicos();
  }, []);

  function atualizarCampo(campo, valor) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function iniciarEdicao(servico) {
    setServicoEditando(servico);
    setForm(montarForm(servico));
    setErro('');
    setSucesso('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelarEdicao() {
    setServicoEditando(null);
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
      const editando = Boolean(servicoEditando);

      if (editando) {
        await atualizarServico(servicoEditando.id, payload);
      } else {
        await criarServico(payload);
      }

      setSucesso(
        editando
          ? 'Serviço atualizado. As alterações já estão disponíveis.'
          : 'Serviço criado. Ele já aparece no agendamento público.',
      );
      setServicoEditando(null);
      setForm(FORM_INICIAL);
      await carregarServicos();
    } catch (err) {
      setErro(
        err.message || 'Não foi possível salvar o serviço. Tente novamente.',
      );
    } finally {
      setSalvando(false);
    }
  }

  async function handleDesativar(servico) {
    const confirmado = window.confirm(
      `Deseja desativar o serviço "${servico.nome}"?`
    );

    if (!confirmado) {
      return;
    }

    setErro('');
    setSucesso('');

    try {
      await desativarServico(servico.id);
      setSucesso(
        'Serviço desativado. Ele não aparecerá em novos agendamentos.',
      );

      if (servicoEditando?.id === servico.id) {
        cancelarEdicao();
      }

      await carregarServicos();
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
      currentPath="/servicos"
      navigate={navigate}
      onLogout={handleLogout}
      usuario={usuario}
    >
      <header className="page-title">
        <div>
          <p className="eyebrow">Painel do empreendedor</p>
          <h1>Serviços</h1>
          <p className="panel-text">
            Organize os serviços disponíveis para agendamento.
          </p>
        </div>
      </header>

      <section className="management-grid">
        <div className="dashboard-panel management-form-card">
          <div className="panel-heading">
            <div>
              <h2 id="servicos-form-title">
                {servicoEditando ? 'Editar serviço' : 'Novo serviço'}
              </h2>
              <p className="panel-text">
                Cadastre os serviços que seus clientes poderão agendar.
              </p>
            </div>
          </div>

          {carregando && (
            <p className="message message-info" aria-live="polite">
              Carregando serviços...
            </p>
          )}

          {!carregando && erro && <p className="message message-error">{erro}</p>}
          {!carregando && sucesso && (
            <p className="message message-success">{sucesso}</p>
          )}

          {!carregando && precisaCadastrarNegocio && (
            <div className="dashboard-empty">
              <span className="empty-icon" aria-hidden="true">
                <Scissors size={24} strokeWidth={2} />
              </span>
              <div>
                <strong>Cadastre o negócio primeiro</strong>
                <p>Depois disso, você poderá adicionar serviços.</p>
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
                Nome do serviço
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
                  rows="3"
                  value={form.descricao}
                />
              </label>

              <div className="form-grid">
                <label>
                  Duração em minutos
                  <input
                    min="1"
                    onChange={(event) =>
                      atualizarCampo('duracao_minutos', event.target.value)
                    }
                    required
                    type="number"
                    value={form.duracao_minutos}
                  />
                </label>

                <label>
                  Preço
                  <input
                    min="0"
                    onChange={(event) =>
                      atualizarCampo('preco', event.target.value)
                    }
                    required
                    step="0.01"
                    type="number"
                    value={form.preco}
                  />
                </label>
              </div>

              <div className="button-row">
                <button
                  className="button button-primary"
                  disabled={salvando}
                  type="submit"
                >
                  {salvando ? 'Salvando...' : 'Salvar serviço'}
                </button>

                {servicoEditando && (
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
              <h2 id="servicos-list-title">Serviços cadastrados</h2>
              <p className="panel-text">
                Serviços ativos aparecem no fluxo público de agendamento.
              </p>
            </div>
          </div>

          {!carregando && !precisaCadastrarNegocio && servicos.length === 0 && (
            <div className="dashboard-empty">
              <span className="empty-icon" aria-hidden="true">
                <Scissors size={24} strokeWidth={2} />
              </span>
              <div>
                <strong>Você ainda não cadastrou nenhum serviço</strong>
                <p>
                  Cadastre seu primeiro serviço para começar a receber
                  agendamentos.
                </p>
              </div>
            </div>
          )}

          <div className="entity-list">
            {servicos.map((servico) => (
              <article className="entity-card" key={servico.id}>
                <div className="entity-card-header">
                  <div>
                    <h3>{servico.nome}</h3>
                    <p>{servico.descricao || 'Sem descrição informada.'}</p>
                  </div>
                  <span className="status-badge status-confirmado">Ativo</span>
                </div>

                <dl className="meta-list">
                  <div>
                    <dt>Duração</dt>
                    <dd>{servico.duracao_minutos} min</dd>
                  </div>
                  <div>
                    <dt>Preço</dt>
                    <dd>{formatarPreco(servico.preco)}</dd>
                  </div>
                </dl>

                <div className="entity-actions">
                  <button
                    className="button button-secondary button-small"
                    onClick={() => iniciarEdicao(servico)}
                    type="button"
                  >
                    Editar
                  </button>
                  <button
                    className="button button-danger button-small"
                    onClick={() => handleDesativar(servico)}
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

export default Servicos;
