function PanelSkeleton({ label = 'Carregando conteúdo...', lines = 3 }) {
  return (
    <div className="panel-skeleton" aria-busy="true" role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">
        {Array.from({ length: lines }).map((_, index) => (
          <span
            className={`skeleton-line skeleton-row skeleton-row-${index + 1}`}
            key={index}
          />
        ))}
      </div>
    </div>
  );
}

export default PanelSkeleton;
