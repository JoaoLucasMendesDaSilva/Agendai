import { CalendarDays, CheckCircle2, ChevronDown, Clock3, Scissors, TrendingUp, UserRound, UsersRound } from 'lucide-react';
import { agenda, dias, semana } from '../data';
import { Avatar, Status } from '../components/Brand';

const metrics = [
  ['Agendamentos', '128', '+18% esta semana', CalendarDays, 'green'],
  ['Clientes únicos', '74', '+12% este mês', UsersRound, 'blue'],
  ['Serviços ativos', '12', 'Portfólio disponível', Scissors, 'violet'],
  ['Profissionais', '5', '+1 nos últimos 30 dias', UserRound, 'amber'],
];

export function DashboardScreen({ onNavigate }) {
  return (
    <div className="screen dashboard-screen">
      <header className="page-header">
        <div><h1>Bom dia, João.</h1><p>A operação da Barbearia Suprema está em ordem hoje.</p></div>
        <button className="date-button"><CalendarDays size={18} /> Hoje, 4 de julho <ChevronDown size={15} /></button>
      </header>

      <section className="metrics-row" aria-label="Resumo do negócio">
        {metrics.map(([label, value, detail, Icon, color]) => (
          <article className="metric" key={label}>
            <span className={`metric-icon tone-${color}`}><Icon size={21} /></span>
            <div><small>{label}</small><strong>{value}</strong><p><TrendingUp size={13} />{detail}</p></div>
          </article>
        ))}
      </section>

      <section className="dashboard-primary-grid">
        <article className="next-appointment">
          <div className="section-heading"><div><small>Próximo atendimento</small><h2>Faltam 18 minutos</h2></div><button onClick={() => onNavigate('agenda')}>Abrir agenda</button></div>
          <div className="next-person">
            <Avatar name="Lucas Ferreira" size="lg" />
            <div><h3>Lucas Ferreira</h3><p>Corte degradê + barba</p><span>com João Victor</span></div>
            <div className="next-time"><strong>15:30</strong><span>60 minutos</span><Status>Confirmado</Status></div>
          </div>
          <div className="next-actions"><button className="button secondary">Ver cliente</button><button className="button primary"><CheckCircle2 size={17} /> Iniciar atendimento</button></div>
        </article>

        <article className="weekly-panel panel">
          <div className="section-heading"><div><small>Ritmo da semana</small><h2>148 agendamentos</h2></div><span className="positive-copy">+14% vs. semana anterior</span></div>
          <div className="bar-chart" aria-label="Agendamentos por dia">
            {semana.map((value, index) => <div className="bar-column" key={dias[index]}><span>{value}</span><i style={{ height: `${Math.max(18, value * 2.35)}px` }} /><small>{dias[index]}</small></div>)}
          </div>
        </article>
      </section>

      <section className="dashboard-secondary-grid">
        <article className="panel compact-list">
          <div className="section-heading"><h2>Agenda de hoje</h2><button onClick={() => onNavigate('agenda')}>Ver tudo</button></div>
          {agenda.slice(0, 4).map((item) => <div className="schedule-line" key={item.id}><time>{item.hora}</time><span className="timeline-dot" /><div><strong>{item.cliente}</strong><small>{item.servico}</small></div><Status>{item.status}</Status></div>)}
        </article>
        <article className="panel activity-panel">
          <div className="section-heading"><h2>Atividade recente</h2><button>Ver histórico</button></div>
          {[
            [CalendarDays, 'Novo agendamento criado', 'Rafael Almeida · Corte degradê', '14:42'],
            [CheckCircle2, 'Agendamento confirmado', 'Marcos Vinícius · Barba', '13:15'],
            [UsersRound, 'Cliente recorrente identificado', 'Lucas Santos · 12 visitas', '11:08'],
            [Clock3, 'Horário reagendado', 'Juliana Martins · 10:00', '09:45'],
          ].map(([Icon, title, detail, time]) => <div className="activity-line" key={title}><span><Icon size={16} /></span><div><strong>{title}</strong><small>{detail}</small></div><time>{time}</time></div>)}
        </article>
        <article className="panel service-ranking">
          <div className="section-heading"><h2>Serviços em destaque</h2><button onClick={() => onNavigate('servicos')}>Gerenciar</button></div>
          {[['Corte degradê', 56, 100], ['Barba', 42, 75], ['Corte + barba', 28, 50], ['Pigmentação', 18, 32]].map(([name, total, width], index) => <div className="ranking-line" key={name}><b>{index + 1}</b><div><span><strong>{name}</strong><small>{total} agendamentos</small></span><i><em style={{ width: `${width}%` }} /></i></div></div>)}
        </article>
      </section>
    </div>
  );
}
