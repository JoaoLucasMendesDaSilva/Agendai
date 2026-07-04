import { CalendarPlus, Download, Filter, Mail, Phone, Search, UserRound, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { clientes } from '../data';
import { Avatar, Status } from '../components/Brand';

export function ClientsScreen() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(1);
  const filtered = useMemo(() => clientes.filter((client) => `${client.nome} ${client.email} ${client.telefone}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const selected = clientes.find((client) => client.id === selectedId) || filtered[0];

  return (
    <div className="screen clients-screen">
      <header className="page-header"><div><h1>Clientes</h1><p>Conheça quem volta, acompanhe preferências e mantenha o relacionamento próximo.</p></div><button className="button primary"><CalendarPlus size={17} /> Novo agendamento</button></header>
      <section className="metrics-row client-metrics">
        {[[UsersRound, 'Total de clientes', '326', '+14% no mês'], [UserRound, 'Clientes recorrentes', '214', '66% da base'], [CalendarPlus, 'Novos em 30 dias', '38', '+19% no período']].map(([Icon, label, value, detail]) => <article className="metric" key={label}><span className="metric-icon tone-green"><Icon size={21} /></span><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div></article>)}
      </section>
      <div className="clients-layout">
        <section className="clients-main panel">
          <div className="clients-toolbar">
            <label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, telefone ou e-mail" /></label>
            <button className="filter-control"><Filter size={17} /> Filtros</button>
            <button className="filter-control"><Download size={17} /> Exportar</button>
          </div>
          <div className="client-table" role="table">
            <div className="client-table-head" role="row"><span>Cliente</span><span>Contato</span><span>Agendamentos</span><span>Último atendimento</span></div>
            {filtered.map((client) => <button role="row" className={`client-row ${client.id === selected?.id ? 'selected' : ''}`} key={client.id} onClick={() => setSelectedId(client.id)}>
              <span className="client-identity"><Avatar name={client.nome} size="sm" /><span><strong>{client.nome}</strong>{client.recorrente && <Status>Recorrente</Status>}</span></span>
              <span className="client-contact"><small>{client.telefone}</small><small>{client.email}</small></span>
              <strong>{client.total}</strong><span>{client.ultimo}</span>
            </button>)}
            {!filtered.length && <div className="empty-result"><UsersRound size={30} /><h3>Nenhum cliente encontrado</h3><p>Revise o termo digitado.</p></div>}
          </div>
        </section>

        {selected && <aside className="client-profile panel">
          <div className="profile-heading"><Avatar name={selected.nome} size="lg" /><div><h2>{selected.nome}</h2>{selected.recorrente && <Status>Recorrente</Status>}</div></div>
          <div className="profile-contact"><span><Phone size={16} />{selected.telefone}</span><span><Mail size={16} />{selected.email}</span></div>
          <button className="button primary full"><CalendarPlus size={17} /> Novo agendamento</button>
          <div className="profile-section"><h3>Resumo</h3><dl><div><dt>Total de agendamentos</dt><dd>{selected.total}</dd></div><div><dt>Frequência média</dt><dd>{selected.frequencia}</dd></div><div><dt>Serviço preferido</dt><dd>{selected.favorito}</dd></div><div><dt>Profissional preferido</dt><dd>{selected.profissional}</dd></div></dl></div>
          <div className="profile-section"><h3>Histórico recente</h3>{[['04/07/2026', 'Corte degradê + barba', '15:30'], ['18/06/2026', selected.favorito, '16:00'], ['29/05/2026', 'Barba', '14:30']].map(([date, service, time]) => <div className="history-row" key={date}><span><strong>{date} · {time}</strong><small>{service}</small></span><Status>Concluído</Status></div>)}</div>
        </aside>}
      </div>
    </div>
  );
}
