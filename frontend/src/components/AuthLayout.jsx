import authIllustration from '../assets/auth-illustration.png';
import BrandLogo from './BrandLogo';

function AuthLayout({ children, mode = 'login', onLogoClick }) {
  const isCadastro = mode === 'cadastro';

  return (
    <main className={`auth-page auth-page-${mode}`}>
      <section className="auth-card" aria-label="Acesso do empreendedor">
        <div className="auth-form-panel">{children}</div>

        <aside className="auth-visual-panel">
          <BrandLogo onClick={onLogoClick} />
          <div className="auth-visual-proof" aria-label="Resumo do Agendai">
            <span>Agenda online</span>
            <span>Sem conflito</span>
            <span>Gestão profissional</span>
          </div>
          <div className="auth-illustration-wrap">
            <img
              alt="Ilustração de calendário com planta e relógio"
              className="auth-illustration"
              src={authIllustration}
            />
          </div>
          <div className="auth-visual-copy">
            <h2>
              {isCadastro
                ? 'Comece a organizar seus horários'
                : 'Seu painel de atendimento começa aqui'}
            </h2>
            <p>
              {isCadastro
                ? 'Crie sua conta, configure seu negócio e comece a receber agendamentos.'
                : 'Entre para acompanhar agenda, clientes e horários com clareza.'}
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default AuthLayout;
