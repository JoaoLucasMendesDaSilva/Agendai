import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  LayoutDashboard,
  Menu,
  Moon,
  Scissors,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  Store,
  Sun,
  Users,
  X,
} from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { useTheme } from '../contexts/ThemeContext';
import '../landing-page.css';

const pilares = [
  {
    titulo: 'Agendamento que começa pelo cliente',
    texto: 'Seu cliente escolhe serviço, profissional, data e horário pelo link público, sem precisar criar uma conta.',
    detalhe: 'Menos mensagens para organizar manualmente',
    Icone: CalendarCheck2,
  },
  {
    titulo: 'Horários protegidos contra conflito',
    texto: 'A disponibilidade é validada antes da confirmação para impedir dois atendimentos no mesmo horário.',
    detalhe: 'Mais confiança para divulgar sua agenda',
    Icone: ShieldCheck,
  },
  {
    titulo: 'Rotina centralizada em um painel',
    texto: 'Agenda, clientes, serviços e profissionais ficam reunidos para você entender o dia sem procurar em várias conversas.',
    detalhe: 'Mais clareza para quem atende e administra',
    Icone: LayoutDashboard,
  },
];

const recursosComplementares = [
  'Link e QR Code para divulgação',
  'Compartilhamento pelo WhatsApp',
  'Instalação como aplicativo (PWA)',
  'Relatórios em PDF',
  'Exportação para Excel',
  'Tema claro e escuro',
];

const publicos = [
  { nome: 'Barbearias', Icone: Scissors },
  { nome: 'Salões', Icone: Store },
  { nome: 'Clínicas', Icone: Stethoscope },
  { nome: 'Profissionais autônomos', Icone: BriefcaseBusiness },
];

const passos = [
  ['Configure', 'Cadastre negócio, serviços, profissionais e horários.'],
  ['Compartilhe', 'Envie o link público ou divulgue o QR Code.'],
  ['Receba', 'O cliente escolhe uma opção realmente disponível.'],
  ['Acompanhe', 'Veja agenda, clientes e próximos atendimentos.'],
];

const conferenciaRotina = [
  ['Horário livre', '12:00 disponível'],
  ['Cliente escolhe', '14:00 solicitado'],
  ['Sistema confirma', 'sem conflito'],
];

const perguntas = [
  {
    pergunta: 'O cliente precisa criar uma conta para agendar?',
    resposta: 'Não. O cliente acessa o link público, escolhe serviço, profissional, data e horário sem criar cadastro.',
  },
  {
    pergunta: 'Como o Agendai evita dois agendamentos no mesmo horário?',
    resposta: 'Antes da confirmação, o sistema consulta a disponibilidade e bloqueia combinações que gerariam conflito.',
  },
  {
    pergunta: 'Preciso informar cartão para criar minha conta?',
    resposta: 'Não. Na versão atual, o cadastro inicial não solicita cartão nem pagamento.',
  },
  {
    pergunta: 'Consigo usar o Agendai pelo celular?',
    resposta: 'Sim. A interface é responsiva e o sistema também pode ser instalado como PWA no celular ou computador.',
  },
];

function LandingPage({ navigate }) {
  const { isDark, toggleTheme } = useTheme();
  const [menuAberto, setMenuAberto] = useState(false);
  const [perguntasAbertas, setPerguntasAbertas] = useState([]);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    if (!menuAberto) {
      return undefined;
    }

    function fecharMenuComEscape(event) {
      if (event.key === 'Escape') {
        setMenuAberto(false);
        requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
    }

    window.addEventListener('keydown', fecharMenuComEscape);
    return () => window.removeEventListener('keydown', fecharMenuComEscape);
  }, [menuAberto]);

  function irParaLanding() {
    const prefereReducaoMovimento = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    setMenuAberto(false);
    navigate('/');
    window.scrollTo({
      top: 0,
      behavior: prefereReducaoMovimento ? 'auto' : 'smooth',
    });
  }

  function irParaCadastro() {
    setMenuAberto(false);
    navigate('/cadastro');
  }

  function irParaLogin() {
    setMenuAberto(false);
    navigate('/login');
  }

  function rolarPara(id) {
    const prefereReducaoMovimento = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    setMenuAberto(false);
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
    <div className="landing-page">
      <nav className="landing-nav" aria-label="Navegação principal">
        <BrandLogo onClick={irParaLanding} />

        <div className="landing-nav-links" aria-label="Seções da página">
          <button onClick={() => rolarPara('recursos')} type="button">O que resolve</button>
          <button onClick={() => rolarPara('como-funciona')} type="button">Como funciona</button>
          <button onClick={() => rolarPara('faq')} type="button">Dúvidas</button>
        </div>

        <div className="landing-nav-actions">
          <button
            aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            className="theme-toggle landing-theme-toggle"
            onClick={toggleTheme}
            title={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            type="button"
          >
            {isDark ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
          </button>
          <button className="landing-nav-login" onClick={irParaLogin} type="button">
            Entrar
          </button>
          <button className="button button-primary button-small" onClick={irParaCadastro} type="button">
            Criar agenda
          </button>
          <button
            aria-controls="landing-mobile-menu"
            aria-expanded={menuAberto}
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            className="landing-menu-button"
            onClick={() => setMenuAberto((aberto) => !aberto)}
            ref={menuButtonRef}
            type="button"
          >
            {menuAberto ? <X aria-hidden="true" size={21} /> : <Menu aria-hidden="true" size={21} />}
          </button>
        </div>

        <div className="landing-mobile-menu" hidden={!menuAberto} id="landing-mobile-menu">
          <button onClick={() => rolarPara('recursos')} type="button">O que resolve</button>
          <button onClick={() => rolarPara('como-funciona')} type="button">Como funciona</button>
          <button onClick={() => rolarPara('faq')} type="button">Dúvidas frequentes</button>
          <button onClick={irParaLogin} type="button">Entrar na minha conta</button>
        </div>
      </nav>

      <main className="landing-content">

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-kicker">Feito para quem atende todos os dias</p>
          <h1>Menos conversa perdida. Mais horário confirmado.</h1>
          <p className="landing-lead">
            Receba agendamentos pelo seu próprio link, proteja a agenda contra
            conflitos e acompanhe a rotina do negócio em um só lugar.
          </p>
          <div className="landing-hero-actions">
            <button className="button button-primary" onClick={irParaCadastro} type="button">
              Criar minha agenda
              <ArrowRight aria-hidden="true" size={18} />
            </button>
            <button className="button button-secondary" onClick={() => rolarPara('como-funciona')} type="button">
              Ver como funciona
            </button>
          </div>
          <div className="landing-proof" aria-label="Diferenciais do Agendai">
            <span><CheckCircle2 aria-hidden="true" size={17} /> Cliente agenda sem conta</span>
            <span><CheckCircle2 aria-hidden="true" size={17} /> O sistema confere o horário</span>
            <span><CheckCircle2 aria-hidden="true" size={17} /> Funciona no celular</span>
          </div>
        </div>

        <div className="landing-routine-board" aria-label="Exemplo ilustrativo de uma agenda organizada">
          <header>
            <div>
              <span>Exemplo de rotina</span>
              <strong>Agenda de hoje</strong>
            </div>
            <span className="landing-routine-status">3 horários confirmados</span>
          </header>
          <div className="landing-routine-list">
            <div className="is-confirmed"><time>09:00</time><span><strong>Corte masculino</strong><small>João · confirmado</small></span></div>
            <div className="is-confirmed"><time>10:30</time><span><strong>Barba</strong><small>Marcos · confirmado</small></span></div>
            <div className="is-available"><time>12:00</time><span><strong>Horário disponível</strong><small>Pronto para receber agendamento</small></span></div>
          </div>
          <div className="landing-routine-check" aria-label="Ilustração da conferência automática de disponibilidade">
            <div className="landing-routine-beam" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <ol>
              {conferenciaRotina.map(([titulo, texto]) => (
                <li key={titulo}>
                  <strong>{titulo}</strong>
                  <span>{texto}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="landing-new-booking">
            <CalendarCheck2 aria-hidden="true" size={24} />
            <div><small>Novo agendamento</small><strong>14:00 · Sobrancelha</strong></div>
            <span>Sem conflito</span>
          </div>
        </div>
      </section>

      <section className="landing-assurance" aria-label="Informações importantes antes de começar">
        <div><strong>Sem cartão no cadastro atual</strong><span>Você pode conhecer a configuração antes de qualquer pagamento.</span></div>
        <div><strong>Sem conta para o cliente</strong><span>Quem agenda informa apenas os dados necessários ao atendimento.</span></div>
        <div><strong>Painel protegido por login</strong><span>O acesso administrativo exige login e senha do empreendedor.</span></div>
      </section>

      <section className="landing-section landing-core-section" id="recursos">
        <div className="landing-section-heading">
          <p>O essencial vem primeiro</p>
          <h2>Três partes da rotina que precisam funcionar juntas.</h2>
        </div>
        <div className="landing-core-grid">
          {pilares.map(({ titulo, texto, detalhe, Icone }, index) => (
            <article className={index === 0 ? 'landing-core-item is-primary' : 'landing-core-item'} key={titulo}>
              <span className="landing-core-icon"><Icone aria-hidden="true" size={25} /></span>
              <div><h3>{titulo}</h3><p>{texto}</p></div>
              <small>{detalhe}</small>
            </article>
          ))}
        </div>

        <details className="landing-more-features">
          <summary>Ver recursos complementares</summary>
          <ul>
            {recursosComplementares.map((recurso) => (
              <li key={recurso}><CheckCircle2 aria-hidden="true" size={17} />{recurso}</li>
            ))}
          </ul>
        </details>
      </section>

      <section className="landing-audience-section">
        <div className="landing-audience-copy">
          <p>Uma ferramenta próxima da rotina real</p>
          <h2>Para quem precisa atender bem sem virar especialista em sistemas.</h2>
          <span>
            O Agendai nasceu a partir da realidade de pequenos negócios de Cubatão
            e foi pensado para continuar simples conforme o negócio cresce.
          </span>
        </div>
        <ul className="landing-audience-list" aria-label="Negócios atendidos pelo Agendai">
          {publicos.map(({ nome, Icone }) => (
            <li key={nome}><Icone aria-hidden="true" size={22} /><span>{nome}</span></li>
          ))}
        </ul>
      </section>

      <section className="landing-section landing-process-section" id="como-funciona">
        <div className="landing-section-heading landing-heading-centered">
          <p>Da configuração ao primeiro horário</p>
          <h2>Uma sequência curta, sem trabalho duplicado.</h2>
        </div>
        <ol className="landing-steps">
          {passos.map(([titulo, texto], index) => (
            <li key={titulo}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div><h3>{titulo}</h3><p>{texto}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section landing-faq-section" id="faq">
        <div className="landing-section-heading">
          <p>Antes de criar sua agenda</p>
          <h2>Respostas diretas para decidir com segurança.</h2>
        </div>
        <div className="landing-faq-list">
          {perguntas.map(({ pergunta, resposta }, index) => {
            const aberta = perguntasAbertas.includes(index);
            const perguntaId = `pergunta-faq-${index}`;
            const respostaId = `resposta-faq-${index}`;

            return (
              <article className={`landing-faq-item ${aberta ? 'is-open' : ''}`} key={pergunta}>
                <button
                  aria-controls={respostaId}
                  aria-expanded={aberta}
                  id={perguntaId}
                  onClick={() => alternarPergunta(index)}
                  type="button"
                >
                  {pergunta}
                  <ChevronDown aria-hidden="true" size={20} />
                </button>
                <div
                  aria-labelledby={perguntaId}
                  className="landing-faq-answer"
                  hidden={!aberta}
                  id={respostaId}
                  role="region"
                >
                  <p>{resposta}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-final-cta">
        <div>
          <p>Seu próximo atendimento pode começar mais organizado</p>
          <h2>Configure a agenda e compartilhe seu link.</h2>
          <span>O cadastro atual não solicita cartão ou pagamento.</span>
        </div>
        <button className="button button-primary" onClick={irParaCadastro} type="button">
          Criar minha agenda
          <ArrowRight aria-hidden="true" size={18} />
        </button>
      </section>

      </main>

      <footer className="landing-footer">
        <BrandLogo onClick={irParaLanding} />
        <p>Agendamento online simples para pequenos negócios.</p>
        <p className="landing-footer-origin">Projeto nascido em Cubatão — SP.</p>
      </footer>
    </div>
  );
}

export default LandingPage;
