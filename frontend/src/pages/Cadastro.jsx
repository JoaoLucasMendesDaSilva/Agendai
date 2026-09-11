import { useRef, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../contexts/AuthContext';
import './cadastro.css';

const campos = [
  { nome: 'nome', label: 'Nome completo', tipo: 'text', autocomplete: 'name', placeholder: 'Seu nome completo', maxLength: 120, Icone: UserRound },
  { nome: 'email', label: 'E-mail', tipo: 'email', autocomplete: 'email', placeholder: 'seuemail@exemplo.com', maxLength: 254, Icone: Mail },
  { nome: 'telefone', label: 'Telefone', tipo: 'tel', autocomplete: 'tel-national', placeholder: '(13) 99999-9999', Icone: Phone },
  { nome: 'senha', label: 'Senha', tipo: 'password', autocomplete: 'new-password', placeholder: 'Crie uma senha', Icone: LockKeyhole },
  { nome: 'confirmacao', label: 'Confirmar senha', tipo: 'password', autocomplete: 'new-password', placeholder: 'Repita sua senha', Icone: LockKeyhole },
];

function Cadastro({ navigate }) {
  const { cadastrar } = useAuth();
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', senha: '', confirmacao: '', documentos_aceitos: false });
  const [tocados, setTocados] = useState({});
  const [visiveis, setVisiveis] = useState({});
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const envioEmAndamento = useRef(false);
  const erroRef = useRef(null);
  const telefone = form.telefone.replace(/\D/g, '');
  const erros = {
    nome: form.nome.trim().length < 2 ? 'Informe seu nome, com pelo menos 2 caracteres.' : '',
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? 'Informe um e-mail válido, como voce@exemplo.com.' : '',
    telefone: telefone && ![10, 11].includes(telefone.length) ? 'Informe o DDD e o telefone, com 10 ou 11 dígitos.' : '',
    senha: form.senha.length < 8 ? 'Use pelo menos 8 caracteres.' : '',
    confirmacao: !form.confirmacao ? 'Repita sua senha.' : form.confirmacao !== form.senha ? 'As senhas não conferem.' : '',
    documentos_aceitos: !form.documentos_aceitos ? 'Aceite os termos e a política para criar sua conta.' : '',
  };
  // ponytail: estimativa local por comprimento e variedade; usar medidor especializado se necessário.
  const variedade = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((regra) => regra.test(form.senha)).length;
  const forca = form.senha.length < 8 ? 1 : form.senha.length >= 12 && variedade >= 3 ? 3 : 2;
  const forcaTexto = ['Fraca', 'Média', 'Forte'][forca - 1];

  function atualizarCampo(campo, valor) {
    if (campo === 'telefone') {
      const digitos = valor.replace(/\D/g, '').slice(0, 11);
      valor = digitos.replace(/^(\d{2})(\d+)/, '($1) $2');
      if (digitos.length > 6) {
        const corte = digitos.length === 11 ? 10 : 9;
        valor = `${valor.slice(0, corte)}-${valor.slice(corte)}`;
      }
    }
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErro('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (envioEmAndamento.current || sucesso) return;
    setTocados(Object.fromEntries(Object.keys(form).map((campo) => [campo, true])));
    const primeiroErro = Object.keys(erros).find((campo) => erros[campo]);
    if (primeiroErro) {
      event.currentTarget.elements.namedItem(primeiroErro)?.focus();
      return;
    }
    envioEmAndamento.current = true;
    setErro('');
    setCarregando(true);
    try {
      await cadastrar({ nome: form.nome.trim(), email: form.email.trim().toLowerCase(), telefone: telefone || undefined, senha: form.senha, documentos_aceitos: form.documentos_aceitos });
      setForm((atual) => ({ ...atual, senha: '', confirmacao: '' }));
      setSucesso(true);
    } catch (err) {
      setErro(err?.status === 409 ? 'Este e-mail já tem uma conta. Entre ou use outro e-mail.'
        : err?.status === 429 ? 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
          : err instanceof TypeError ? 'Não foi possível conectar. Confira sua internet e tente novamente.'
            : 'Não foi possível criar sua conta. Tente novamente em instantes.');
      requestAnimationFrame(() => erroRef.current?.focus());
    } finally {
      envioEmAndamento.current = false;
      setCarregando(false);
    }
  }

  return (
    <AuthLayout mode="cadastro" onLogoClick={() => navigate('/')}>
      <section className="auth-panel" aria-labelledby="cadastro-title">
        <div className="auth-panel-header">
          <BrandLogo onClick={() => navigate('/')} />
          <span className="auth-secure-chip"><ShieldCheck aria-hidden="true" size={16} />Dados protegidos</span>
        </div>
        <p className="eyebrow">Primeiro acesso</p>
        <h1 id="cadastro-title">Crie sua conta</h1>
        <p className="panel-text auth-intro-text">Comece a organizar seu negócio e ofereça agendamento online aos seus clientes.</p>
        {sucesso ? (
          <div className="cadastro-success" role="status" tabIndex={-1} ref={(elemento) => elemento?.focus()}>
            <CheckCircle2 aria-hidden="true" size={32} />
            <h2>Conta criada!</h2>
            <p>Agora entre com seu e-mail e senha para configurar seu negócio.</p>
            <button className="button button-primary" onClick={() => navigate('/login')} type="button">Ir para o login</button>
          </div>
        ) : (
          <form className="form" onSubmit={handleSubmit} noValidate aria-busy={carregando}>
            {campos.map(({ nome, label, tipo, autocomplete, placeholder, maxLength, Icone }) => {
              const invalido = Boolean((tocados[nome] || (nome === 'confirmacao' && form.confirmacao)) && erros[nome]);
              return (
                <div className="cadastro-field" key={nome}>
                  <label htmlFor={`cadastro-${nome}`}>{label}{nome === 'telefone' && <span className="cadastro-optional"> (opcional)</span>}</label>
                  <span className={`auth-input-shell ${tipo === 'password' ? 'cadastro-password' : ''} ${invalido ? 'is-invalid' : ''}`}>
                    <Icone aria-hidden="true" size={18} />
                    <input id={`cadastro-${nome}`} name={nome} autoComplete={autocomplete} type={tipo === 'password' && visiveis[nome] ? 'text' : tipo}
                      inputMode={tipo === 'tel' || tipo === 'email' ? tipo : undefined} maxLength={maxLength}
                      required={nome !== 'telefone'} disabled={carregando} placeholder={placeholder} value={form[nome]}
                      aria-invalid={invalido} aria-describedby={`${nome === 'senha' ? 'cadastro-senha-hint ' : ''}${invalido ? `cadastro-${nome}-error` : ''}`.trim() || undefined}
                      onBlur={() => setTocados((atual) => ({ ...atual, [nome]: true }))}
                      onChange={(event) => atualizarCampo(nome, event.target.value)} />
                    {tipo === 'password' && <button className="cadastro-toggle" type="button" disabled={carregando}
                      aria-label={`${visiveis[nome] ? 'Ocultar' : 'Mostrar'} ${nome === 'senha' ? 'senha' : 'confirmação de senha'}`}
                      aria-controls={`cadastro-${nome}`} onClick={() => setVisiveis((atual) => ({ ...atual, [nome]: !atual[nome] }))}>
                      {visiveis[nome] ? <EyeOff aria-hidden="true" size={19} /> : <Eye aria-hidden="true" size={19} />}
                    </button>}
                  </span>
                  {nome === 'senha' && <div className="cadastro-strength" id="cadastro-senha-hint">
                    {form.senha && <><div className="cadastro-strength-bars" data-strength={forca} aria-hidden="true">{[1, 2, 3].map((barra) => <span key={barra} data-filled={barra <= forca} />)}</div><span>Força estimada: {forcaTexto}. </span></>}
                    <span>{form.senha ? 'Prefira uma senha longa e exclusiva.' : 'Mínimo de 8 caracteres.'}</span>
                  </div>}
                  {invalido && <span className="cadastro-field-error" id={`cadastro-${nome}-error`} aria-live="polite">{erros[nome]}</span>}
                </div>
              );
            })}
            <div className="cadastro-terms">
              <div className="legal-checkbox">
                <input id="cadastro-termos" name="documentos_aceitos" type="checkbox" required disabled={carregando} checked={form.documentos_aceitos}
                  aria-invalid={Boolean(tocados.documentos_aceitos && erros.documentos_aceitos)}
                  aria-describedby={tocados.documentos_aceitos && erros.documentos_aceitos ? 'cadastro-termos-error' : undefined}
                  onChange={(event) => atualizarCampo('documentos_aceitos', event.target.checked)} />
                <label htmlFor="cadastro-termos">Li e aceito os <a href="/termos" target="_blank" rel="noopener noreferrer">Termos de Uso</a> e a <a href="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade</a>.</label>
              </div>
              {tocados.documentos_aceitos && erros.documentos_aceitos && <span className="cadastro-field-error" id="cadastro-termos-error" aria-live="polite">{erros.documentos_aceitos}</span>}
            </div>
            {erro && <p className="message message-error" role="alert" ref={erroRef} tabIndex={-1}>{erro}</p>}
            <button className="button button-primary auth-submit-button" disabled={carregando} type="submit">
              {carregando && <LoaderCircle className="cadastro-loader" aria-hidden="true" size={18} />}
              {carregando ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>
        )}
        {!sucesso && <a className="cadastro-login" href="/login">Já tenho conta</a>}
      </section>
    </AuthLayout>
  );
}

export default Cadastro;
