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
          <aside className="auth-visual-panel auth-login-visual" aria-labelledby="login-preview-title">
            <div className="auth-login-visual-content">
              <span className="auth-login-visual-kicker">Seu espaço de trabalho</span>
              <div className="auth-login-visual-copy">
                <h2 id="login-preview-title">O dia inteiro, em um só lugar.</h2>
                <p>
                  Volte para sua agenda e acompanhe os atendimentos do negócio.
                </p>
              </div>
              <div className="auth-login-flow" role="group" aria-label="Exemplo ilustrativo do caminho de um agendamento">
                <span className="auth-login-flow-label">Do pedido à agenda</span>
                <ol>
                  <li><span aria-hidden="true">01</span><strong>Pedido recebido</strong></li>
                  <li><span aria-hidden="true">02</span><strong>Horário conferido</strong></li>
                  <li><span aria-hidden="true">03</span><strong>Dia em ordem</strong></li>
                </ol>
              </div>
              <figure className="auth-login-day">
                <figcaption>
                  <span>Uma rotina em ordem</span>
                  <small>Exemplo ilustrativo</small>
                </figcaption>
                <ol className="auth-login-day-list">
                  <li>
                    <time dateTime="09:00">09:00</time>
                    <div><strong>Primeiro atendimento</strong><span>Confirmado</span></div>
                  </li>
                  <li>
                    <time dateTime="12:30">12:30</time>
                    <div><strong>Tempo para respirar</strong><span>Intervalo</span></div>
                  </li>
                  <li>
                    <time dateTime="16:00">16:00</time>
                    <div><strong>Próximo horário</strong><span>Disponível</span></div>
                  </li>
                </ol>
              </figure>
            </div>
          </aside>
        )}
      </section>
    </main>
  );
}

export default AuthLayout;
