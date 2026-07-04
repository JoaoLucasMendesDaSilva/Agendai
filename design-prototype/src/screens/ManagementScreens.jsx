import { CalendarDays, Check, Clock3, Copy, ExternalLink, MapPin, MoreHorizontal, Plus, Scissors, Star, ToggleLeft, ToggleRight, UsersRound, X } from 'lucide-react';
import { useState } from 'react';
import { profissionais, servicos } from '../data';
import { Avatar, Status } from '../components/Brand';

export function ServicesScreen() {
  const [items, setItems] = useState(servicos);
  const [modal, setModal] = useState(false);
  const toggle = (id) => setItems((current) => current.map((item) => item.id === id ? { ...item, ativo: !item.ativo } : item));
  return <ManagementPage icon={Scissors} title="Serviços" description="Organize seu catálogo com preços, duração e disponibilidade claros." action="Novo serviço" onAction={() => setModal(true)}>
    <div className="catalog-grid">{items.map((item) => <article className="catalog-card" key={item.id}><div className="catalog-icon"><Scissors size={20} /></div><div className="catalog-copy"><div><h3>{item.nome}</h3><Status>{item.ativo ? 'Ativo' : 'Inativo'}</Status></div><p>{item.descricao}</p><span><Clock3 size={15} />{item.duracao}<strong>{item.preco}</strong></span></div><div className="catalog-actions"><button onClick={() => toggle(item.id)} aria-label="Alterar status">{item.ativo ? <ToggleRight size={25} /> : <ToggleLeft size={25} />}</button><button aria-label={`Mais opções para ${item.nome}`}><MoreHorizontal size={19} /></button></div></article>)}</div>
    {modal && <QuickModal title="Novo serviço" onClose={() => setModal(false)} fields={['Nome do serviço', 'Duração em minutos', 'Preço']} />}
  </ManagementPage>;
}

export function ProfessionalsScreen() {
  const [modal, setModal] = useState(false);
  return <ManagementPage icon={UsersRound} title="Profissionais" description="Acompanhe a equipe, especialidades e ocupação da agenda." action="Novo profissional" onAction={() => setModal(true)}>
    <div className="professionals-grid">{profissionais.map((professional) => <article className="professional-card" key={professional.id}><div className="professional-top"><Avatar name={professional.nome} size="lg" src={professional.foto} /><Status>{professional.ativo ? 'Ativo' : 'Inativo'}</Status></div><h3>{professional.nome}</h3><p>{professional.especialidade}</p><div className="professional-stats"><span><CalendarDays size={15} /><strong>{professional.agenda}</strong> esta semana</span><span><Star size={15} /><strong>{professional.avaliacao}</strong> avaliação</span></div><button className="button secondary full">Ver agenda</button></article>)}</div>
    {modal && <QuickModal title="Novo profissional" onClose={() => setModal(false)} fields={['Nome completo', 'Especialidade', 'Telefone']} />}
  </ManagementPage>;
}

export function BusinessScreen() {
  const [copied, setCopied] = useState(false);
  return <div className="screen business-screen">
    <header className="page-header"><div><h1>Meu negócio</h1><p>Configure a identidade, os horários e a experiência pública do seu negócio.</p></div><button className="button primary"><Check size={17} /> Salvar alterações</button></header>
    <div className="business-layout">
      <section className="panel business-form">
        <div className="section-heading"><div><small>Identidade</small><h2>Informações do negócio</h2></div></div>
        <div className="brand-upload"><span>BS</span><div><strong>Logo da Barbearia Suprema</strong><small>PNG ou JPG · até 2 MB</small><button>Alterar imagem</button></div></div>
        <div className="form-grid"><label>Nome do negócio<input defaultValue="Barbearia Suprema" /></label><label>Categoria<select defaultValue="barbearia"><option value="barbearia">Barbearia</option><option>Salão de beleza</option></select></label></div>
        <label>Descrição<textarea defaultValue="Excelência em cortes e cuidados masculinos. Estilo, confiança e atitude para todos os momentos." rows="4" /></label>
        <div className="form-grid"><label>Telefone<input defaultValue="(13) 98765-4321" /></label><label>Instagram<input defaultValue="@barbeariasuprema" /></label></div>
        <label>Endereço<input defaultValue="Rua das Palmeiras, 123 — Centro, Cubatão — SP" /></label>
        <div className="section-divider" />
        <div className="section-heading"><div><small>Disponibilidade</small><h2>Horários de atendimento</h2></div></div>
        {['Segunda a sexta', 'Sábado', 'Domingo'].map((day, index) => <div className="hours-row" key={day}><strong>{day}</strong><input type="time" defaultValue={index === 2 ? '10:00' : '09:00'} /><span>até</span><input type="time" defaultValue={index === 2 ? '16:00' : '20:00'} /><button>{index === 2 ? <ToggleLeft /> : <ToggleRight />}</button></div>)}
      </section>
      <aside className="business-aside">
        <section className="panel public-link-card"><span><ExternalLink size={20} /></span><h2>Seu link público</h2><p>Compartilhe este endereço para receber agendamentos.</p><div><code>agendai.com.br/barbearia-suprema</code><button aria-label="Copiar link público" onClick={() => setCopied(true)}><Copy size={16} /></button></div>{copied && <small className="copied-message">Link copiado!</small>}<button className="button secondary full">Abrir página pública</button></section>
        <section className="mini-public-preview"><div className="mini-cover"><span>BS</span></div><div><Status>Aberto agora</Status><h3>Barbearia Suprema</h3><p><MapPin size={14} /> Centro, Cubatão</p><button>Agendar horário</button></div></section>
      </aside>
    </div>
  </div>;
}

function ManagementPage({ icon: Icon, title, description, action, onAction, children }) {
  return <div className="screen management-screen"><header className="page-header"><div><h1>{title}</h1><p>{description}</p></div><button className="button primary" onClick={onAction}><Plus size={17} />{action}</button></header><section className="management-summary"><span><Icon size={20} /></span><div><strong>Catálogo profissional</strong><p>Informações atualizadas aparecem automaticamente na página pública.</p></div><Status>Sincronizado</Status></section>{children}</div>;
}

function QuickModal({ title, onClose, fields }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><small>Cadastro rápido</small><h2>{title}</h2></div><button onClick={onClose} aria-label="Fechar"><X size={18} /></button></div><div className="modal-fields">{fields.map((field) => <label key={field}>{field}<input placeholder={`Digite ${field.toLowerCase()}`} /></label>)}</div><div className="modal-actions"><button className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" onClick={onClose}><Check size={17} /> Salvar</button></div></section></div>;
}
