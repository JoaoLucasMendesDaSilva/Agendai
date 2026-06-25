import { useState } from 'react';
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
        <BrandLogo onClick={() => navigate('/')} />
        <p className="eyebrow">Primeiro acesso</p>
        <h1 id="cadastro-title">Cadastro</h1>
        <p className="panel-text">
          Crie a conta do empreendedor para acessar o painel privado.
        </p>

        <form className="form" onSubmit={handleSubmit}>
          <label>
            Nome
            <input
              autoComplete="name"
              onChange={(event) => atualizarCampo('nome', event.target.value)}
              required
              type="text"
              value={form.nome}
            />
          </label>

          <label>
            E-mail
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => atualizarCampo('email', event.target.value)}
              required
              type="email"
              value={form.email}
            />
          </label>

          <label>
            Telefone
            <input
              autoComplete="tel"
              inputMode="tel"
              onChange={(event) => atualizarCampo('telefone', event.target.value)}
              type="tel"
              value={form.telefone}
            />
          </label>

          <label>
            Senha
            <input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => atualizarCampo('senha', event.target.value)}
              required
              type="password"
              value={form.senha}
            />
          </label>

          {erro && <p className="message message-error">{erro}</p>}
          {sucesso && <p className="message message-success">{sucesso}</p>}

          <button className="button button-primary" disabled={carregando} type="submit">
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
