import { useEffect, useState } from 'react';
import { AppShell } from './components/AppShell';
import { AgendaScreen } from './screens/AgendaScreen';
import { AuthScreen } from './screens/AuthScreen';
import { BusinessScreen, ProfessionalsScreen, ServicesScreen } from './screens/ManagementScreens';
import { ClientsScreen } from './screens/ClientsScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { LandingScreen } from './screens/LandingScreen';
import { PublicBookingScreen } from './screens/PublicBookingScreen';

const labels = {
  app: 'Painel',
  landing: 'Site',
  publico: 'Agendamento público',
  acesso: 'Acesso',
};

export function App() {
  const [surface, setSurface] = useState('app');
  const [screen, setScreen] = useState('dashboard');
  const [dark, setDark] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);

  const navigate = (next) => {
    if (next === 'publico') setSurface('publico');
    else { setSurface('app'); setScreen(next); }
  };

  const screens = {
    dashboard: <DashboardScreen onNavigate={navigate} />,
    agenda: <AgendaScreen />,
    clientes: <ClientsScreen />,
    servicos: <ServicesScreen />,
    profissionais: <ProfessionalsScreen />,
    negocio: <BusinessScreen />,
  };

  return (
    <>
      {surface === 'app' && (
        <AppShell screen={screen} onNavigate={navigate} dark={dark} onTheme={() => setDark(!dark)} mobileMenu={mobileMenu} onMenu={(value) => setMobileMenu(typeof value === 'boolean' ? value : !mobileMenu)}>
          {screens[screen] || screens.dashboard}
        </AppShell>
      )}
      {surface === 'publico' && <PublicBookingScreen onBack={() => setSurface('app')} />}
      {surface === 'acesso' && <AuthScreen onEnter={() => { setSurface('app'); setScreen('dashboard'); }} onBack={() => setSurface('app')} />}
      {surface === 'landing' && <LandingScreen onEnter={() => setSurface('acesso')} onPublic={() => setSurface('publico')} />}

      <nav className="prototype-switcher" aria-label="Alternar superfície da demonstração">
        {Object.entries(labels).map(([id, label]) => <button className={surface === id ? 'active' : ''} onClick={() => setSurface(id)} key={id}>{label}</button>)}
      </nav>
    </>
  );
}
