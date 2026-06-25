import { useEffect, useState } from 'react';
import {
  CalendarDays,
  Download,
  LayoutDashboard,
  LogOut,
  Moon,
  Scissors,
  Store,
  Sun,
  Users,
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import { useTheme } from '../contexts/ThemeContext';
import { buscarNegocio } from '../services/negocioService';
import { resolverAssetUrl } from '../services/api';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', Icon: LayoutDashboard },
  { label: 'Meu Negócio', path: '/negocio', Icon: Store },
  { label: 'Serviços', path: '/servicos', Icon: Scissors },
  { label: 'Profissionais', path: '/profissionais', Icon: Users },
  { label: 'Clientes', path: '/clientes', Icon: Users },
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
  const [logoNegocio, setLogoNegocio] = useState('');
  const [pwaInstalado, setPwaInstalado] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  });
  const [menuAberto, setMenuAberto] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    return window.innerWidth >= 1040;
  });

  useEffect(() => {
    let ativo = true;

    buscarNegocio()
      .then((resposta) => {
        if (ativo) {
          setLogoNegocio(resolverAssetUrl(resposta.negocio?.logo_url));
        }
      })
      .catch(() => {});

    function atualizarMarca(event) {
      setLogoNegocio(resolverAssetUrl(event.detail?.logoUrl));
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

  function alternarMenu() {
    setMenuAberto((aberto) => !aberto);
  }

  function fecharMenuMobile() {
    if (typeof window !== 'undefined' && window.innerWidth < 1040) {
      setMenuAberto(false);
    }
  }

  function navegarPara(path) {
    navigate(path);
    fecharMenuMobile();
  }

  async function instalarAplicativo() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const escolha = await installPrompt.userChoice;

    if (escolha.outcome === 'accepted') {
      setPwaInstalado(true);
    }

    setInstallPrompt(null);
  }

  return (
    <main className={`app-shell ${menuAberto ? 'is-menu-open' : 'is-sidebar-collapsed'}`}>
      <button
        aria-label="Fechar menu"
        className="sidebar-overlay"
        onClick={() => setMenuAberto(false)}
        type="button"
      />

      <aside className="sidebar">
        <div className="sidebar-brand">
          <BrandLogo />
        </div>

        <nav className="sidebar-nav" aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => {
            const Icon = item.Icon;

            return (
              <button
                aria-label={item.label}
                className={`sidebar-link ${
                  currentPath === item.path ? 'is-active' : ''
                }`}
                key={item.path}
                onClick={() => navegarPara(item.path)}
                type="button"
                title={item.label}
              >
                <span className="sidebar-icon" aria-hidden="true">
                  <Icon size={19} strokeWidth={2} />
                </span>
                <span className="sidebar-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          aria-label="Sair"
          className="sidebar-link sidebar-logout"
          onClick={onLogout}
          type="button"
          title="Sair"
        >
          <span className="sidebar-icon" aria-hidden="true">
            <LogOut size={19} strokeWidth={2} />
          </span>
          <span className="sidebar-label">Sair</span>
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button
            aria-expanded={menuAberto}
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            className={`menu-button ${menuAberto ? 'is-open' : ''}`}
            onClick={alternarMenu}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
          <div className="topbar-actions">
            {installPrompt && !pwaInstalado && (
              <button
                className="install-app-button"
                onClick={instalarAplicativo}
                type="button"
              >
                <Download aria-hidden="true" size={17} strokeWidth={2} />
                <span>Instalar aplicativo</span>
              </button>
            )}
          <button
            aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
            className="theme-toggle"
            onClick={toggleTheme}
            type="button"
          >
            {isDark ? (
              <Sun aria-hidden="true" size={18} strokeWidth={2} />
            ) : (
              <Moon aria-hidden="true" size={18} strokeWidth={2} />
            )}
            <span>{isDark ? 'Claro' : 'Escuro'}</span>
          </button>
          <div className="topbar-user">
            <span className="notification-dot" aria-hidden="true" />
            <span className={`avatar ${logoNegocio ? 'has-image' : ''}`} aria-hidden="true">
              {logoNegocio ? (
                <img src={logoNegocio} alt="" />
              ) : (
                usuario?.nome?.charAt(0)?.toUpperCase() || 'U'
              )}
            </span>
            <div>
              <strong>{usuario?.nome || 'Usuário'}</strong>
              <small>Empreendedor</small>
            </div>
          </div>
          </div>
        </header>

        <div className="workspace-content">{children}</div>
      </section>
    </main>
  );
}

export default DashboardShell;
