import authIllustration from '../assets/auth-illustration.png';
import BrandLogo from './BrandLogo';

function AuthLayout({ children, mode = 'login', onLogoClick }) {
  const isCadastro = mode === 'cadastro';

  return (
    <main className={`auth-page auth-page-${mode}`}>
      <section className="auth-card" aria-label="Acesso do empreendedor">
        <div className="auth-form-panel">{children}</div>

        {isCadastro ? (
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
              <h2>Comece a organizar seus horários</h2>
              <p>Crie sua conta, configure seu negócio e comece a receber agendamentos.</p>
            </div>
          </aside>
        ) : (
          <aside className="auth-visual-panel auth-login-visual" aria-label="Visão geral do Agendai">
            <div className="auth-login-visual-content">
              <BrandLogo onClick={onLogoClick} />

              <div className="auth-login-visual-copy">
                <h2>Sua agenda começa organizada</h2>
                <p>
                  Acompanhe clientes, horários e equipe em um só lugar.
                  Mais controle, menos imprevistos.
                </p>
              </div>

              <p className="auth-login-visual-note">
                Feito para a rotina de pequenos negócios.
              </p>
            </div>
          </aside>
        )}
      </section>
    </main>
  );
}

export default AuthLayout;
