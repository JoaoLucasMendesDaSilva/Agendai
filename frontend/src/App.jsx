import './styles.css';
import './professional-shell.css';
import './professional-pages.css';
import './professional-management.css';
import './professional-public.css';
import { lazy, Suspense, useEffect, useState } from 'react';
import ProtectedRoute from './components/ProtectedRoute';

const Agenda = lazy(() => import('./pages/Agenda'));
const Cadastro = lazy(() => import('./pages/Cadastro'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AgendamentoPublico = lazy(() => import('./pages/AgendamentoPublico'));
const GerenciarAgendamento = lazy(() => import('./pages/GerenciarAgendamento'));
const Negocio = lazy(() => import('./pages/Negocio'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Profissionais = lazy(() => import('./pages/Profissionais'));
const Servicos = lazy(() => import('./pages/Servicos'));

function RouteLoading() {
  return (
    <main className="route-loading" role="status" aria-live="polite">
      <span className="route-loading-mark" aria-hidden="true" />
      <p>Carregando página...</p>
    </main>
  );
}

function AppRoutes() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    function handlePopState() {
      setPath(window.location.pathname);
    }

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  function navigate(nextPath, options = {}) {
    if (nextPath === window.location.pathname) {
      return;
    }

    if (options.replace) {
      window.history.replaceState({}, '', nextPath);
    } else {
      window.history.pushState({}, '', nextPath);
    }

    setPath(nextPath);
  }

  if (path.startsWith('/agendar/')) {
    const slugOuId = decodeURIComponent(path.replace('/agendar/', '').trim());

    return <AgendamentoPublico slugOuId={slugOuId} />;
  }

  if (path.startsWith('/gerenciar-agendamento/')) {
    const token = decodeURIComponent(
      path.replace('/gerenciar-agendamento/', '').trim()
    );

    return <GerenciarAgendamento token={token} />;
  }

  if (path === '/') {
    return <LandingPage navigate={navigate} />;
  }

  if (path === '/login') {
    return <Login navigate={navigate} />;
  }

  if (path === '/cadastro') {
    return <Cadastro navigate={navigate} />;
  }

  if (path === '/dashboard') {
    return (
      <ProtectedRoute navigate={navigate}>
        <Dashboard navigate={navigate} />
      </ProtectedRoute>
    );
  }

  if (path === '/negocio') {
    return (
      <ProtectedRoute navigate={navigate}>
        <Negocio navigate={navigate} />
      </ProtectedRoute>
    );
  }

  if (path === '/servicos') {
    return (
      <ProtectedRoute navigate={navigate}>
        <Servicos navigate={navigate} />
      </ProtectedRoute>
    );
  }

  if (path === '/profissionais') {
    return (
      <ProtectedRoute navigate={navigate}>
        <Profissionais navigate={navigate} />
      </ProtectedRoute>
    );
  }

  if (path === '/agenda') {
    return (
      <ProtectedRoute navigate={navigate}>
        <Agenda navigate={navigate} />
      </ProtectedRoute>
    );
  }

  if (path === '/clientes') {
    return (
      <ProtectedRoute navigate={navigate}>
        <Clientes navigate={navigate} />
      </ProtectedRoute>
    );
  }

  return <NotFound navigate={navigate} />;
}

function App() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <AppRoutes />
    </Suspense>
  );
}

export default App;
