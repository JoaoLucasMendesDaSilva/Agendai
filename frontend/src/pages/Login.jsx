import { useState } from 'react';
import { LockKeyhole, Mail } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../contexts/AuthContext';

function Login({ navigate }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      await login({ email, senha }, { lembrar });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <AuthLayout onLogoClick={() => navigate('/')}>
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="auth-panel-header">
          <BrandLogo onClick={() => navigate('/')} />
        </div>
        <h1 id="login-title">Entre no Agendai</h1>
        <p className="panel-text auth-intro-text">
          Acesse sua conta para acompanhar sua agenda e manter tudo organizado.
        </p>

        <form className="form auth-login-form" onSubmit={handleSubmit}>
          <label>
            E-mail
            <span className="auth-input-shell">
              <Mail aria-hidden="true" size={17} strokeWidth={2} />
              <input
                autoComplete="email"
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seuemail@exemplo.com"
                required
                type="email"
                value={email}
              />
            </span>
          </label>

          <label>
            Senha
            <span className="auth-input-shell">
              <LockKeyhole aria-hidden="true" size={17} strokeWidth={2} />
              <input
                autoComplete="current-password"
                minLength={8}
                onChange={(event) => setSenha(event.target.value)}
                placeholder="Digite sua senha"
                required
                type="password"
                value={senha}
              />
            </span>
          </label>

          <div className="auth-login-options">
            <label className="auth-remember-choice">
              <input
                checked={lembrar}
                onChange={(event) => setLembrar(event.target.checked)}
                type="checkbox"
              />
              <span>Lembrar de mim</span>
            </label>
          </div>

          {erro && <p className="message message-error" role="alert">{erro}</p>}

          <button className="button button-primary auth-submit-button" disabled={carregando} type="submit">
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="auth-signup-prompt">
          Ainda não tem uma conta?{' '}
          <button className="auth-signup-link" onClick={() => navigate('/cadastro')} type="button">
            Cadastre-se
          </button>
        </p>
      </section>
    </AuthLayout>
  );
}

export default Login;
