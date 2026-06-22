import { useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  MessageCircle,
  Moon,
  QrCode,
  Scissors,
  Smartphone,
  Stethoscope,
  Store,
  Users,
} from 'lucide-react';
import authIllustration from '../assets/auth-illustration.png';
import BrandLogo from '../components/BrandLogo';

const funcionalidades = [
  {
    titulo: 'Agendamento online',
    texto: 'O cliente escolhe serviço, profissional, data e horário sem precisar criar uma conta.',
    Icone: CalendarCheck2,
    tom: 'green',
  },
  {
    titulo: 'QR Code',
    texto: 'Leve sua agenda para o balcão, cartão, vitrine ou qualquer material de divulgação.',
    Icone: QrCode,
    tom: 'yellow',
  },
  {
    titulo: 'WhatsApp',
    texto: 'Compartilhe o link público com uma mensagem pronta em poucos cliques.',
    Icone: MessageCircle,
    tom: 'green',
  },
  {
    titulo: 'Dashboard inteligente',
    texto: 'Acompanhe indicadores, próximo atendimento e o movimento da semana.',
    Icone: LayoutDashboard,
    tom: 'blue',
  },
  {
    titulo: 'Gestão de clientes',
    texto: 'Consulte histórico, recorrência, cancelamentos e serviços mais utilizados.',
    Icone: Users,
    tom: 'blue',
  },
  {
    titulo: 'PWA instalável',
    texto: 'Instale o Agendai no celular ou computador e acesse como um aplicativo.',
    Icone: Smartphone,
    tom: 'green',
  },
  {
    titulo: 'Relatórios em PDF',
    texto: 'Gere um resumo profissional do período com os dados reais do negócio.',
    Icone: FileText,
    tom: 'yellow',
  },
  {
    titulo: 'Exportação Excel',
    texto: 'Exporte os agendamentos em XLSX para analisar e organizar seus dados.',
    Icone: FileSpreadsheet,
    tom: 'blue',
  },
  {
    titulo: 'Dark Mode',
    texto: 'Use o painel com conforto em ambientes claros ou escuros.',
    Icone: Moon,
    tom: 'dark',
  },
];

const publicos = [
  {
    titulo: 'Barbearias',
    texto: 'Organize cortes, barba e equipe sem depender de conversas espalhadas.',
    Icone: Scissors,
  },
  {
    titulo: 'Salões',
    texto: 'Apresente serviços, profissionais e horários em uma página própria.',
    Icone: Store,
  },
  {
    titulo: 'Clínicas',
    texto: 'Centralize a agenda e acompanhe cada atendimento com mais clareza.',
    Icone: Stethoscope,
  },
  {
    titulo: 'Profissionais autônomos',
    texto: 'Tenha presença profissional e uma agenda simples de administrar.',
    Icone: BriefcaseBusiness,
  },
];

const passos = [
  ['Configure', 'Cadastre seu negócio, serviços, profissionais e horários.'],
  ['Compartilhe', 'Envie seu link público pelo WhatsApp ou divulgue o QR Code.'],
  ['Receba', 'O cliente escolhe uma opção disponível e confirma o agendamento.'],
  ['Acompanhe', 'Gerencie agenda, clientes e indicadores em um só painel.'],
];

const planos = [
  {
    nome: 'Gratuito',
    precoMensal: 'R$ 0,00',
    precoAnual: 'R$ 0,00/ano',
    descricao: 'Ideal para pequenos negócios que estão começando e querem organizar os primeiros agendamentos sem custo.',
    itens: ['Até 50 agendamentos por mês', '1 profissional', 'Lembretes por e-mail', 'Link público', 'QR Code', 'Agenda simples'],
  },
  {
    nome: 'Básico',
    precoMensal: 'R$ 19,90',
    precoAnual: 'R$ 179,00/ano',
    descricao: 'Para negócios que já possuem uma rotina de atendimentos e precisam de mais capacidade de agendamento.',
    itens: ['Até 200 agendamentos por mês', '1 profissional', 'Lembretes por e-mail', 'Gestão de serviços', 'Gestão de clientes', 'Relatórios simples'],
  },
  {
    nome: 'Profissional',
    precoMensal: 'R$ 39,90',
    precoAnual: 'R$ 359,00/ano',
    descricao: 'Para negócios que querem automatizar a comunicação, acompanhar resultados e crescer com mais controle.',
    itens: ['Agendamentos ilimitados', 'Até 5 profissionais', 'Lembretes por WhatsApp e e-mail', 'Relatórios', 'Personalização visual', 'Gestão de clientes recorrentes'],
    destaque: true,
  },
  {
    nome: 'Rede',
    precoMensal: 'R$ 99,90',
    precoAnual: 'R$ 899,00/ano',
    descricao: 'Para equipes, redes e negócios com mais de uma unidade que precisam de controle centralizado.',
    itens: ['Tudo do Plano Profissional', 'Múltiplas unidades', 'Painel centralizado', 'Suporte prioritário', 'Relatórios gerenciais'],
  },
];

const perguntas = [
  {
    pergunta: 'O cliente precisa criar uma conta para agendar?',
    resposta: 'Não. O cliente acessa o link público, escolhe serviço, profissional, data e horário sem precisar criar cadastro.',
  },
  {
    pergunta: 'Como evito dois agendamentos no mesmo horário?',
    resposta: 'O sistema valida os horários disponíveis e bloqueia conflitos automaticamente.',
  },
  {
    pergunta: 'Posso divulgar minha agenda pelo WhatsApp?',
    resposta: 'Sim. O Agendai gera um link público que pode ser compartilhado pelo WhatsApp, redes sociais, QR Code ou materiais impressos.',
  },
  {
    pergunta: 'O Agendai funciona no celular?',
    resposta: 'Sim. O sistema é responsivo e também pode ser instalado como PWA em celular ou desktop.',
  },
  {
    pergunta: 'Quais dados posso acompanhar?',
    resposta: 'Você acompanha agendamentos, clientes, serviços, profissionais, relatórios em PDF e exportação Excel.',
  },
];

function LandingPage({ navigate }) {
  const [perguntasAbertas, setPerguntasAbertas] = useState([]);

  function irParaCadastro() {
    navigate('/cadastro');
  }

  function irParaLogin() {
    navigate('/login');
  }

  function rolarPara(id) {
    const prefereReducaoMovimento = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    document.getElementById(id)?.scrollIntoView({
      behavior: prefereReducaoMovimento ? 'auto' : 'smooth',
    });
  }

  function alternarPergunta(indice) {
    setPerguntasAbertas((atuais) => (
      atuais.includes(indice)
        ? atuais.filter((item) => item !== indice)
        : [...atuais, indice]
    ));
  }

  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Navegação principal">
        <BrandLogo />
        <div className="landing-nav-links" aria-label="Seções da página">
          <button onClick={() => rolarPara('funcionalidades')} type="button">Recursos</button>
          <button onClick={() => rolarPara('como-funciona')} type="button">Como funciona</button>
          <button onClick={() => rolarPara('faq')} type="button">Dúvidas</button>
        </div>
        <div className="landing-nav-actions">
          <button className="landing-nav-link" onClick={irParaLogin} type="button">
            Entrar
          </button>
          <button className="button button-primary button-small" onClick={irParaCadastro} type="button">
            Começar grátis
          </button>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-kicker">Agenda profissional. Experiência simples.</p>
          <h1>Sua agenda online, pronta para trabalhar por você.</h1>
          <p className="landing-lead">
            Receba agendamentos 24 horas por dia, organize clientes e atendimentos
            e compartilhe seu negócio por link, QR Code ou WhatsApp.
          </p>
          <div className="landing-hero-actions">
            <button className="button button-primary" onClick={irParaCadastro} type="button">
              Criar minha agenda grátis
              <ArrowRight aria-hidden="true" size={18} strokeWidth={2} />
            </button>
            <button className="button button-secondary" onClick={() => rolarPara('em-acao')} type="button">
              Ver o Agendai em ação
            </button>
          </div>
          <div className="landing-proof" aria-label="Diferenciais do Agendai">
            <span><CheckCircle2 aria-hidden="true" size={17} /> Cliente agenda sem cadastro</span>
            <span><CheckCircle2 aria-hidden="true" size={17} /> Sem conflito de horário</span>
            <span><CheckCircle2 aria-hidden="true" size={17} /> Instalável como aplicativo</span>
          </div>
        </div>

        <div className="landing-hero-visual" aria-label="Prévia visual do painel Agendai">
          <div className="landing-visual-toolbar">
            <BrandLogo compact />
            <span>Visão geral</span>
            <span className="landing-live-dot">Online</span>
          </div>
          <div className="landing-visual-metrics">
            <div><CalendarCheck2 aria-hidden="true" size={19} /><span>Agenda organizada</span></div>
            <div><Users aria-hidden="true" size={19} /><span>Clientes em um só lugar</span></div>
          </div>
          <div className="landing-mockup-card mockup-main-card">
            <div className="mockup-header">
              <span>Próximos atendimentos</span>
              <span className="status-badge status-confirmado">Atualizado</span>
            </div>
            <div className="mockup-row">
              <span>09:00</span><strong>Corte masculino</strong><em>Confirmado</em>
            </div>
            <div className="mockup-row">
              <span>10:30</span><strong>Barba</strong><em>Pendente</em>
            </div>
            <div className="mockup-row">
              <span>14:00</span><strong>Sobrancelha</strong><em>Confirmado</em>
            </div>
          </div>
          <img
            alt="Ilustração de calendário com planta e relógio"
            className="landing-hero-illustration"
            src={authIllustration}
          />
        </div>
      </section>

      <section className="landing-trust-strip" aria-label="Principais recursos">
        <span>Agendamento online</span><span>QR Code</span><span>WhatsApp</span>
        <span>PWA</span><span>PDF</span><span>Excel</span>
      </section>

      <section className="landing-section landing-action-section" id="em-acao">
        <div className="landing-section-heading landing-heading-centered">
          <p className="landing-kicker">Veja o Agendai em ação</p>
          <h2>Do link compartilhado à agenda organizada.</h2>
          <p>Uma jornada curta para o cliente e controle completo para quem atende.</p>
        </div>
        <div className="landing-product-demo">
          <div className="landing-demo-sidebar" aria-hidden="true">
            <BrandLogo compact />
            <span className="is-active"><LayoutDashboard size={18} /> Painel</span>
            <span><CalendarCheck2 size={18} /> Agenda</span>
            <span><Users size={18} /> Clientes</span>
          </div>
          <div className="landing-demo-workspace">
            <div className="landing-demo-heading">
              <div><small>AGENDA DO NEGÓCIO</small><strong>Atendimentos em ordem</strong></div>
              <span className="status-badge status-confirmado">Sincronizado</span>
            </div>
            <div className="landing-demo-flow">
              <article>
                <span className="landing-demo-number">1</span>
                <div><strong>O cliente escolhe</strong><p>Serviço, profissional, data e horário.</p></div>
              </article>
              <article>
                <span className="landing-demo-number">2</span>
                <div><strong>O sistema valida</strong><p>Disponibilidade e conflitos automaticamente.</p></div>
              </article>
              <article>
                <span className="landing-demo-number">3</span>
                <div><strong>Você acompanha</strong><p>Agenda, clientes e indicadores no painel.</p></div>
              </article>
            </div>
          </div>
          <aside className="landing-demo-public">
            <span className="landing-icon"><CalendarCheck2 aria-hidden="true" size={23} /></span>
            <small>AGENDAMENTO PÚBLICO</small>
            <strong>Escolha seu horário</strong>
            <div className="landing-demo-times"><span>09:00</span><span className="is-selected">10:30</span><span>14:00</span></div>
            <span className="landing-demo-button">Continuar</span>
          </aside>
        </div>
      </section>

      <section className="landing-section" id="funcionalidades">
        <div className="landing-section-heading">
          <p className="landing-kicker">Tudo em um só lugar</p>
          <h2>Recursos reais para uma rotina mais profissional.</h2>
          <p>Do primeiro contato ao relatório do mês, o Agendai mantém a operação clara e acessível.</p>
        </div>
        <div className="landing-feature-grid">
          {funcionalidades.map(({ titulo, texto, Icone, tom }) => (
            <article className="landing-feature-card" key={titulo}>
              <span className={`landing-icon landing-icon-${tom}`}>
                <Icone aria-hidden="true" size={23} strokeWidth={2} />
              </span>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-audience-section">
        <div className="landing-section-heading landing-heading-centered">
          <p className="landing-kicker">Ideal para</p>
          <h2>Quem vive de atendimento merece uma agenda à altura.</h2>
        </div>
        <div className="landing-audience-grid">
          {publicos.map(({ titulo, texto, Icone }) => (
            <article className="landing-audience-card" key={titulo}>
              <Icone aria-hidden="true" size={26} strokeWidth={1.9} />
              <div><h3>{titulo}</h3><p>{texto}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-process-section" id="como-funciona">
        <div className="landing-section-heading">
          <p className="landing-kicker">Como funciona</p>
          <h2>Quatro passos entre você e uma agenda mais leve.</h2>
        </div>
        <div className="landing-steps">
          {passos.map(([titulo, texto], index) => (
            <article className="landing-step-card" key={titulo}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-value-strip" aria-label="Benefícios para o negócio">
        <span><CheckCircle2 aria-hidden="true" size={18} /> Menos conversas perdidas</span>
        <span><CheckCircle2 aria-hidden="true" size={18} /> Mais organização</span>
        <span><CheckCircle2 aria-hidden="true" size={18} /> Mais controle do negócio</span>
      </section>

      <section className="landing-section landing-plans-section" id="planos">
        <div className="landing-section-heading landing-heading-centered">
          <p className="landing-kicker">Planos</p>
          <h2>Um plano para cada fase do seu negócio.</h2>
          <p>Comece sem custo e evolua conforme sua agenda, equipe e operação crescerem.</p>
        </div>
        <div className="landing-plan-notice">
          <CalendarCheck2 aria-hidden="true" size={22} strokeWidth={2} />
          <div>
            <strong>Teste gratuito por 3 meses</strong>
            <span>Acesso completo ao Plano Profissional. O plano anual oferece desconto em relação ao mensal.</span>
          </div>
        </div>
        <div className="landing-plan-grid">
          {planos.map((plano) => (
            <article
              className={`landing-plan-card ${plano.destaque ? 'is-highlighted' : ''}`}
              key={plano.nome}
            >
              <div className="landing-plan-heading">
                <div>
                  <h3>{plano.nome}</h3>
                  <p className="landing-plan-price">
                    <strong>{plano.precoMensal}</strong>
                    <span>/mês</span>
                  </p>
                  <span className="landing-plan-annual">{plano.precoAnual}</span>
                </div>
                {plano.destaque && <span className="plan-label">Mais recomendado</span>}
              </div>
              <p>{plano.descricao}</p>
              <ul>
                {plano.itens.map((item) => (
                  <li key={item}>
                    <CheckCircle2 aria-hidden="true" size={17} strokeWidth={2} />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-faq-section" id="faq">
        <div className="landing-section-heading">
          <p className="landing-kicker">Perguntas frequentes</p>
          <h2>O que você precisa saber antes de começar.</h2>
        </div>
        <div className="landing-faq-list">
          {perguntas.map(({ pergunta, resposta }, index) => {
            const aberta = perguntasAbertas.includes(index);
            const respostaId = `resposta-faq-${index}`;

            return (
              <article className={`landing-faq-item ${aberta ? 'is-open' : ''}`} key={pergunta}>
                <button
                  aria-controls={respostaId}
                  aria-expanded={aberta}
                  onClick={() => alternarPergunta(index)}
                  type="button"
                >
                  {pergunta}
                  <ChevronDown aria-hidden="true" size={20} />
                </button>
                <div className="landing-faq-answer" id={respostaId}>
                  <div><p>{resposta}</p></div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-final-cta">
        <div>
          <p className="landing-kicker">Comece agora</p>
          <h2>Seu próximo agendamento pode começar por aqui.</h2>
          <p>Crie sua conta, configure o negócio e compartilhe uma experiência profissional com seus clientes.</p>
        </div>
        <button className="button button-primary" onClick={irParaCadastro} type="button">
          Criar minha agenda grátis
          <ArrowRight aria-hidden="true" size={18} strokeWidth={2} />
        </button>
      </section>

      <footer className="landing-footer">
        <BrandLogo />
        <p>Sistema de agendamento online para pequenos negócios.</p>
        <div><span>WhatsApp</span><span>QR Code</span><span>PWA</span></div>
      </footer>
    </main>
  );
}

export default LandingPage;
