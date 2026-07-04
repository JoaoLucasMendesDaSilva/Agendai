import { CalendarCheck2, CalendarDays, Check, ChevronDown, ChevronLeft, Clock3, LockKeyhole, MapPin, Phone, Scissors, ShieldCheck, Star } from 'lucide-react';
import { useState } from 'react';
import { profissionais, servicos } from '../data';
import { Avatar, Brand, Status } from '../components/Brand';

const slots = ['09:00', '10:00', '11:00', '12:00', '13:30', '14:30', '15:30', '16:30', '17:30', '18:30'];

export function PublicBookingScreen({ onBack }) {
  const [serviceId, setServiceId] = useState(1);
  const [professionalId, setProfessionalId] = useState(1);
  const [slot, setSlot] = useState('11:00');
  const [confirmed, setConfirmed] = useState(false);
  const service = servicos.find((item) => item.id === serviceId);
  const professional = profissionais.find((item) => item.id === professionalId);

  if (confirmed) return <main className="public-booking"><div className="public-nav"><Brand /><button onClick={onBack}><ChevronLeft size={17} /> Voltar ao protótipo</button></div><section className="confirmation-screen"><span><CalendarCheck2 size={34} /></span><Status>Confirmado</Status><h1>Seu horário está reservado.</h1><p>Enviamos os detalhes do agendamento para o seu WhatsApp.</p><dl><div><dt>Serviço</dt><dd>{service.nome}</dd></div><div><dt>Profissional</dt><dd>{professional.nome}</dd></div><div><dt>Data e horário</dt><dd>4 de julho, às {slot}</dd></div></dl><button className="button primary" onClick={() => setConfirmed(false)}>Gerenciar agendamento</button></section></main>;

  return <main className="public-booking">
    <div className="public-nav"><Brand /><button onClick={onBack}><ChevronLeft size={17} /> Voltar ao protótipo</button></div>
    <header className="business-hero">
      <div className="business-monogram">BS</div>
      <div className="business-copy"><div><h1>Barbearia Suprema</h1><Status>Aberto agora</Status></div><p>Excelência em cortes e cuidados masculinos. Estilo, confiança e atitude em cada detalhe.</p><span><MapPin size={16} /> Rua das Palmeiras, 123 — Centro, Cubatão</span><span><Phone size={16} /> (13) 98765-4321</span></div>
      <div className="business-hours"><Clock3 size={19} /><span><strong>Hoje</strong><small>09:00 — 20:00</small></span></div>
    </header>
    <div className="booking-steps" aria-label="Etapas do agendamento">{[['1', 'Serviço'], ['2', 'Profissional'], ['3', 'Horário'], ['4', 'Seus dados']].map(([number, label], index) => <div className={index === 0 ? 'active' : ''} key={number}><span>{index === 0 ? <Check size={16} /> : number}</span><strong>{label}</strong></div>)}</div>
    <section className="booking-intro"><h2>Vamos agendar seu horário</h2><p>Escolha o serviço, o profissional e o melhor momento para você.</p></section>
    <div className="booking-grid">
      <section className="booking-column services-column"><div className="column-title"><span>1</span><h3>Escolha o serviço</h3></div>{servicos.filter((item) => item.ativo).slice(0, 4).map((item) => <button className={`booking-option ${serviceId === item.id ? 'selected' : ''}`} onClick={() => setServiceId(item.id)} key={item.id}><span className="option-icon"><Scissors size={19} /></span><span><strong>{item.nome}</strong><small><Clock3 size={13} />{item.duracao}</small></span><b>{item.preco}</b>{serviceId === item.id && <i><Check size={13} /></i>}</button>)}</section>
      <section className="booking-column choice-column"><div className="column-title"><span>2</span><h3>Escolha o profissional</h3></div><div className="professional-choice-grid">{profissionais.filter((item) => item.ativo).slice(0, 3).map((item) => <button className={professionalId === item.id ? 'selected' : ''} onClick={() => setProfessionalId(item.id)} key={item.id}><Avatar name={item.nome} size="lg" src={item.foto} /><strong>{item.nome}</strong><small>{item.especialidade}</small><span><Star size={13} /> {item.avaliacao}</span>{professionalId === item.id && <i><Check size={13} /></i>}</button>)}</div><div className="column-title schedule-title"><span>3</span><h3>Escolha o horário</h3></div><button className="date-select"><CalendarDays size={17} /> Hoje, 4 de julho <ChevronDown size={15} /></button><div className="slot-grid">{slots.map((time) => <button className={slot === time ? 'selected' : ''} onClick={() => setSlot(time)} key={time}>{time}</button>)}</div></section>
      <section className="booking-column details-column"><div className="column-title"><span>4</span><h3>Seus dados</h3></div><label>Nome completo<input placeholder="Digite seu nome" /></label><label>Telefone<input placeholder="(13) 99999-9999" /></label><label>E-mail<input placeholder="seu@email.com" /></label><label>Observações<textarea rows="3" placeholder="Alguma observação ou pedido especial?" /></label><label className="check-line"><input type="checkbox" defaultChecked /><span>Quero receber lembretes pelo WhatsApp.</span></label><button className="button primary full booking-confirm" onClick={() => setConfirmed(true)}><CalendarCheck2 size={18} /> Confirmar agendamento</button><p className="secure-copy"><LockKeyhole size={14} /> Seus dados estão seguros conosco.</p></section>
    </div>
    <footer className="public-footer"><span>Powered by <Brand /></span><span><ShieldCheck size={15} /> Agendamento protegido</span></footer>
  </main>;
}
