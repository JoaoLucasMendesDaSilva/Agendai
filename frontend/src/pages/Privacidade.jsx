import { useEffect, useState } from 'react';
import BrandLogo from '../components/BrandLogo';
import { criarSolicitacaoPrivacidade } from '../services/privacidadeService';
import { buscarNegocioPublico } from '../services/publicoService';

const TIPOS = [
  ['acesso', 'Confirmacao ou acesso aos dados'],
  ['correcao', 'Correcao de dados incompletos ou desatualizados'],
  ['eliminacao', 'Eliminacao ou anonimização de dados'],
  ['portabilidade', 'Portabilidade'],
  ['informacao', 'Informacoes sobre o tratamento'],
  ['revogacao', 'Revogacao de consentimento'],
  ['oposicao', 'Oposicao ao tratamento'],
];

function obterNegocioId() {
  const valor = new URLSearchParams(window.location.search).get('negocio');
  return /^\d+$/.test(valor || '') ? valor : '';
}

function Privacidade() {
  const negocioId = obterNegocioId();
  const [form, setForm] = useState({
    nome: '', email: '', tipo: 'acesso', mensagem: '', negocio_id: negocioId,
  });
  const [negocio, setNegocio] = useState(null);
  const [erroNegocio, setErroNegocio] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!negocioId) return undefined;

    let ativo = true;
    buscarNegocioPublico(negocioId)
      .then((resposta) => {
        if (ativo) setNegocio(resposta.negocio || resposta);
      })
      .catch(() => {
        if (ativo) {
          setErroNegocio(
            'Nao foi possivel identificar o negocio. Use o formulario para falar com o Agendai.'
          );
        }
      });

    return () => {
      ativo = false;
    };
  }, [negocioId]);

  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function enviar(event) {
    event.preventDefault();
    setErro('');
    setSucesso('');
    setEnviando(true);
    try {
      await criarSolicitacaoPrivacidade({
        ...form,
        negocio_id: form.negocio_id || undefined,
        mensagem: form.mensagem || undefined,
      });
      setSucesso('Solicitacao enviada. Responderemos pelo e-mail informado apos validar sua identidade.');
      setForm((atual) => ({ ...atual, mensagem: '' }));
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="legal-page page">
      <header className="legal-header">
        <a href="/" aria-label="Ir para o inicio"><BrandLogo /></a>
        <a href="/termos">Termos de Uso</a>
      </header>
      <article className="legal-content">
        <p className="eyebrow">Ultima atualizacao: 24 de agosto de 2026</p>
        <h1>Politica de Privacidade</h1>
        <p>Esta politica explica como o Agendai trata dados pessoais para disponibilizar a plataforma de agendamento.</p>

        <h2>Quem trata os dados</h2>
        {negocio?.contato_privacidade && (
          <p>
            <strong>{negocio.nome}</strong> e o controlador dos dados
            relacionados a este agendamento. O contato indicado para
            privacidade e{' '}
            <a href={`mailto:${negocio.contato_privacidade}`}>
              {negocio.contato_privacidade}
            </a>
            . O Agendai fornece a infraestrutura da plataforma e atua como
            operador nesses tratamentos.
          </p>
        )}
        {erroNegocio && (
          <p className="message message-error" role="status">
            {erroNegocio}
          </p>
        )}
        <p>O negocio que disponibiliza a pagina publica e o controlador dos dados de seus clientes, pois define o atendimento e as finalidades relacionadas a ele. O Agendai fornece a infraestrutura da plataforma e atua como operador nesses tratamentos. Para dados da conta do empreendedor e solicitações enviadas por este canal, o Agendai atua como controlador.</p>

        <h2>Dados, finalidades e bases legais</h2>
        <p>Tratamos nome, telefone, e-mail opcional, data e horario, serviço, profissional e observações do agendamento para viabilizar, administrar e comprovar o atendimento. Para a conta do empreendedor, tratamos nome, e-mail, telefone opcional e senha protegida para criar e manter o acesso. As bases legais aplicáveis são a execução de contrato ou de procedimentos preliminares, o cumprimento de obrigação legal ou regulatória quando exigido e o legítimo interesse para segurança, prevenção a fraude e melhoria controlada do serviço.</p>
        <p>Não envie dados de saúde, religião, biometria ou outros dados pessoais sensíveis no campo de observações. Esse campo não é necessário para reservar um horário.</p>

        <h2>Compartilhamento e segurança</h2>
        <p>Os dados de um agendamento são acessíveis ao negócio escolhido e aos fornecedores de infraestrutura necessários para operar a plataforma, atualmente hospedagem, banco de dados e entrega do frontend. O acesso é limitado ao necessário, com autenticação, isolamento por negócio, conexões protegidas e controle de privilégios. Transferências internacionais dependem da infraestrutura contratada e devem observar as garantias aplicáveis.</p>

        <h2>Retencao</h2>
        <p>Agendamentos cancelados ou concluídos são anonimizados após 730 dias, salvo necessidade de conservação por obrigação legal, exercício regular de direitos ou outra hipótese prevista em lei. Solicitações LGPD concluídas são eliminadas após 1.825 dias. Dados ainda necessários para o atendimento não são removidos até a análise do pedido.</p>

        <h2>Seus direitos</h2>
        <p>Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informações sobre compartilhamento, revogação de consentimento e oposição nas hipóteses legais. Para proteger sua conta e evitar fraude, confirmamos a identidade antes de atender pedidos que revelem, alterem ou eliminem dados.</p>

        <h2>Canal LGPD</h2>
        <p>Use o formulário abaixo. Para um agendamento, informe o negócio quando possível. Não inclua senha, token de gerenciamento ou dados sensíveis na mensagem.</p>
        <form className="form legal-request-form" onSubmit={enviar}>
          <div className="form-grid">
            <label>Nome<input autoComplete="name" required value={form.nome} onChange={(event) => atualizar('nome', event.target.value)} /></label>
            <label>E-mail<input autoComplete="email" inputMode="email" required type="email" value={form.email} onChange={(event) => atualizar('email', event.target.value)} /></label>
          </div>
          <label>Tipo de solicitacao<select value={form.tipo} onChange={(event) => atualizar('tipo', event.target.value)}>{TIPOS.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}</select></label>
          <label>Identificador do negocio <span className="booking-optional">(opcional)</span><input inputMode="numeric" value={form.negocio_id} onChange={(event) => atualizar('negocio_id', event.target.value)} /></label>
          <label>Mensagem <span className="booking-optional">(opcional)</span><textarea maxLength="2000" rows="5" value={form.mensagem} onChange={(event) => atualizar('mensagem', event.target.value)} /></label>
          {erro && <p className="message message-error" role="alert">{erro}</p>}
          {sucesso && <p className="message message-success" role="status">{sucesso}</p>}
          <button className="button button-primary" disabled={enviando} type="submit">{enviando ? 'Enviando...' : 'Enviar solicitacao'}</button>
        </form>
      </article>
    </main>
  );
}

export default Privacidade;
