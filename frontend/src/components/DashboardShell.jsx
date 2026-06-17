import { useState } from 'react';
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Scissors,
  Store,
  Users,
} from 'lucide-react';
import BrandLogo from './BrandLogo';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', Icon: LayoutDashboard },
  { label: 'Meu Negócio', path: '/negocio', Icon: Store },
  { label: 'Serviços', path: '/servicos', Icon: Scissors },
  { label: 'Profissionais', path: '/profissionais', Icon: Users },
  { label: 'Agenda', path: '/agenda', Icon: CalendarDays },
];

function DashboardShell({
  children,
  currentPath = '/dashboard',
  navigate,
  onLogout,
  usuario,
}) {
  const [menuAberto, setMenuAberto] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    return window.innerWidth >= 1040;
  });

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
                {item.label}
              </button>
            );
          })}
        </nav>

        <button
          className="sidebar-link sidebar-logout"
          onClick={onLogout}
          type="button"
          title="Sair"
        >
          <span className="sidebar-icon" aria-hidden="true">
            <LogOut size={19} strokeWidth={2} />
          </span>
          Sair
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
          <div className="topbar-user">
            <span className="notification-dot" aria-hidden="true" />
            <span className="avatar" aria-hidden="true">
              {usuario?.nome?.charAt(0)?.toUpperCase() || 'U'}
            </span>
            <div>
              <strong>{usuario?.nome || 'Usuário'}</strong>
              <small>Empreendedor</small>
            </div>
          </div>
        </header>

        <div className="workspace-content">{children}</div>
      </section>
    </main>
  );
}

export default DashboardShell;
