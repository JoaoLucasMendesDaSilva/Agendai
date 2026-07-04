import { CalendarDays, CheckCircle2, ChevronDown, MoreHorizontal, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { agenda } from '../data';
import { Avatar, Status } from '../components/Brand';

const filters = ['Todos', 'Hoje', 'Pendentes', 'Confirmados', 'Cancelados'];

export function AgendaScreen() {
  const [filter, setFilter] = useState('Todos');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => agenda.filter((item) => {
    const search = `${item.cliente} ${item.servico} ${item.telefone}`.toLowerCase();
    const statusOk = filter === 'Todos' || (filter === 'Hoje' ? item.grupo === 'Hoje' : item.status === filter.replace(/s$/, ''));
    return statusOk && search.includes(query.toLowerCase());
  }), [filter, query]);

  return (
    <div className="screen agenda-screen">
      <header className="page-header"><div><h1>Agenda</h1><p>Gerencie os atendimentos e mantenha o dia fluindo.</p></div><button className="button primary"><CalendarDays size={17} /> Novo agendamento</button></header>
      <section className="agenda-overview">
        {[['Agendamentos hoje', '12', 'blue'], ['Confirmados', '8', 'green'], ['Pendentes', '3', 'amber'], ['Vagas disponíveis', '6', 'violet']].map(([label, value, tone]) => <div key={label}><span className={`overview-dot tone-${tone}`} /><small>{label}</small><strong>{value}</strong></div>)}
      </section>
      <section className="agenda-toolbar">
        <div className="filter-tabs">{filters.map((item) => <button className={filter === item ? 'active' : ''} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
        <div className="toolbar-actions">
          <label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, serviço ou telefone" /></label>
          <button className="filter-control"><SlidersHorizontal size={17} /> Filtros</button>
          <button className="filter-control"><CalendarDays size={17} /> 4 jul <ChevronDown size={15} /></button>
        </div>
      </section>

      <section className="agenda-table" aria-label="Lista de agendamentos">
        {['Hoje', 'Amanhã'].map((group) => {
          const groupItems = filtered.filter((item) => item.grupo === group);
          if (!groupItems.length) return null;
          return <div className="agenda-group" key={group}><div className="agenda-group-title"><strong>{group}</strong><span>{group === 'Hoje' ? '4 de julho de 2026' : '5 de julho de 2026'}</span><i>{groupItems.length} atendimentos</i></div>
            {groupItems.map((item) => <article className="appointment-row" key={item.id}>
              <div className="appointment-time"><strong>{item.hora}</strong><small>{item.duracao}</small></div>
              <div className="appointment-client"><Avatar name={item.cliente} size="sm" /><span><strong>{item.cliente}</strong><small>{item.telefone}</small></span></div>
              <div className="appointment-service"><strong>{item.servico}</strong><small>{item.profissional}</small></div>
              <Status>{item.status}</Status>
              <div className="row-actions"><button className="row-primary"><CheckCircle2 size={16} />{item.status === 'Pendente' ? 'Confirmar' : 'Concluir'}</button><button className="icon-button"><MoreHorizontal size={19} /></button></div>
            </article>)}
          </div>;
        })}
        {!filtered.length && <div className="empty-result"><CalendarDays size={30} /><h3>Nenhum agendamento encontrado</h3><p>Altere os filtros ou faça uma nova busca.</p></div>}
      </section>
    </div>
  );
}
