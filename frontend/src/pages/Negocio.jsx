import { useEffect, useState } from 'react';
import {
  atualizarNegocio,
  buscarNegocio,
  criarNegocio,
} from '../services/negocioService';

const DIAS_SEMANA = [
  { valor: 0, label: 'Domingo' },
  { valor: 1, label: 'Segunda' },
  { valor: 2, label: 'Terca' },
  { valor: 3, label: 'Quarta' },
  { valor: 4, label: 'Quinta' },
  { valor: 5, label: 'Sexta' },
  { valor: 6, label: 'Sabado' },
];

const FORM_INICIAL = {
  nome: '',
  descricao: '',
  telefone: '',
  endereco: '',
  cidade: 'Cubatao',
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

function Negocio({ navigate }) {
  const [negocio, setNegocio] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

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
      setSucesso(resposta.mensagem || 'Negocio salvo com sucesso.');
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="page dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Painel do empreendedor</p>
          <h1>Meu negocio</h1>
        </div>

        <button
          className="button button-secondary"
          onClick={() => navigate('/dashboard')}
          type="button"
        >
          Voltar
        </button>
      </header>

      <section className="dashboard-panel" aria-labelledby="negocio-title">
        <h2 id="negocio-title">
          {negocio ? 'Editar dados do negocio' : 'Cadastrar negocio'}
        </h2>
        <p className="panel-text">
          Informe os dados basicos que serao usados no agendamento.
        </p>

        {carregando && (
          <p className="message message-info" aria-live="polite">
            Carregando negocio...
          </p>
        )}

        {!carregando && erro && <p className="message message-error">{erro}</p>}
        {!carregando && sucesso && (
          <p className="message message-success">{sucesso}</p>
        )}

        {!carregando && negocio && (
          <div className="summary-box" aria-label="Dados atuais do negocio">
            <p>
              <strong>Nome:</strong> {negocio.nome}
            </p>
            <p>
              <strong>Link publico:</strong> {negocio.slug_publico}
            </p>
          </div>
        )}

        {!carregando && (
          <form className="form" onSubmit={handleSubmit}>
            <label>
              Nome do negocio
              <input
                onChange={(event) => atualizarCampo('nome', event.target.value)}
                required
                type="text"
                value={form.nome}
              />
            </label>

            <label>
              Descricao
              <textarea
                onChange={(event) =>
                  atualizarCampo('descricao', event.target.value)
                }
                rows="4"
                value={form.descricao}
              />
            </label>

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
              Endereco
              <input
                onChange={(event) =>
                  atualizarCampo('endereco', event.target.value)
                }
                type="text"
                value={form.endereco}
              />
            </label>

            <label>
              Cidade
              <input
                onChange={(event) => atualizarCampo('cidade', event.target.value)}
                type="text"
                value={form.cidade}
              />
            </label>

            <div className="form-grid">
              <label>
                Abertura
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
                Fechamento
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

            <fieldset className="checkbox-group">
              <legend>Dias de funcionamento</legend>

              {DIAS_SEMANA.map((dia) => (
                <label className="checkbox-label" key={dia.valor}>
                  <input
                    checked={form.dias_funcionamento.includes(dia.valor)}
                    onChange={() => alternarDia(dia.valor)}
                    type="checkbox"
                  />
                  {dia.label}
                </label>
              ))}
            </fieldset>

            <button className="button button-primary" disabled={salvando} type="submit">
              {salvando ? 'Salvando...' : 'Salvar negocio'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export default Negocio;
