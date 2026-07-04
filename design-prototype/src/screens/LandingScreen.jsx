import { ArrowRight, CalendarCheck2, CheckCircle2, Clock3, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { Brand } from '../components/Brand';

export function LandingScreen({ onEnter, onPublic }) {
  return <main className="landing-demo">
    <nav className="landing-nav"><Brand /><div><button>Como funciona</button><button>Recursos</button><button>Para quem é</button></div><span><button className="button ghost" onClick={onEnter}>Entrar</button><button className="button primary" onClick={onEnter}>Começar agora</button></span></nav>
    <section className="landing-hero"><div className="landing-copy"><span className="landing-chip"><Sparkles size={16} /> Feito para quem vive de atendimento</span><h1>Mais tempo atendendo. Menos tempo organizando.</h1><p>Uma agenda online profissional para transformar mensagens soltas em horários confirmados, clientes bem atendidos e uma rotina previsível.</p><div><button className="button primary large" onClick={onEnter}>Conhecer meu painel <ArrowRight size={18} /></button><button className="button secondary large" onClick={onPublic}>Ver experiência do cliente</button></div><small><ShieldCheck size={15} /> Seus dados e os de seus clientes sempre protegidos.</small></div>
      <div className="landing-product"><div className="landing-product-head"><span><i /> Hoje, 4 de julho</span><strong>Agenda em movimento</strong></div><div className="landing-next"><span><CalendarCheck2 size={24} /></span><div><small>Próximo atendimento</small><strong>Lucas Ferreira</strong><p>Corte degradê + barba</p></div><time>15:30</time></div>{[['09:00', 'Rafael Almeida', 'Confirmado'], ['10:15', 'Marcos Vinícius', 'Pendente'], ['13:30', 'Bruno Santos', 'Em atendimento']].map(([time, name, status]) => <div className="landing-appointment" key={time}><time>{time}</time><span><strong>{name}</strong><small>Corte degradê</small></span><em>{status}</em></div>)}</div>
    </section>
    <section className="landing-trust"><span><CheckCircle2 /> Sem conflito de horários</span><span><UsersRound /> Clientes organizados</span><span><Clock3 /> Disponível 24 horas</span><span><ShieldCheck /> Operação segura</span></section>
  </main>;
}
