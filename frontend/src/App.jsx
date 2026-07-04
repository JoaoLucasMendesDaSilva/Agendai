import './styles.css';
import './professional-shell.css';
import { useEffect, useState } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import Agenda from './pages/Agenda';
import Cadastro from './pages/Cadastro';
import Clientes from './pages/Clientes';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import AgendamentoPublico from './pages/AgendamentoPublico';
import GerenciarAgendamento from './pages/GerenciarAgendamento';
import Negocio from './pages/Negocio';
import NotFound from './pages/NotFound';
import Profissionais from './pages/Profissionais';
import Servicos from './pages/Servicos';

function App() {
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

export default App;
