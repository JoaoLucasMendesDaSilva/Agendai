import { useState } from 'react';
import { LockKeyhole, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../contexts/AuthContext';

function Cadastro({ navigate }) {
  const { cadastrar } = useAuth();
  const [form, setForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    senha: '',
  });
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregando, setCarregando] = useState(false);

  function atualizarCampo(campo, valor) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setSucesso('');
    setCarregando(true);

    try {
      await cadastrar({
        nome: form.nome,
        email: form.email,
        telefone: form.telefone || undefined,
        senha: form.senha,
      });
      setSucesso('Cadastro realizado com sucesso. Agora faça login.');
      setForm({ nome: '', email: '', telefone: '', senha: '' });
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <AuthLayout mode="cadastro" onLogoClick={() => navigate('/')}>
      <section className="auth-panel" aria-labelledby="cadastro-title">
        <div className="auth-panel-header">
          <BrandLogo onClick={() => navigate('/')} />
          <span className="auth-secure-chip">
            <ShieldCheck aria-hidden="true" size={16} strokeWidth={2} />
            Dados protegidos
          </span>
        </div>
        <p className="eyebrow">Primeiro acesso</p>
        <h1 id="cadastro-title">Crie sua conta</h1>
        <p className="panel-text auth-intro-text">
          Comece a organizar seu negócio e ofereça agendamento online aos seus clientes.
        </p>

        <form className="form" onSubmit={handleSubmit}>
          <label>
            Nome
            <span className="auth-input-shell">
              <UserRound aria-hidden="true" size={18} />
              <input
                autoComplete="name"
                onChange={(event) => atualizarCampo('nome', event.target.value)}
                placeholder="Seu nome completo"
                required
                type="text"
                value={form.nome}
              />
            </span>
          </label>

          <label>
            E-mail
            <span className="auth-input-shell">
              <Mail aria-hidden="true" size={18} />
              <input
                autoComplete="email"
                inputMode="email"
                onChange={(event) => atualizarCampo('email', event.target.value)}
                placeholder="seuemail@exemplo.com"
                required
                type="email"
                value={form.email}
              />
            </span>
          </label>

          <label>
            Telefone
            <span className="auth-input-shell">
              <Phone aria-hidden="true" size={18} />
              <input
                autoComplete="tel"
                inputMode="tel"
                onChange={(event) => atualizarCampo('telefone', event.target.value)}
                placeholder="(13) 99999-9999"
                type="tel"
                value={form.telefone}
              />
            </span>
          </label>

          <label>
            Senha
            <span className="auth-input-shell">
              <LockKeyhole aria-hidden="true" size={18} />
              <input
                autoComplete="new-password"
                minLength={8}
                onChange={(event) => atualizarCampo('senha', event.target.value)}
                placeholder="Mínimo de 8 caracteres"
                required
                type="password"
                value={form.senha}
              />
            </span>
          </label>

          {erro && <p className="message message-error" role="alert">{erro}</p>}
          {sucesso && <p className="message message-success" role="status">{sucesso}</p>}

          <button className="button button-primary auth-submit-button" disabled={carregando} type="submit">
            {carregando ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <button className="button button-link" onClick={() => navigate('/login')} type="button">
          Já tenho conta
        </button>
      </section>
    </AuthLayout>
  );
}

export default Cadastro;
