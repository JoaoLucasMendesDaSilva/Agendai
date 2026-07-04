import { useEffect, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  Download,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Scissors,
  Store,
  Sun,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import { useTheme } from '../contexts/ThemeContext';
import { buscarNegocio } from '../services/negocioService';
import { resolverAssetUrl } from '../services/api';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', Icon: LayoutDashboard },
  { label: 'Meu negócio', path: '/negocio', Icon: Store },
  { label: 'Serviços', path: '/servicos', Icon: Scissors },
  { label: 'Profissionais', path: '/profissionais', Icon: UsersRound },
  { label: 'Clientes', path: '/clientes', Icon: UserRound },
  { label: 'Agenda', path: '/agenda', Icon: CalendarDays },
];

function DashboardShell({
  children,
  currentPath = '/dashboard',
  navigate,
  onLogout,
  usuario,
}) {
  const { isDark, toggleTheme } = useTheme();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [negocio, setNegocio] = useState(null);
  const [perfilAberto, setPerfilAberto] = useState(false);
  const [pwaInstalado, setPwaInstalado] = useState(() => {
    if (typeof window === 'undefined') return false;

    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  });
  const [menuAberto, setMenuAberto] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 1040;
  });

  const logoNegocio = resolverAssetUrl(negocio?.logo_url);
  const nomeNegocio = negocio?.nome || 'Meu negócio';
  const destinoPublico = negocio?.slug_publico
    ? `/agendar/${negocio.slug_publico}`
    : '/negocio';

  useEffect(() => {
    let ativo = true;

    buscarNegocio()
      .then((resposta) => {
        if (ativo) setNegocio(resposta.negocio || null);
      })
      .catch(() => {});

    function atualizarMarca(event) {
      setNegocio((atual) => ({
        ...(atual || {}),
        logo_url: event.detail?.logoUrl || atual?.logo_url || '',
      }));
    }

    window.addEventListener('agendai:brand-updated', atualizarMarca);

    return () => {
      ativo = false;
      window.removeEventListener('agendai:brand-updated', atualizarMarca);
    };
  }, []);

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }

    function handleAppInstalled() {
      setInstallPrompt(null);
      setPwaInstalado(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  function fecharMenuMobile() {
    if (typeof window !== 'undefined' && window.innerWidth < 1040) {
      setMenuAberto(false);
    }
  }

  function navegarPara(path) {
    setPerfilAberto(false);
    navigate(path);
    fecharMenuMobile();
  }

  async function instalarAplicativo() {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const escolha = await installPrompt.userChoice;

    if (escolha.outcome === 'accepted') setPwaInstalado(true);
    setInstallPrompt(null);
  }

  function sair() {
    setPerfilAberto(false);
    onLogout();
  }

  return (
    <main className={`app-shell ${menuAberto ? 'is-menu-open' : ''}`}>
      <button
        aria-label="Fechar menu"
        className="sidebar-overlay"
        onClick={() => setMenuAberto(false)}
        type="button"
      />

      <aside className="sidebar">
        <div className="sidebar-head">
          <BrandLogo onClick={() => navegarPara('/')} />
          <button
            aria-label="Fechar menu"
            className="shell-icon-button sidebar-close-button"
            onClick={() => setMenuAberto(false)}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Navegação principal">
          {NAV_ITEMS.map(({ label, path, Icon }) => (
            <button
              aria-current={currentPath === path ? 'page' : undefined}
              className={`sidebar-link ${currentPath === path ? 'is-active' : ''}`}
              key={path}
              onClick={() => navegarPara(path)}
              type="button"
            >
              <Icon aria-hidden="true" size={19} strokeWidth={2} />
              <span className="sidebar-label">{label}</span>
            </button>
          ))}
        </nav>

        <section className="sidebar-public-card" aria-label="Página pública">
          <CalendarDays aria-hidden="true" size={19} />
          <strong>Link público ativo</strong>
          <p>Seus clientes podem agendar a qualquer hora.</p>
          <button onClick={() => navegarPara(destinoPublico)} type="button">
            Ver página pública
          </button>
        </section>

        <div className="sidebar-footer">
          <span className="system-online-dot" aria-hidden="true" />
          <span>Sistema operacional</span>
          <button aria-label="Sair" onClick={sair} type="button">
            <LogOut aria-hidden="true" size={17} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button
            aria-expanded={menuAberto}
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            className="shell-icon-button menu-button"
            onClick={() => setMenuAberto((aberto) => !aberto)}
            type="button"
          >
            <Menu aria-hidden="true" size={21} />
          </button>

          <span className="topbar-mobile-brand"><BrandLogo compact /></span>

          <div className="topbar-actions">
            {installPrompt && !pwaInstalado && (
              <button
                className="install-app-button"
                onClick={instalarAplicativo}
                type="button"
              >
                <Download aria-hidden="true" size={17} />
                <span>Instalar aplicativo</span>
              </button>
            )}

            <button
              aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
              className="shell-icon-button theme-toggle"
              onClick={toggleTheme}
              type="button"
            >
              {isDark ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
            </button>

            <div className="topbar-profile-wrap">
              <button
                aria-expanded={perfilAberto}
                className="topbar-user"
                onClick={() => setPerfilAberto((aberto) => !aberto)}
                type="button"
              >
                <span className={`avatar ${logoNegocio ? 'has-image' : ''}`} aria-hidden="true">
                  {logoNegocio ? <img src={logoNegocio} alt="" /> : nomeNegocio.charAt(0).toUpperCase()}
                </span>
                <span className="topbar-user-copy">
                  <strong>{nomeNegocio}</strong>
                  <small>{usuario?.nome || 'Empreendedor'}</small>
                </span>
                <ChevronDown aria-hidden="true" size={15} />
              </button>

              {perfilAberto && (
                <div className="profile-menu">
                  <button onClick={() => navegarPara('/negocio')} type="button">
                    <Store aria-hidden="true" size={17} />
                    Configurar negócio
                  </button>
                  <button onClick={sair} type="button">
                    <LogOut aria-hidden="true" size={17} />
                    Sair da conta
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="workspace-content">{children}</div>
      </section>
    </main>
  );
}

export default DashboardShell;
