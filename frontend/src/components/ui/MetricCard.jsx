function MetricCard({ Icone, classeIcone = '', titulo, valor, detalhe, loading }) {
  return (
    <article
      aria-busy={loading || undefined}
      className={`metric-card ${loading ? 'is-loading' : ''}`}
    >
      <span className={`metric-icon ${classeIcone}`} aria-hidden="true">
        <Icone size={22} strokeWidth={2} />
      </span>
      <div>
        <p>{titulo}</p>
        {loading ? (
          <>
            <span className="skeleton-line skeleton-value" />
            <span className="skeleton-line skeleton-detail" />
          </>
        ) : (
          <>
            <strong>{valor}</strong>
            <small>{detalhe}</small>
          </>
        )}
      </div>
    </article>
  );
}

export default MetricCard;
