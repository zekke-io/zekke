import type { ReactNode } from 'react';

const HIGHLIGHT = 'M30 4h36a24 24 0 0 1 24 24v2H6v-2A24 24 0 0 1 30 4Z';

function FeatureTile({ color, highlight = 0.14, children }: { color: string; highlight?: number; children: ReactNode }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 96 96" fill="none" className="h-full w-full">
      <ellipse cx="48" cy="91" rx="32" ry="3" fill="#2A1608" opacity={0.16} />
      <rect x="6" y="4" width="84" height="82" rx="24" fill={color} />
      <path d={HIGHLIGHT} fill="#fff" opacity={highlight} />
      {children}
    </svg>
  );
}

export function SecretsFeatureIcon() {
  return (
    <FeatureTile color="#6B4CF0">
      <circle cx="48" cy="45" r="26" fill="#FFF4E8" />
      <circle cx="48" cy="45" r="18" stroke="#6B4CF0" strokeWidth={4} />
      <path d="M48 33v24M36 45h24" stroke="#6B4CF0" strokeWidth={4} strokeLinecap="round" />
      <circle cx="48" cy="45" r="5.5" fill="#FFB066" />
    </FeatureTile>
  );
}

export function PasswordsFeatureIcon() {
  return (
    <FeatureTile color="#E8590C">
      <circle cx="37" cy="39" r="13" stroke="#FFF4E8" strokeWidth={7} />
      <circle cx="37" cy="39" r="3.5" fill="#FFB066" />
      <path d="M47 49L71 71M61 61l7-7M67 67l7-7" stroke="#FFF4E8" strokeWidth={6.5} strokeLinecap="round" />
    </FeatureTile>
  );
}

export function NotesFeatureIcon() {
  return (
    <FeatureTile color="#FFB066" highlight={0.22}>
      <g transform="rotate(-5 48 45)">
        <rect x="27" y="20" width="42" height="50" rx="8" fill="#fff" />
        <rect x="35" y="32" width="22" height="5" rx="2.5" fill="#E8590C" />
        <rect x="35" y="43" width="26" height="4" rx="2" fill="#E8590C" fillOpacity={0.45} />
        <rect x="35" y="52" width="18" height="4" rx="2" fill="#E8590C" fillOpacity={0.45} />
      </g>
    </FeatureTile>
  );
}

export function DocumentsFeatureIcon() {
  return (
    <FeatureTile color="#2F63D6">
      <rect x="24" y="19" width="40" height="52" rx="7" fill="#fff" />
      <rect x="31" y="30" width="18" height="6" rx="3" fill="#2F63D6" />
      <rect x="31" y="42" width="26" height="4" rx="2" fill="#2F63D6" fillOpacity={0.4} />
      <rect x="31" y="51" width="20" height="4" rx="2" fill="#2F63D6" fillOpacity={0.4} />
      <g transform="translate(70 38) rotate(38)">
        <rect x="-5" y="0" width="10" height="29" rx="3" fill="#FFB066" stroke="#1E4DB7" strokeWidth={2.5} />
        <path d="M-5 29h10l-5 9Z" fill="#fff" stroke="#1E4DB7" strokeWidth={2.5} strokeLinejoin="round" />
      </g>
    </FeatureTile>
  );
}

export function SpreadsheetsFeatureIcon() {
  return (
    <FeatureTile color="#1F8A4C">
      <rect x="23" y="22" width="50" height="46" rx="7" fill="#fff" />
      <path d="M23 29a7 7 0 0 1 7-7h36a7 7 0 0 1 7 7v7H23Z" fill="#1F8A4C" fillOpacity={0.4} />
      <path d="M40 22v46M56 22v46M23 36h50M23 52h50" stroke="#1F8A4C" strokeWidth={2.5} />
      <rect x="23" y="22" width="50" height="46" rx="7" stroke="#1F8A4C" strokeWidth={2.5} />
    </FeatureTile>
  );
}

export function DriveFeatureIcon() {
  return (
    <FeatureTile color="#FF7A1A">
      <path
        d="M22 33a6 6 0 0 1 6-6h13l6 6h21a6 6 0 0 1 6 6v25a6 6 0 0 1-6 6H28a6 6 0 0 1-6-6Z"
        fill="#FFF4E8"
      />
      <path d="M22 42a6 6 0 0 1 6-6h40a6 6 0 0 1 6 6v22a6 6 0 0 1-6 6H28a6 6 0 0 1-6-6Z" fill="#FFB066" />
      <circle cx="48" cy="51" r="5" fill="#2A1608" />
      <rect x="46.5" y="53" width="3" height="10" rx="1.5" fill="#2A1608" />
    </FeatureTile>
  );
}

export function TrashFeatureIcon() {
  return (
    <FeatureTile color="#6B5444">
      <rect x="42" y="19" width="12" height="7" rx="3" fill="#FFF4E8" />
      <rect x="26" y="25" width="44" height="8" rx="4" fill="#FFF4E8" />
      <path d="M31 37h34l-2.5 29a6 6 0 0 1-6 5.5H39.5a6 6 0 0 1-6-5.5Z" fill="#FFF4E8" />
      <path d="M42 44v21M48 44v21M54 44v21" stroke="#6B5444" strokeWidth={3.5} strokeLinecap="round" />
    </FeatureTile>
  );
}

export function SharingFeatureIcon() {
  return (
    <FeatureTile color="#0E7C6B">
      <path d="M30 46h36" stroke="#FFF4E8" strokeWidth={5} strokeDasharray="2 8" strokeLinecap="round" />
      <circle cx="27" cy="46" r="11" fill="#FFF4E8" />
      <circle cx="69" cy="46" r="11" fill="#FFF4E8" />
      <rect x="40" y="46" width="16" height="13" rx="4" fill="#FFB066" />
      <path d="M43.5 46v-4a4.5 4.5 0 0 1 9 0v4" stroke="#FFB066" strokeWidth={3.5} strokeLinecap="round" />
      <circle cx="48" cy="52" r="2" fill="#2A1608" />
    </FeatureTile>
  );
}

export function CalendarFeatureIcon() {
  return (
    <FeatureTile color="#D93036">
      <rect x="23" y="26" width="50" height="44" rx="9" fill="#FFF4E8" />
      <path d="M23 35a9 9 0 0 1 9-9h32a9 9 0 0 1 9 9v5H23Z" fill="#FFB066" />
      <rect x="35" y="19" width="6" height="14" rx="3" fill="#2A1608" />
      <rect x="55" y="19" width="6" height="14" rx="3" fill="#2A1608" />
      <g fill="#D93036">
        <circle cx="35" cy="50" r="3.5" />
        <circle cx="48" cy="50" r="3.5" />
        <circle cx="61" cy="50" r="3.5" />
        <circle cx="35" cy="61" r="3.5" />
        <circle cx="48" cy="61" r="3.5" />
      </g>
    </FeatureTile>
  );
}

export function TodoFeatureIcon() {
  return (
    <FeatureTile color="#9C3FD0">
      <circle cx="31" cy="28" r="7" fill="#FFB066" />
      <path d="M27.5 28l2.5 2.8 5-5.8" stroke="#2A1608" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="31" cy="46" r="7" stroke="#FFF4E8" strokeWidth={3.5} />
      <circle cx="31" cy="64" r="7" stroke="#FFF4E8" strokeWidth={3.5} />
      <rect x="44" y="25.5" width="28" height="5" rx="2.5" fill="#FFF4E8" fillOpacity={0.55} />
      <rect x="44" y="43.5" width="26" height="5" rx="2.5" fill="#FFF4E8" />
      <rect x="44" y="61.5" width="20" height="5" rx="2.5" fill="#FFF4E8" />
    </FeatureTile>
  );
}

export function DiaryFeatureIcon() {
  return (
    <FeatureTile color="#8B3A1E">
      <rect x="26" y="18" width="44" height="54" rx="7" fill="#FFF4E8" />
      <path d="M26 25a7 7 0 0 1 7-7h5v54h-5a7 7 0 0 1-7-7Z" fill="#FFB066" />
      <rect x="45" y="33" width="19" height="4" rx="2" fill="#8B3A1E" fillOpacity={0.55} />
      <rect x="45" y="42" width="14" height="4" rx="2" fill="#8B3A1E" fillOpacity={0.55} />
      <path d="M58 18v19l-5-4-5 4V18Z" fill="#2A1608" />
    </FeatureTile>
  );
}
