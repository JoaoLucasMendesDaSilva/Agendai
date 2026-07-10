import { useRef, useState } from 'react';
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../contexts/AuthContext';

function Login({ navigate }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(false);
  const [erro, setErro] = useState('');
  const [errosCampos, setErrosCampos] = useState({});
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const envioEmAndamento = useRef(false);
  const emailRef = useRef(null);
  const senhaRef = useRef(null);
  const erroRef = useRef(null);

  function limparErros() {
    setErro('');
    setErrosCampos({});
  }

  function validarFormulario() {
    const emailNormalizado = email.trim();
    const novosErros = {};

    if (!emailNormalizado) {
      novosErros.email = 'Informe seu e-mail.';
    } else if (emailNormalizado.length > 254) {
      novosErros.email = 'O e-mail deve ter no máximo 254 caracteres.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(emailNormalizado)) {
      novosErros.email = 'Digite um e-mail válido, como nome@exemplo.com.';
    }

    if (!senha) {
      novosErros.senha = 'Informe sua senha.';
    } else if (senha.length < 8) {
      novosErros.senha = 'A senha deve ter pelo menos 8 caracteres.';
    }

    setErrosCampos(novosErros);

    if (novosErros.email) {
      emailRef.current?.focus();
    } else if (novosErros.senha) {
      senhaRef.current?.focus();
    }

    return Object.keys(novosErros).length === 0;
  }

  function obterMensagemErro(err) {
    if (err?.status === 401 || err?.status === 400) {
      return 'E-mail ou senha não conferem. Verifique os dados e tente novamente.';
    }

    if (err?.status === 429) {
      return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
    }

    if (err?.status >= 500) {
      return 'O Agendai está temporariamente indisponível. Tente novamente em alguns instantes.';
    }

    if (err instanceof TypeError || !navigator.onLine) {
      return 'Não foi possível conectar. Confira sua internet e tente novamente.';
    }

    return 'Não foi possível entrar agora. Tente novamente em alguns instantes.';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (envioEmAndamento.current || !validarFormulario()) {
      return;
    }

    envioEmAndamento.current = true;
    setErro('');
    setCarregando(true);

    try {
      await login({ email: email.trim().toLowerCase(), senha }, { lembrar });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErro(obterMensagemErro(err));
      if (err?.status === 400 || err?.status === 401) {
        setErrosCampos({ credenciais: true });
      }
      requestAnimationFrame(() => erroRef.current?.focus());
    } finally {
      envioEmAndamento.current = false;
      setCarregando(false);
    }
  }

  return (
    <AuthLayout onLogoClick={() => navigate('/')}>
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="auth-panel-header">
          <BrandLogo onClick={() => navigate('/')} />
        </div>
        <div className="auth-login-main">
          <div className="auth-heading-group">
            <h1 id="login-title">Entre no Agendai</h1>
            <p className="panel-text auth-intro-text">
              Acesse sua conta para acompanhar sua agenda e manter tudo organizado.
            </p>
          </div>

          <form
            aria-busy={carregando}
            className="form auth-login-form"
            noValidate
            onSubmit={handleSubmit}
          >
            <div className="auth-field-group">
              <label htmlFor="login-email">E-mail</label>
              <span className={`auth-input-shell ${errosCampos.email || errosCampos.credenciais ? 'is-invalid' : ''}`}>
                <Mail aria-hidden="true" size={17} strokeWidth={2} />
                <input
                  aria-describedby={errosCampos.email ? 'login-email-error' : undefined}
                  aria-invalid={Boolean(errosCampos.email || errosCampos.credenciais)}
                  autoComplete="email"
                  disabled={carregando}
                  id="login-email"
                  inputMode="email"
                  maxLength={254}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    limparErros();
                  }}
                  placeholder="seuemail@exemplo.com"
                  ref={emailRef}
                  required
                  type="email"
                  value={email}
                />
              </span>
              {errosCampos.email && (
                <span className="auth-field-error" id="login-email-error">{errosCampos.email}</span>
              )}
            </div>

            <div className="auth-field-group">
              <label htmlFor="login-password">Senha</label>
              <span className={`auth-input-shell auth-password-shell ${errosCampos.senha || errosCampos.credenciais ? 'is-invalid' : ''}`}>
                <LockKeyhole aria-hidden="true" size={17} strokeWidth={2} />
                <input
                  aria-describedby={errosCampos.senha ? 'login-password-error' : undefined}
                  aria-invalid={Boolean(errosCampos.senha || errosCampos.credenciais)}
                  autoComplete="current-password"
                  disabled={carregando}
                  id="login-password"
                  minLength={8}
                  onChange={(event) => {
                    setSenha(event.target.value);
                    limparErros();
                  }}
                  placeholder="Digite sua senha"
                  ref={senhaRef}
                  required
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                />
                <button
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  className="auth-password-toggle"
                  disabled={carregando}
                  onClick={() => setMostrarSenha((valorAtual) => !valorAtual)}
                  type="button"
                >
                  {mostrarSenha ? <EyeOff aria-hidden="true" size={19} /> : <Eye aria-hidden="true" size={19} />}
                </button>
              </span>
              {errosCampos.senha && (
                <span className="auth-field-error" id="login-password-error">{errosCampos.senha}</span>
              )}
            </div>

            <div className="auth-login-options">
              <label className="auth-remember-choice">
                <input
                  checked={lembrar}
                  disabled={carregando}
                  onChange={(event) => setLembrar(event.target.checked)}
                  type="checkbox"
                />
                <span>Lembrar de mim</span>
              </label>
            </div>

            {erro && (
              <p
                className="message message-error auth-login-error"
                ref={erroRef}
                role="alert"
                tabIndex={-1}
              >
                {erro}
              </p>
            )}

            <button
              aria-busy={carregando}
              className="button button-primary auth-submit-button"
              disabled={carregando}
              type="submit"
            >
              {carregando && (
                <LoaderCircle aria-hidden="true" className="auth-submit-loader" size={18} />
              )}
              <span>{carregando ? 'Verificando acesso…' : 'Entrar'}</span>
            </button>
          </form>

          <p className="auth-signup-prompt">
            Ainda não tem uma conta?{' '}
            <button className="auth-signup-link" onClick={() => navigate('/cadastro')} type="button">
              Cadastre-se
            </button>
          </p>
        </div>
      </section>
    </AuthLayout>
  );
}

export default Login;
