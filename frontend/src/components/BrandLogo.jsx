function BrandLogo({ compact = false, onClick }) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      aria-label={onClick ? 'Voltar para a pagina inicial' : 'Agendai'}
      className={`brand-logo ${onClick ? 'brand-logo-button' : ''}`}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      <span className="brand-mark" aria-hidden="true">
        <span />
      </span>
      {!compact && <span className="brand-name">Agendai</span>}
    </Component>
  );
}

export default BrandLogo;
