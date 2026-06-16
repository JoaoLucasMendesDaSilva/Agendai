import './styles.css';
import { useEffect, useState } from 'react';
import ProtectedRoute from './components/ProtectedRoute';
import Cadastro from './pages/Cadastro';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Negocio from './pages/Negocio';

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

  return <Login navigate={navigate} />;
}

export default App;
