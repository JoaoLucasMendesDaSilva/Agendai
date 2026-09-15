import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowDownRight,
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck2,
  Check,
  ChevronDown,
  Clock3,
  Link2,
  Menu,
  Moon,
  Scissors,
  ShieldCheck,
  Stethoscope,
  Store,
  Sun,
  UserRoundCheck,
  X,
} from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { useTheme } from '../contexts/ThemeContext';
import dashboardJotaBarber from '../assets/product/dashboard-jota-barber.webp';
import agendamentoPublicoJotaBarber from '../assets/product/agendamento-publico-jota-barber.webp';
import '../landing-page.css';

gsap.registerPlugin(ScrollTrigger);

const beneficios = [
  ['Cliente agenda sem conta', 'Um link direto para escolher serviço, profissional, dia e horário.'],
  ['Conflitos são bloqueados', 'A disponibilidade é conferida antes de cada confirmação.'],
  ['Rotina em um só lugar', 'Agenda, clientes, serviços e profissionais no mesmo painel.'],
];

const mensagensAntes = ['Tem um horário depois das 14h?', 'Quanto tempo leva?', 'Pode confirmar para mim?'];

const agendaDepois = [
  ['09:00', 'Atendimento confirmado', 'Confirmado'],
  ['14:00', 'Novo pedido recebido', 'Solicitado'],
  ['16:30', 'Horário disponível', 'Livre'],
];

const passos = [
  { titulo: 'Configure', texto: 'Cadastre o negócio, os serviços, os profissionais e os horários.', Icone: Clock3 },
  { titulo: 'Compartilhe', texto: 'Envie o link público ou divulgue o QR Code.', Icone: Link2 },
  { titulo: 'Receba', texto: 'O cliente escolhe uma opção realmente disponível.', Icone: UserRoundCheck },
  { titulo: 'Acompanhe', texto: 'Veja o dia e os próximos atendimentos no painel.', Icone: CalendarCheck2 },
];

const publicos = [
  { nome: 'Barbearias', Icone: Scissors },
  { nome: 'Salões', Icone: Store },
  { nome: 'Clínicas', Icone: Stethoscope },
  { nome: 'Profissionais autônomos', Icone: BriefcaseBusiness },
];

const planosDemonstrativos = [
  {
    nome: 'Gratuito',
    mensal: 'R$ 0,00/mês',
    anual: 'R$ 0,00/ano',
    beneficios: ['Até 50 agendamentos/mês', '1 profissional', 'Lembretes por e-mail'],
  },
  {
    nome: 'Básico',
    mensal: 'R$ 19,90/mês',
    anual: 'R$ 179,00/ano',
    beneficios: ['Até 200 agendamentos/mês', '1 profissional', 'Lembretes por e-mail'],
  },
  {
    nome: 'Profissional',
    mensal: 'R$ 39,90/mês',
    anual: 'R$ 359,00/ano',
    beneficios: ['Agendamentos ilimitados', 'Até 5 profissionais', 'Lembretes por WhatsApp e e-mail', 'Relatórios'],
    destaque: true,
  },
  {
    nome: 'Rede',
    mensal: 'R$ 99,90/mês',
    anual: 'R$ 899,00/ano',
    beneficios: ['Tudo do Profissional', 'Múltiplas unidades', 'Painel centralizado', 'Suporte prioritário'],
  },
];

const perguntas = [
  {
    pergunta: 'O cliente precisa criar uma conta para agendar?',
    resposta: 'Não. O cliente acessa o link público e informa apenas os dados necessários para o atendimento.',
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
    resposta: 'Sim. A interface é responsiva e o sistema também pode ser instalado como aplicativo no celular ou computador.',
  },
];

const secoesNavegacao = [
  { id: 'recursos', rotulo: 'O que resolve' },
  { id: 'como-funciona', rotulo: 'Como funciona' },
  { id: 'faq', rotulo: 'Dúvidas', rotuloMobile: 'Dúvidas frequentes' },
];

function usuarioPrefereReducaoMovimento() {
  return (
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function LandingPage({ navigate }) {
  const { isDark, toggleTheme } = useTheme();
  const [menuAberto, setMenuAberto] = useState(false);
  const [secaoAtiva, setSecaoAtiva] = useState(() => {
    if (typeof window === 'undefined') return '';
    const id = window.location.hash.slice(1);
    return secoesNavegacao.some((secao) => secao.id === id) ? id : '';
  });
  const [horarioSelecionado, setHorarioSelecionado] = useState('');
  const [statusHorario, setStatusHorario] = useState('Livre');
  const landingRef = useRef(null);
  const navRef = useRef(null);
  const menuButtonRef = useRef(null);
  const confirmacaoTimerRef = useRef(null);

  useEffect(() => {
    if (!menuAberto) return undefined;

    function fecharMenuComEscape(event) {
      if (event.key === 'Escape') {
        setMenuAberto(false);
        requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
    }

    function fecharMenuAoClicarFora(event) {
      if (!navRef.current?.contains(event.target)) setMenuAberto(false);
    }

    function fecharMenuAoRedimensionar() {
      setMenuAberto(false);
    }

    window.addEventListener('keydown', fecharMenuComEscape);
    window.addEventListener('pointerdown', fecharMenuAoClicarFora);
    window.addEventListener('resize', fecharMenuAoRedimensionar);

    return () => {
      window.removeEventListener('keydown', fecharMenuComEscape);
      window.removeEventListener('pointerdown', fecharMenuAoClicarFora);
      window.removeEventListener('resize', fecharMenuAoRedimensionar);
    };
  }, [menuAberto]);

  useEffect(() => {
    if (typeof window.IntersectionObserver !== 'function') return undefined;

    const secoes = [
      document.querySelector('.landing-hero'),
      ...secoesNavegacao.map(({ id }) => document.getElementById(id)),
    ].filter(Boolean);
    const observer = new window.IntersectionObserver((entradas) => {
      const entradaAtual = entradas.find((entrada) => entrada.isIntersecting);
      if (entradaAtual) setSecaoAtiva(entradaAtual.target.id || '');
    }, { rootMargin: '-38% 0px -61% 0px' });

    secoes.forEach((secao) => observer.observe(secao));
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const landing = landingRef.current;
    if (!landing || usuarioPrefereReducaoMovimento()) return undefined;

    const mobile = typeof window.matchMedia === 'function'
      && window.matchMedia('(max-width: 760px)').matches;
    const movimentoCurto = mobile ? 10 : 18;
    const contexto = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('.landing-nav', {
          duration: 0.38,
          opacity: 0,
          y: mobile ? -8 : -10,
        })
        .fromTo('.landing-nav',
          { '--landing-nav-rule-progress': 0 },
          { '--landing-nav-rule-progress': 1, duration: 0.34 },
          '-=0.08');

      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('.landing-hero-kicker', { duration: 0.42, opacity: 0, y: movimentoCurto })
        .from('.landing-hero-title h1 > span', {
          duration: 0.72,
          opacity: 0,
          stagger: 0.12,
          yPercent: mobile ? 16 : 22,
        }, '-=0.1')
        .from('.landing-hero-copy > p', { duration: 0.5, opacity: 0, y: movimentoCurto }, '-=0.12')
        .from('.landing-hero-actions > *', { duration: 0.36, opacity: 0, stagger: 0.08 }, '-=0.06')
        .from('.landing-hero-note', { duration: 0.46, opacity: 0, y: movimentoCurto }, '-=0.22')
        .from('.landing-hero-product', {
          duration: 0.86,
          opacity: 0.32,
          x: mobile ? 16 : 34,
          y: mobile ? 10 : 18,
        }, '+=0.04')
        .from('.landing-hero-product figcaption', { duration: 0.46, opacity: 0, x: mobile ? -8 : -16 }, '-=0.26');

      if (!mobile) {
        gsap.fromTo('.landing-hero-product-frame img',
          { scale: 1.015, yPercent: 0 },
          {
            ease: 'none',
            scale: 1.045,
            scrollTrigger: {
              end: 'bottom top',
              scrub: 0.55,
              start: 'top top',
              trigger: '.landing-hero',
            },
            yPercent: -2,
          });
      }

      const historia = gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: {
          end: 'bottom 70%',
          scrub: 0.4,
          start: 'top 84%',
          trigger: '.landing-story-motion',
        },
      });

      historia
        .from('.landing-message', { duration: 0.56, opacity: 0, stagger: 0.12, x: -movimentoCurto })
        .to('.landing-message', { duration: 0.6, stagger: 0.08, x: mobile ? 6 : 16 }, '-=0.16');

      historia.from(
        mobile ? '.landing-story-transfer > span:first-child' : '.landing-story-transfer > span',
        {
          duration: 0.72,
          opacity: 0.35,
          scaleX: mobile ? 1 : 0,
          scaleY: mobile ? 0 : 1,
          stagger: mobile ? 0 : 0.12,
          transformOrigin: mobile ? 'center top' : 'left center',
        },
        '-=0.08',
      );

      historia.from('.landing-after-row', {
        duration: 0.58,
        opacity: 0,
        stagger: 0.16,
        x: mobile ? 0 : 12,
        y: mobile ? 10 : 0,
      }, '-=0.08');

      gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: {
          once: true,
          start: 'top 76%',
          trigger: '.landing-preview',
        },
      })
        .from('.landing-public-capture', { duration: 0.74, opacity: 0.45, y: mobile ? 14 : 22 })
        .from('.landing-booking-context > span', {
          duration: 0.42,
          opacity: 0,
          stagger: 0.1,
          y: mobile ? 7 : 11,
        }, '-=0.06')
        .from('.landing-time-options button', { duration: 0.36, opacity: 0, stagger: 0.09 }, '-=0.08')
        .from('.landing-demo-action', { duration: 0.38, opacity: 0, y: mobile ? 6 : 9 }, '-=0.06');

      gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: {
          once: true,
          start: 'top 76%',
          trigger: '.landing-process',
        },
      })
        .from('.landing-process .landing-section-intro > span', {
          duration: 0.38,
          opacity: 0,
          y: mobile ? 6 : 10,
        })
        .from('.landing-process .landing-section-intro h2', {
          duration: 0.58,
          opacity: 0,
          y: mobile ? 9 : 14,
        }, '-=0.12')
        .fromTo('.landing-steps',
          { '--landing-process-progress': 0 },
          {
            '--landing-process-progress': 1,
            duration: mobile ? 0.82 : 0.92,
            ease: 'power2.inOut',
          })
        .from('.landing-steps li', {
          duration: 0.46,
          opacity: 0,
          scale: 0.96,
          stagger: { amount: mobile ? 0.6 : 0.72 },
          y: mobile ? 8 : 12,
        });

      gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: {
          once: true,
          start: 'top 78%',
          trigger: '.landing-audience',
        },
      })
        .from('.landing-audience > div > *', {
          duration: 0.46,
          opacity: 0,
          stagger: 0.1,
          y: mobile ? 8 : 12,
        })
        .from('.landing-audience li', {
          duration: 0.36,
          opacity: 0,
          stagger: 0.07,
          y: mobile ? 6 : 9,
        });

      gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: {
          once: true,
          start: 'top 78%',
          trigger: '.landing-plans',
        },
      })
        .from('.landing-plans .landing-section-intro > span', {
          duration: 0.32,
          opacity: 0.72,
          y: mobile ? 5 : 7,
        })
        .from('.landing-plans .landing-section-intro h2', {
          duration: 0.48,
          opacity: 0.72,
          y: mobile ? 8 : 11,
        }, '-=0.12')
        .from('.landing-plans .landing-section-intro p', {
          duration: 0.36,
          opacity: 0.78,
          y: mobile ? 5 : 8,
        }, '-=0.18')
        .from('.landing-plan-head', {
          duration: 0.28,
          opacity: 0.72,
          y: 5,
        }, '-=0.12')
        .from('.landing-plan-comparison > ol > li', {
          duration: 0.38,
          opacity: 0.72,
          stagger: 0.07,
          y: mobile ? 6 : 9,
        }, '-=0.06')
        .from('.landing-plan-comparison > ol > li.is-featured article', {
          duration: 0.42,
          scale: 0.985,
        }, '-=0.34')
        .from('.landing-plans-note', {
          duration: 0.28,
          opacity: 0.76,
          y: 4,
        }, '-=0.1');

      gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: {
          once: true,
          start: 'top 80%',
          trigger: '.landing-faq',
        },
      })
        .from('.landing-faq .landing-section-intro > span', {
          duration: 0.32,
          opacity: 0,
          y: mobile ? 6 : 9,
        })
        .from('.landing-faq .landing-section-intro h2', {
          duration: 0.46,
          opacity: 0,
          y: mobile ? 8 : 12,
        }, '-=0.1')
        .from('.landing-faq-list summary', {
          duration: 0.3,
          opacity: 0,
          stagger: 0.06,
          y: mobile ? 4 : 7,
        });

      gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: {
          once: true,
          start: 'top 78%',
          trigger: '.landing-final-cta',
        },
      })
        .from('.landing-final-orbit-line', {
          duration: 0.46,
          ease: 'power2.inOut',
          scaleX: 0,
          transformOrigin: 'left center',
        })
        .from('.landing-final-orbit span', {
          duration: 0.28,
          opacity: 0,
          stagger: 0.06,
          y: mobile ? 4 : 6,
        }, '-=0.18')
        .from('.landing-final-orbit strong', {
          duration: 0.3,
          opacity: 0,
          y: mobile ? 5 : 7,
        }, '+=0.04')
        .from('.landing-final-cta > div:not(.landing-final-orbit) > *', {
          duration: 0.42,
          opacity: 0,
          stagger: 0.07,
          y: mobile ? 8 : 12,
        }, '-=0.08')
        .from('.landing-final-cta > button', { duration: 0.26, opacity: 0.72 }, '-=0.12');

      gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: {
          once: true,
          start: 'top 86%',
          trigger: '.landing-footer',
        },
      })
        .from('.landing-footer-wordmark', {
          duration: 0.52,
          opacity: 0,
          y: mobile ? 10 : 16,
        })
        .fromTo('.landing-footer-time-rule',
          { '--landing-footer-rule-progress': 0 },
          { '--landing-footer-rule-progress': 1, duration: 0.52 },
          '-=0.12')
        .from('.landing-footer-time-rule span', {
          duration: 0.28,
          opacity: 0,
          stagger: 0.06,
        }, '-=0.24')
        .from('.landing-footer-brand, .landing-footer-links nav', {
          duration: 0.36,
          opacity: 0.78,
          stagger: 0.07,
          y: mobile ? 6 : 9,
        }, '-=0.06')
        .from('.landing-footer-origin', {
          duration: 0.28,
          opacity: 0,
          y: 4,
        }, '-=0.02');
    }, landing);

    return () => contexto.revert();
  }, []);

  useEffect(() => () => clearTimeout(confirmacaoTimerRef.current), []);

  function irParaLanding() {
    setMenuAberto(false);
    navigate('/');
    window.scrollTo({ top: 0, behavior: usuarioPrefereReducaoMovimento() ? 'auto' : 'smooth' });
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
    setMenuAberto(false);
    document.getElementById(id)?.scrollIntoView({
      behavior: usuarioPrefereReducaoMovimento() ? 'auto' : 'smooth',
    });
  }

  function selecionarHorario(horario) {
    clearTimeout(confirmacaoTimerRef.current);
    setHorarioSelecionado(horario);
    setStatusHorario('Solicitado');
  }

  function confirmarHorario() {
    if (!horarioSelecionado || statusHorario === 'Confirmando') return;
    setStatusHorario('Confirmando');
    confirmacaoTimerRef.current = setTimeout(() => setStatusHorario('Confirmado'), 520);
  }

  function reiniciarDemonstracao() {
    clearTimeout(confirmacaoTimerRef.current);
    setHorarioSelecionado('');
    setStatusHorario('Livre');
  }

  return (
    <div className="landing-page" ref={landingRef}>
      <nav className="landing-nav" aria-label="Navegação principal" ref={navRef}>
        <BrandLogo onClick={irParaLanding} />

        <div
          className="landing-nav-links"
          aria-label="Seções da página"
          data-active-section={secaoAtiva || undefined}
          role="group"
        >
          {secoesNavegacao.map(({ id, rotulo }) => (
            <a
              aria-current={secaoAtiva === id ? 'location' : undefined}
              href={`#${id}`}
              key={id}
            >
              {rotulo}
            </a>
          ))}
          <span className="landing-nav-marker" aria-hidden="true" />
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
          <a
            className="landing-nav-login"
            href="/login"
            onClick={(event) => { event.preventDefault(); irParaLogin(); }}
          >
            Entrar
          </a>
          <a
            className="landing-button landing-button-light landing-nav-cta"
            href="/cadastro"
            onClick={(event) => { event.preventDefault(); irParaCadastro(); }}
          >
            Criar agenda
          </a>
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
          {secoesNavegacao.map(({ id, rotulo, rotuloMobile }) => (
            <a
              aria-current={secaoAtiva === id ? 'location' : undefined}
              href={`#${id}`}
              key={id}
              onClick={() => setMenuAberto(false)}
            >
              {rotuloMobile || rotulo}
            </a>
          ))}
          <a
            href="/login"
            onClick={(event) => { event.preventDefault(); irParaLogin(); }}
          >
            Entrar na minha conta
          </a>
        </div>
      </nav>

      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-grid">
            <p className="landing-hero-kicker">
              <span aria-hidden="true" />
              A agenda que devolve o controle do dia
            </p>

            <div className="landing-hero-title">
              <h1 aria-label="Seu dia inteiro em ordem, antes mesmo do primeiro atendimento." id="landing-title">
                <span>Seu dia inteiro</span>
                <span>em ordem, antes mesmo</span>
                <span>do primeiro atendimento.</span>
              </h1>
            </div>

            <div className="landing-hero-copy">
              <p>
                Receba agendamentos pelo seu próprio link, proteja a agenda contra
                conflitos e acompanhe a rotina do negócio em um só lugar.
              </p>
              <div className="landing-hero-actions">
                <button className="landing-button landing-button-light" onClick={irParaCadastro} type="button">
                  Criar minha agenda
                  <ArrowRight aria-hidden="true" size={18} />
                </button>
                <button className="landing-button landing-button-ghost" onClick={() => rolarPara('como-funciona')} type="button">
                  Ver como funciona
                </button>
              </div>
            </div>

            <div className="landing-hero-note">
              <ArrowDownRight aria-hidden="true" size={24} />
              <span>Da primeira mensagem ao último atendimento, cada horário encontra seu lugar.</span>
            </div>

            <figure className="landing-hero-product">
              <div className="landing-hero-product-frame">
                <img
                  alt="Dashboard administrativo da Jota Barber configurado no Agendai, com visão de agendamentos, clientes, serviços e agenda do dia."
                  decoding="async"
                  fetchPriority="high"
                  height="757"
                  src={dashboardJotaBarber}
                  width="1600"
                />
              </div>
              <figcaption>
                <span><i aria-hidden="true" /> Painel real</span>
                <strong>Jota Barber</strong>
                <small>Exemplo de negócio configurado no Agendai</small>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="landing-benefits" aria-label="Benefícios do Agendai">
          {beneficios.map(([titulo, texto]) => (
            <div key={titulo}>
              <strong>{titulo}</strong>
              <span>{texto}</span>
            </div>
          ))}
        </section>

        <section className="landing-story" id="recursos" aria-labelledby="story-title">
          <div className="landing-section-intro">
            <span className="landing-section-index">Antes → Depois</span>
            <h2 id="story-title">Do “tem horário?” ao atendimento confirmado.</h2>
            <p>O cliente escolhe pelo link e o Agendai coloca cada pedido na agenda, com horário e estado claros.</p>
          </div>

          <div className="landing-story-motion">
            <div className="landing-story-before">
              <strong>Antes</strong>
              {mensagensAntes.map((mensagem, index) => (
                <span className={`landing-message message-${index + 1}`} key={mensagem}>{mensagem}</span>
              ))}
            </div>

            <div className="landing-story-transfer" aria-hidden="true">
              <span /><span /><span />
              <small>O Agendai organiza</small>
            </div>

            <div className="landing-story-after">
              <strong>Depois</strong>
              <div className="landing-after-list">
                {agendaDepois.map(([horario, descricao, status], index) => (
                  <div className={`landing-after-row after-${index + 1}`} key={horario}>
                    <time>{horario}</time>
                    <span><b>{descricao}</b><small>{status}</small></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="landing-preview" aria-labelledby="preview-title">
          <div className="landing-preview-copy">
            <span>Fluxo público em uso</span>
            <h2 id="preview-title">Da vitrine da Jota Barber até a confirmação.</h2>
            <p>
              Este exemplo real mostra serviço e profissional já escolhidos. A data
              e o horário conduzem o cliente às etapas de dados e confirmação.
            </p>
            <ul>
              <li><ShieldCheck aria-hidden="true" size={20} /> Disponibilidade conferida antes da confirmação</li>
              <li><CalendarCheck2 aria-hidden="true" size={20} /> Sem conta para quem agenda</li>
            </ul>
          </div>

          <figure className="landing-public-capture">
            <div>
              <img
                alt="Página pública real da Jota Barber no Agendai, com as etapas Serviço, Profissional, Data e hora, Dados e Confirmação."
                decoding="async"
                height="866"
                loading="lazy"
                src={agendamentoPublicoJotaBarber}
                width="1060"
              />
            </div>
            <figcaption>
              <strong>Jota Barber</strong>
              <span>Exemplo de negócio configurado no Agendai · captura real da página pública</span>
            </figcaption>
          </figure>

          <div className="landing-booking-demo">
            <header>
              <div><small>Demonstração complementar</small><strong>Confirme um horário</strong></div>
              <span>Etapa final</span>
            </header>

            {statusHorario === 'Confirmado' ? (
              <div className="landing-demo-success" role="status">
                <span className="landing-demo-success-icon"><Check aria-hidden="true" size={24} /></span>
                <div>
                  <small>Horário confirmado nesta demonstração</small>
                  <strong>Corte degradê · {horarioSelecionado}</strong>
                  <span>11/09/2026 · João Lucas Mendes</span>
                </div>
                <p><Link2 aria-hidden="true" size={18} /> Na versão real, o cliente recebe um link seguro para gerenciar o agendamento.</p>
                <button className="landing-demo-reset" onClick={reiniciarDemonstracao} type="button">Escolher outro horário</button>
              </div>
            ) : (
              <>
                <div className="landing-booking-context">
                  <span><small>Serviço</small><strong>Corte degradê</strong></span>
                  <span><small>Profissional</small><strong>João Lucas Mendes</strong></span>
                  <span><small>Data</small><strong>11/09/2026</strong></span>
                </div>

                <div className="landing-time-options" aria-label="Horários ilustrativos disponíveis" role="group">
                  {['09:00', '14:00', '16:30'].map((horario) => {
                    const selecionado = horarioSelecionado === horario;
                    return (
                      <button
                        aria-label={`${horario}, ${selecionado ? statusHorario : 'Livre'}`}
                        aria-pressed={selecionado}
                        className={selecionado ? `is-selected is-${statusHorario.toLowerCase()}` : ''}
                        disabled={statusHorario === 'Confirmando'}
                        key={horario}
                        onClick={() => selecionarHorario(horario)}
                        type="button"
                      >
                        <time>{horario}</time>
                        <span>{selecionado ? statusHorario : 'Livre'}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="landing-demo-action">
                  <p className="landing-demo-feedback" aria-live="polite">
                    {horarioSelecionado
                      ? `${horarioSelecionado}: ${statusHorario.toLowerCase()} nesta simulação.`
                      : 'Selecione um horário livre para continuar.'}
                  </p>
                  {horarioSelecionado && (
                    <button
                      aria-busy={statusHorario === 'Confirmando'}
                      className="landing-demo-confirm"
                      disabled={statusHorario === 'Confirmando'}
                      onClick={confirmarHorario}
                      type="button"
                    >
                      {statusHorario === 'Confirmando' ? 'Confirmando…' : 'Confirmar horário'}
                      {statusHorario !== 'Confirmando' && <ArrowRight aria-hidden="true" size={18} />}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="landing-process" id="como-funciona" aria-labelledby="process-title">
          <div className="landing-section-intro is-light">
            <span>Um caminho contínuo</span>
            <h2 id="process-title">Configure uma vez. Acompanhe todos os dias.</h2>
          </div>

          <ol className="landing-steps">
            {passos.map(({ titulo, texto, Icone }, index) => (
              <li key={titulo}>
                <span className="landing-step-number">{index + 1}</span>
                <span className="landing-step-icon"><Icone aria-hidden="true" size={23} /></span>
                <div><h3>{titulo}</h3><p>{texto}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-audience" aria-labelledby="audience-title">
          <div>
            <h2 id="audience-title">Feito para negócios em que atender bem já ocupa o dia inteiro.</h2>
            <p>
              O Agendai nasceu da realidade de pequenos negócios de Cubatão e foi
              pensado para continuar simples no celular e no computador.
            </p>
          </div>
          <ul aria-label="Públicos atendidos pelo Agendai">
            {publicos.map(({ nome, Icone }) => (
              <li key={nome}><Icone aria-hidden="true" size={27} /><span>{nome}</span></li>
            ))}
          </ul>
        </section>

        <section className="landing-plans" aria-labelledby="plans-title">
          <div className="landing-section-intro">
            <span>Modelo apresentado no TCC</span>
            <h2 id="plans-title">Planos pensados para acompanhar cada fase do negócio.</h2>
            <p>
              Comparativo demonstrativo da proposta acadêmica. Não há contratação,
              cobrança ou alteração de plano nesta página.
            </p>
          </div>

          <div className="landing-plan-comparison">
            <div className="landing-plan-head" aria-hidden="true">
              <span>Plano</span><span>Mensal</span><span>Anual</span><span>O que inclui</span>
            </div>
            <ol>
              {planosDemonstrativos.map(({ nome, mensal, anual, beneficios, destaque }, index) => (
                <li className={destaque ? 'is-featured' : undefined} key={nome}>
                  <article>
                    <div className="landing-plan-name">
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <h3>{nome}</h3>
                    </div>
                    <p className="landing-plan-price" data-label="Mensal">{mensal}</p>
                    <p className="landing-plan-price" data-label="Anual">{anual}</p>
                    <ul aria-label={`Benefícios do plano ${nome}`}>
                      {beneficios.map((beneficio) => (
                        <li key={beneficio}><Check aria-hidden="true" size={16} />{beneficio}</li>
                      ))}
                    </ul>
                    <span className="landing-plan-status">Demonstração</span>
                  </article>
                </li>
              ))}
            </ol>
            <p className="landing-plans-note">
              Valores e limites extraídos do TCC corrigido, páginas 9–10 e 18. Pagamentos e assinaturas não estão implementados.
            </p>
          </div>
        </section>

        <section className="landing-faq" id="faq" aria-labelledby="faq-title">
          <div className="landing-section-intro">
            <span>Dúvidas frequentes</span>
            <h2 id="faq-title">O que você precisa saber antes de começar.</h2>
          </div>

          <div className="landing-faq-list">
            {perguntas.map(({ pergunta, resposta }) => (
              <details key={pergunta}>
                <summary>
                  <span>{pergunta}</span>
                  <ChevronDown aria-hidden="true" size={22} />
                </summary>
                <p>{resposta}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-final-cta" aria-labelledby="final-cta-title">
          <div className="landing-final-orbit" aria-hidden="true">
            <strong><Check size={18} /> Dia organizado</strong>
            <div>
              <i className="landing-final-orbit-line" />
              <span>08:00</span><span>10:30</span><span>14:00</span><span>16:30</span>
            </div>
          </div>
          <div>
            <h2 id="final-cta-title">Amanhã começa melhor quando hoje está organizado.</h2>
            <p>Crie sua agenda e prepare o link que seus clientes vão usar.</p>
            <span>O cadastro atual não solicita cartão ou pagamento.</span>
          </div>
          <button className="landing-button landing-button-light" onClick={irParaCadastro} type="button">
            Criar minha agenda
            <ArrowRight aria-hidden="true" size={18} />
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-header">
          <p className="landing-footer-wordmark" aria-hidden="true">Agendai</p>
          <div className="landing-footer-time-rule" aria-hidden="true">
            <span>07:30</span><span>12:00</span><span>18:30</span>
          </div>
        </div>

        <div className="landing-footer-body">
          <div className="landing-footer-brand">
            <BrandLogo onClick={irParaLanding} />
            <p>Agendamento online simples para pequenos negócios.</p>
          </div>

          <div className="landing-footer-links">
            <nav aria-labelledby="footer-product-title">
              <strong id="footer-product-title">Produto</strong>
              <a href="#recursos">O que resolve</a>
              <a href="#como-funciona">Como funciona</a>
            </nav>
            <nav aria-labelledby="footer-access-title">
              <strong id="footer-access-title">Acesso</strong>
              <a href="/login">Entrar</a>
              <a href="/cadastro">Criar agenda</a>
            </nav>
            <nav aria-labelledby="footer-legal-title">
              <strong id="footer-legal-title">Legal</strong>
              <a href="/privacidade">Privacidade</a>
              <a href="/termos">Termos</a>
            </nav>
          </div>
        </div>

        <p className="landing-footer-origin">Projeto nascido em Cubatão — SP.</p>
      </footer>
    </div>
  );
}

export default LandingPage;
