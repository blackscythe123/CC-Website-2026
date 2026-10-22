/**
 * Small empty-state illustrations drawn for Studio. They only use theme variables,
 * so they read correctly in light and dark mode.
 */

type Props = { className?: string };

const stroke = { stroke: "var(--border-strong)", strokeWidth: 2, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function AllCaughtUp({ className }: Props) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden>
      <rect x="28" y="20" width="104" height="80" rx="12" fill="var(--surface-2)" />
      <rect x="44" y="38" width="56" height="8" rx="4" fill="var(--border-strong)" />
      <rect x="44" y="54" width="72" height="6" rx="3" fill="var(--border)" />
      <rect x="44" y="66" width="48" height="6" rx="3" fill="var(--border)" />
      <circle cx="118" cy="86" r="20" fill="var(--success-bg)" />
      <path d="M109 86l6 6 12-12" stroke="var(--success)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function NoDrafts({ className }: Props) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden>
      <path d="M30 36a8 8 0 0 1 8-8h26l10 10h48a8 8 0 0 1 8 8v46a8 8 0 0 1-8 8H38a8 8 0 0 1-8-8z" fill="var(--surface-2)" />
      <path d="M30 50h100" {...stroke} />
      <rect x="54" y="62" width="52" height="6" rx="3" fill="var(--border-strong)" />
      <rect x="62" y="74" width="36" height="6" rx="3" fill="var(--border)" />
      <circle cx="122" cy="34" r="12" fill="var(--accent-soft)" />
      <path d="M118 34h8M122 30v8" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function NoArticles({ className }: Props) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden>
      <rect x="40" y="16" width="70" height="88" rx="10" fill="var(--surface-2)" />
      <rect x="52" y="30" width="46" height="7" rx="3.5" fill="var(--border-strong)" />
      <rect x="52" y="46" width="40" height="5" rx="2.5" fill="var(--border)" />
      <rect x="52" y="57" width="44" height="5" rx="2.5" fill="var(--border)" />
      <rect x="52" y="68" width="30" height="5" rx="2.5" fill="var(--border)" />
      <circle cx="112" cy="78" r="18" fill="var(--bg)" stroke="var(--border-strong)" strokeWidth="4" />
      <path d="M125 91l10 10" stroke="var(--border-strong)" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export function NoApplications({ className }: Props) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden>
      <circle cx="62" cy="48" r="16" fill="var(--surface-2)" />
      <path d="M36 92c2-16 13-24 26-24s24 8 26 24" fill="var(--surface-2)" />
      <circle cx="104" cy="54" r="12" fill="var(--border)" />
      <path d="M86 92c1-12 9-18 18-18s17 6 18 18" fill="var(--border)" />
      <rect x="96" y="20" width="36" height="22" rx="6" fill="var(--info-bg)" />
      <path d="M104 31h20" stroke="var(--info)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function SignInHero({ className }: Props) {
  return (
    <svg viewBox="0 0 240 140" className={className} aria-hidden>
      <defs>
        <linearGradient id="studio-hero" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="#9333EA" />
        </linearGradient>
      </defs>
      <rect x="20" y="18" width="150" height="104" rx="14" fill="var(--surface-2)" />
      <rect x="36" y="36" width="70" height="10" rx="5" fill="var(--border-strong)" />
      <rect x="36" y="56" width="110" height="6" rx="3" fill="var(--border)" />
      <rect x="36" y="68" width="96" height="6" rx="3" fill="var(--border)" />
      <rect x="36" y="80" width="104" height="6" rx="3" fill="var(--border)" />
      <rect x="36" y="98" width="44" height="12" rx="6" fill="url(#studio-hero)" />
      <circle cx="186" cy="52" r="26" fill="url(#studio-hero)" opacity="0.9" />
      <path d="M176 52l-6 0M196 52l6 0M186 42v-6M186 62v6" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <circle cx="186" cy="52" r="7" fill="#fff" />
      <rect x="160" y="88" width="62" height="34" rx="10" fill="var(--bg)" stroke="var(--border-strong)" strokeWidth="2" />
      <path d="M172 105l7 7 14-14" stroke="var(--success)" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
