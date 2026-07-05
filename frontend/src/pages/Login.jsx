import { useState } from 'react';
import { CalendarCheck2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../contexts/AuthContext';

function Login({ navigate }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      await login({ email, senha });
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
          <span className="auth-secure-chip">
            <ShieldCheck aria-hidden="true" size={16} strokeWidth={2} />
            Acesso seguro
          </span>
        </div>
        <p className="eyebrow">Bem-vindo de volta</p>
        <h1 id="login-title">Entre no seu painel</h1>
        <p className="panel-text auth-intro-text">
          Acesse sua agenda para acompanhar atendimentos, clientes e horários do negócio.
        </p>

        <div className="auth-login-summary" aria-label="O que você acessa ao entrar">
          <span>
            <CalendarCheck2 aria-hidden="true" size={18} strokeWidth={2} />
            Agenda organizada
          </span>
          <span>
            <LockKeyhole aria-hidden="true" size={18} strokeWidth={2} />
            Dados do negócio protegidos
          </span>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <label>
            E-mail
            <span className="auth-input-shell">
              <Mail aria-hidden="true" size={18} strokeWidth={2} />
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
              <LockKeyhole aria-hidden="true" size={18} strokeWidth={2} />
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

          {erro && <p className="message message-error" role="alert">{erro}</p>}

          <button className="button button-primary auth-submit-button" disabled={carregando} type="submit">
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <button className="button button-link" onClick={() => navigate('/cadastro')} type="button">
          Não tem uma conta? Cadastre-se
        </button>
      </section>
    </AuthLayout>
  );
}

export default Login;
