import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  ImageUp,
  MapPin,
  MessageCircle,
  Store,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import DashboardShell from '../components/DashboardShell';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import {
  atualizarIdentidadeVisual,
  atualizarNegocio,
  buscarNegocio,
  criarNegocio,
} from '../services/negocioService';
import { resolverAssetUrl } from '../services/api';

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

function BrandUploadField({ label, limite, onChange, preview, tipo }) {
  const inputId = `identidade-visual-${tipo}`;

  return (
    <div className="brand-upload-field">
      <span>{label}</span>
      <small>PNG, JPG ou WEBP. Máximo de {limite} MB.</small>
      <input
        accept="image/png,image/jpeg,image/webp"
        className="brand-upload-input"
        id={inputId}
        onChange={(event) => onChange(tipo, event.target.files?.[0])}
        type="file"
      />
      <label
        aria-label={`Selecionar ${label.toLowerCase()}`}
        className={`brand-preview brand-preview-${tipo}`}
        htmlFor={inputId}
      >
        {preview ? (
          <img src={preview} alt={`Preview ${label.toLowerCase()}`} />
        ) : (
          <ImageUp aria-hidden="true" size={28} strokeWidth={2} />
        )}
      </label>
    </div>
  );
}

function Negocio({ navigate }) {
  const { logout, usuario } = useAuth();
  const qrCodeRef = useRef(null);
  const [negocio, setNegocio] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [feedbackLink, setFeedbackLink] = useState('');
  const [arquivosMarca, setArquivosMarca] = useState({
    logo: null,
    banner: null,
  });
  const [previewsMarca, setPreviewsMarca] = useState({
    logo: '',
    banner: '',
  });
  const [enviandoMarca, setEnviandoMarca] = useState(false);
  const possuiImagemPendente = Boolean(
    arquivosMarca.logo || arquivosMarca.banner,
  );
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
          setPreviewsMarca({
            logo: resolverAssetUrl(resposta.negocio?.logo_url),
            banner: resolverAssetUrl(resposta.negocio?.banner_url),
          });
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

  function selecionarImagem(tipo, arquivo) {
    setErro('');
    setSucesso('');

    if (!arquivo) {
      return;
    }

    const tiposPermitidos = ['image/png', 'image/jpeg', 'image/webp'];
    const limite = tipo === 'logo' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;

    if (!tiposPermitidos.includes(arquivo.type)) {
      setErro('Use uma imagem PNG, JPG, JPEG ou WEBP.');
      return;
    }

    if (arquivo.size > limite) {
      setErro(
        tipo === 'logo'
          ? 'A logo deve ter no máximo 5 MB.'
          : 'O banner deve ter no máximo 10 MB.',
      );
      return;
    }

    setArquivosMarca((atual) => ({ ...atual, [tipo]: arquivo }));
    setPreviewsMarca((atual) => {
      if (atual[tipo]?.startsWith('blob:')) {
        URL.revokeObjectURL(atual[tipo]);
      }

      return {
        ...atual,
        [tipo]: URL.createObjectURL(arquivo),
      };
    });
  }

  async function salvarIdentidadeVisual(event) {
    event.preventDefault();

    if (!negocio || (!arquivosMarca.logo && !arquivosMarca.banner)) {
      return;
    }

    setErro('');
    setSucesso('');
    setEnviandoMarca(true);

    try {
      const resposta = await atualizarIdentidadeVisual(
        negocio.id,
        arquivosMarca,
      );

      Object.values(previewsMarca).forEach((preview) => {
        if (preview?.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
      });

      setNegocio(resposta.negocio);
      setArquivosMarca({ logo: null, banner: null });
      setPreviewsMarca({
        logo: resolverAssetUrl(resposta.negocio.logo_url),
        banner: resolverAssetUrl(resposta.negocio.banner_url),
      });
      setSucesso(
        'Identidade visual salva. A página pública já exibe as novas imagens.',
      );
      window.dispatchEvent(
        new CustomEvent('agendai:brand-updated', {
          detail: { logoUrl: resposta.negocio.logo_url },
        }),
      );
    } catch (err) {
      setErro('Não foi possível salvar a identidade visual.');
    } finally {
      setEnviandoMarca(false);
    }
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

    if (
      !Array.isArray(form.dias_funcionamento) ||
      form.dias_funcionamento.length === 0
    ) {
      setErro('Selecione ao menos um dia de funcionamento.');
      return;
    }

    setSalvando(true);

    try {
      const payload = montarPayload(form);
      const editando = Boolean(negocio);
      const resposta = editando
        ? await atualizarNegocio(negocio.id, payload)
        : await criarNegocio(payload);

      setNegocio(resposta.negocio);
      setForm(montarForm(resposta.negocio));
      setSucesso(
        editando
          ? 'Dados do negócio atualizados com sucesso.'
          : 'Negócio criado. Agora você pode cadastrar serviços e profissionais.',
      );
    } catch (err) {
      setErro(
        err.message ||
          'Não foi possível salvar os dados do negócio. Tente novamente.',
      );
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

  function compartilharWhatsApp() {
    if (!linkPublico) {
      return;
    }

    const mensagem = `Olá! Agende seu horário pelo nosso link: ${linkPublico}`;
    const urlWhatsApp = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
    window.open(urlWhatsApp, '_blank', 'noopener,noreferrer');
  }

  function baixarQrCode() {
    if (!linkPublico || !qrCodeRef.current) {
      return;
    }

    const canvas = qrCodeRef.current.querySelector('canvas');

    if (!canvas) {
      return;
    }

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `qr-code-${negocio?.slug_publico || 'agendai'}.png`;
    link.click();
  }

  return (
    <DashboardShell
      currentPath="/negocio"
      navigate={navigate}
      onLogout={handleLogout}
      usuario={usuario}
    >
      <PageHeader
        title="Meu negócio"
        description="Configure a identidade, os horários e a experiência pública do seu negócio."
        actions={
          negocio?.slug_publico ? (
            <button
              className="button button-secondary button-small"
              onClick={() => navigate(`/agendar/${negocio.slug_publico}`)}
              type="button"
            >
              <ExternalLink aria-hidden="true" size={17} /> Ver página pública
            </button>
          ) : null
        }
      />

      <section className="management-sync-strip business-sync-strip" aria-label="Status da página pública">
        <span className="management-sync-icon" aria-hidden="true">
          {!carregando && negocio ? <CheckCircle2 size={19} /> : <Store size={19} />}
        </span>
        <div>
          <strong>{carregando ? 'Carregando configuração' : negocio ? 'Página pública configurada' : 'Configuração inicial pendente'}</strong>
          <p>{carregando ? 'Consultando os dados atuais do negócio.' : negocio ? 'Dados e identidade são sincronizados com o agendamento público.' : 'Preencha os dados abaixo para liberar o catálogo e a agenda.'}</p>
        </div>
        <span className={`status-badge ${carregando ? 'status-pendente' : negocio ? 'status-confirmado' : 'status-pendente'}`}>
          {carregando ? 'Atualizando' : negocio ? 'Ativo' : 'Pendente'}
        </span>
      </section>

      <section className="management-grid business-management-grid" aria-labelledby="negocio-title">
        <div className="dashboard-panel management-form-card business-form-panel">
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
            <>
              <form className="form business-data-form" onSubmit={handleSubmit}>
              <fieldset className="form-section">
                <legend>Informações do negócio</legend>

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

              <form className="brand-form" onSubmit={salvarIdentidadeVisual}>
                <fieldset className="form-section">
                  <legend>Identidade visual</legend>
                  <p className="panel-text">
                    Personalize sua página pública com a logo e a capa do seu negócio.
                  </p>
                  {!negocio ? (
                    <p className="message message-info">
                      Salve os dados do negócio antes de enviar as imagens.
                    </p>
                  ) : (
                    <div className="brand-upload-grid">
                      <BrandUploadField label="Logo" limite="5" onChange={selecionarImagem} preview={previewsMarca.logo} tipo="logo" />
                      <BrandUploadField label="Banner ou capa" limite="10" onChange={selecionarImagem} preview={previewsMarca.banner} tipo="banner" />
                    </div>
                  )}
                </fieldset>
                {possuiImagemPendente && (
                  <p className="message message-info" aria-live="polite">
                    Imagem selecionada. Clique em salvar para aplicar.
                  </p>
                )}
                {negocio && (
                  <button
                    className="button button-secondary"
                    disabled={enviandoMarca || !possuiImagemPendente}
                    type="submit"
                  >
                    {enviandoMarca ? 'Salvando...' : 'Salvar identidade visual'}
                  </button>
                )}
              </form>
            </>
          )}
        </div>

        <aside className="dashboard-panel management-summary business-public-panel">
          <div className="business-public-heading">
            <span className="summary-icon" aria-hidden="true">
              <ExternalLink size={22} strokeWidth={2} />
            </span>
            <div>
              <h2>Sua página pública</h2>
              {negocio && <span className="status-badge status-confirmado">Online</span>}
            </div>
          </div>
          <p className="panel-text">
            {negocio
              ? 'Compartilhe o link ou QR Code para receber agendamentos.'
              : 'Cadastre seu negócio para liberar serviços, profissionais e agenda.'}
          </p>

          {negocio && (
            <dl className="details-list compact-details">
              <div>
                <dt>Nome</dt>
                <dd>{negocio.nome}</dd>
              </div>
              <div>
                <dt><MapPin aria-hidden="true" size={14} /> Localização</dt>
                <dd>{negocio.cidade || 'Não informada'}</dd>
              </div>
              <div>
                <dt>Link público</dt>
                <dd>
                  <div className="public-link-box">
                    <span className="public-link-text">{linkPublico}</span>
                    <div className="public-link-actions">
                      <button
                        className="button button-primary button-small"
                        onClick={copiarLinkPublico}
                        type="button"
                      >
                        <Copy aria-hidden="true" size={15} /> Copiar link
                      </button>
                      <button
                        className="button button-secondary button-small whatsapp-share-button"
                        onClick={compartilharWhatsApp}
                        type="button"
                      >
                        <MessageCircle
                          aria-hidden="true"
                          size={16}
                          strokeWidth={2}
                        />
                        Compartilhar no WhatsApp
                      </button>
                    </div>
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
                <dt>QR Code</dt>
                <dd>
                  <div className="qr-code-box">
                    <div
                      aria-label="QR Code do link publico"
                      className="qr-code-frame"
                      ref={qrCodeRef}
                    >
                      <QRCodeCanvas
                        value={linkPublico}
                        size={180}
                        level="M"
                        includeMargin
                      />
                    </div>
                    <p className="panel-text">
                      Compartilhe este QR Code com seus clientes para que eles
                      acessem sua p&aacute;gina de agendamento.
                    </p>
                    <button
                      className="button button-secondary button-small qr-code-download"
                      onClick={baixarQrCode}
                      type="button"
                    >
                      <Download size={16} strokeWidth={2} />
                      Baixar QR Code
                    </button>
                  </div>
                </dd>
              </div>
            </dl>
          )}
        </aside>
      </section>
    </DashboardShell>
  );
}

export default Negocio;
