import {
  Bell, CalendarDays, ChevronDown, LayoutDashboard, Menu, Moon, Scissors,
  Store, Sun, UserRound, UsersRound, X,
} from 'lucide-react';
import { Brand, Avatar } from './Brand';

const nav = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['negocio', 'Meu negócio', Store],
  ['servicos', 'Serviços', Scissors],
  ['profissionais', 'Profissionais', UsersRound],
  ['clientes', 'Clientes', UserRound],
  ['agenda', 'Agenda', CalendarDays],
];

export function AppShell({ children, screen, onNavigate, dark, onTheme, mobileMenu, onMenu }) {
  return (
    <div className={`app-shell ${mobileMenu ? 'menu-open' : ''}`}>
      <button className="menu-overlay" onClick={onMenu} aria-label="Fechar menu" />
      <aside className="sidebar">
        <div className="sidebar-head">
          <Brand />
          <button className="icon-button sidebar-close" onClick={onMenu} aria-label="Fechar menu"><X size={20} /></button>
        </div>
        <nav className="sidebar-nav" aria-label="Navegação principal">
          {nav.map(([id, label, Icon]) => (
            <button key={id} className={screen === id ? 'active' : ''} onClick={() => { onNavigate(id); onMenu(false); }}>
              <Icon size={19} strokeWidth={2} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-card">
          <CalendarDays size={20} />
          <strong>Link público ativo</strong>
          <p>Seus clientes podem agendar a qualquer hora.</p>
          <button onClick={() => onNavigate('publico')}>Ver página pública</button>
        </div>
        <div className="sidebar-foot">
          <span className="online-dot" />
          <span>Sistema operacional</span>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button className="icon-button menu-trigger" onClick={() => onMenu(true)} aria-label="Abrir menu"><Menu size={21} /></button>
          <span className="mobile-brand"><Brand compact /></span>
          <div className="topbar-spacer" />
          <button className="icon-button" aria-label="Notificações"><Bell size={19} /><i>3</i></button>
          <button className="icon-button" onClick={onTheme} aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'}>
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button className="user-menu">
            <Avatar name="Barbearia Suprema" size="sm" />
            <span><strong>Barbearia Suprema</strong><small>João Lucas</small></span>
            <ChevronDown size={16} />
          </button>
        </header>
        <main className="workspace-content">{children}</main>
      </div>
    </div>
  );
}
