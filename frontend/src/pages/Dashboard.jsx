import {
  CalendarCheck,
  CalendarDays,
  Scissors,
  Store,
  Users,
} from 'lucide-react';
import DashboardShell from '../components/DashboardShell';
import { useAuth } from '../contexts/AuthContext';

function Dashboard({ navigate }) {
  const { logout, usuario } = useAuth();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <DashboardShell
      currentPath="/dashboard"
      navigate={navigate}
      onLogout={handleLogout}
      usuario={usuario}
    >
      <header className="page-title">
        <div>
          <p className="eyebrow">Visão geral do seu negócio</p>
          <h1>Dashboard</h1>
        </div>
      </header>

      <section className="metrics-grid" aria-label="Atalhos principais">
        <button
          className="metric-card metric-action"
          onClick={() => navigate('/negocio')}
          type="button"
        >
          <span className="metric-icon" aria-hidden="true">
            <Store size={22} strokeWidth={2} />
          </span>
          <div>
            <p>Meu negócio</p>
            <strong>Dados do negócio</strong>
            <small>Horários, cidade e link público</small>
          </div>
        </button>
        <button
          className="metric-card metric-action"
          onClick={() => navigate('/servicos')}
          type="button"
        >
          <span className="metric-icon metric-yellow" aria-hidden="true">
            <Scissors size={22} strokeWidth={2} />
          </span>
          <div>
            <p>Serviços</p>
            <strong>Catálogo</strong>
            <small>Preços e duração dos atendimentos</small>
          </div>
        </button>
        <button
          className="metric-card metric-action"
          onClick={() => navigate('/profissionais')}
          type="button"
        >
          <span className="metric-icon metric-blue" aria-hidden="true">
            <Users size={22} strokeWidth={2} />
          </span>
          <div>
            <p>Profissionais</p>
            <strong>Equipe</strong>
            <small>Pessoas disponíveis para atender</small>
          </div>
        </button>
        <button
          className="metric-card metric-action"
          onClick={() => navigate('/agenda')}
          type="button"
        >
          <span className="metric-icon" aria-hidden="true">
            <CalendarCheck size={22} strokeWidth={2} />
          </span>
          <div>
            <p>Agenda</p>
            <strong>Agendamentos</strong>
            <small>Status e cancelamentos</small>
          </div>
        </button>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-panel" aria-labelledby="next-title">
          <div className="panel-heading">
            <div>
              <h2 id="next-title">Resumo da agenda</h2>
              <p className="panel-text">
                Acompanhe os horários reais pela tela de agenda.
              </p>
            </div>
            <button
              className="button button-secondary button-small"
              onClick={() => navigate('/agenda')}
              type="button"
            >
              Ver agenda
            </button>
          </div>

          <div className="dashboard-empty">
            <span className="empty-icon" aria-hidden="true">
              <CalendarCheck size={24} strokeWidth={2} />
            </span>
            <div>
              <strong>Agenda pronta para uso</strong>
              <p>
                Use a área de agenda para visualizar clientes, serviços,
                profissionais, horários e status dos agendamentos cadastrados.
              </p>
            </div>
          </div>
        </article>

        <article className="dashboard-panel" aria-labelledby="status-title">
          <h2 id="status-title">Atalhos rápidos</h2>
          <p className="panel-text">
            Continue a configuração do sistema sem perder tempo.
          </p>
          <div className="status-summary status-actions">
            <button
              className="status-action"
              onClick={() => navigate('/servicos')}
              type="button"
            >
              <span className="status-action-icon" aria-hidden="true">
                <Scissors size={18} strokeWidth={2} />
              </span>
              Cadastrar serviços
            </button>
            <button
              className="status-action"
              onClick={() => navigate('/profissionais')}
              type="button"
            >
              <span className="status-action-icon status-action-blue" aria-hidden="true">
                <Users size={18} strokeWidth={2} />
              </span>
              Cadastrar profissionais
            </button>
            <button
              className="status-action"
              onClick={() => navigate('/agenda')}
              type="button"
            >
              <span className="status-action-icon status-action-yellow" aria-hidden="true">
                <CalendarDays size={18} strokeWidth={2} />
              </span>
              Ver agenda
            </button>
          </div>
        </article>
      </section>

      <section className="shortcut-strip" aria-label="Atalhos do sistema">
        <button
          className="quick-action"
          onClick={() => navigate('/negocio')}
          type="button"
        >
          <span className="quick-icon" aria-hidden="true">
            <Store size={20} strokeWidth={2} />
          </span>
          <strong>Meu negócio</strong>
          <small>Dados e link público</small>
        </button>
        <button
          className="quick-action"
          onClick={() => navigate('/servicos')}
          type="button"
        >
          <span className="quick-icon" aria-hidden="true">
            <Scissors size={20} strokeWidth={2} />
          </span>
          <strong>Serviços</strong>
          <small>Preços e duração</small>
        </button>
        <button
          className="quick-action"
          onClick={() => navigate('/profissionais')}
          type="button"
        >
          <span className="quick-icon" aria-hidden="true">
            <Users size={20} strokeWidth={2} />
          </span>
          <strong>Profissionais</strong>
          <small>Equipe de atendimento</small>
        </button>
      </section>
    </DashboardShell>
  );
}

export default Dashboard;
