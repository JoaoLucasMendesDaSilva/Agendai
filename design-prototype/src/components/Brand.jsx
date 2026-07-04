import { CalendarCheck2 } from 'lucide-react';

export function Brand({ compact = false }) {
  return (
    <span className="brand" aria-label="Agendai">
      <span className="brand-mark"><CalendarCheck2 size={22} strokeWidth={2.2} /></span>
      {!compact && <strong>Agendai</strong>}
    </span>
  );
}

export function Avatar({ name, size = 'md', src }) {
  const initials = name.split(' ').slice(0, 2).map((part) => part[0]).join('');
  return <span className={`avatar avatar-${size} ${src ? 'avatar-image' : ''}`} aria-hidden="true">{src ? <img src={src} alt="" /> : initials}</span>;
}

export function Status({ children }) {
  const slug = children.toLowerCase().replace(' ', '-');
  return <span className={`status status-${slug}`}>{children}</span>;
}
