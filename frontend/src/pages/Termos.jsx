import BrandLogo from '../components/BrandLogo';

function Termos() {
  return (
    <main className="legal-page page">
      <header className="legal-header">
        <a href="/" aria-label="Ir para o inicio"><BrandLogo /></a>
        <a href="/privacidade">Politica de Privacidade</a>
      </header>
      <article className="legal-content">
        <p className="eyebrow">Ultima atualizacao: 24 de agosto de 2026</p>
        <h1>Termos de Uso</h1>
        <p>Estes termos regulam o acesso do empreendedor ao Agendai, plataforma para organizar negócios, serviços, profissionais e agendamentos.</p>
        <h2>Conta e responsabilidades</h2>
        <p>O empreendedor deve fornecer informações verdadeiras, manter suas credenciais em sigilo e configurar um contato de privacidade válido antes de receber agendamentos públicos. Ele é responsável pelos dados pessoais que decide coletar de seus clientes e por atender as solicitações encaminhadas pelo canal LGPD.</p>
        <h2>Uso permitido</h2>
        <p>O serviço deve ser usado apenas para administrar atendimentos legítimos. É proibido usar a plataforma para atividades ilícitas, coletar dados excessivos ou sensíveis sem base legal adequada, tentar acessar dados de outro negócio ou interferir na segurança do serviço.</p>
        <h2>Disponibilidade e alterações</h2>
        <p>O Agendai pode atualizar recursos, segurança e estes termos. Mudanças relevantes serão registradas com nova versão e apresentadas quando necessário. A plataforma busca disponibilidade contínua, mas não substitui práticas de backup, verificação de agenda e atendimento do negócio.</p>
        <h2>Privacidade</h2>
        <p>O tratamento de dados pessoais é descrito na <a href="/privacidade">Politica de Privacidade</a>, que integra estes termos.</p>
      </article>
    </main>
  );
}

export default Termos;
