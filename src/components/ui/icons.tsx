import type { ReactNode, SVGProps } from 'react';
import type { FileKind } from '@/lib/app';

export type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0"
      {...props}
    >
      {children}
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9v5.5H5.5A1.5 1.5 0 0 1 4 19v-8.5Z" />
    </Icon>
  );
}

export function VaultIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 8.5V7.2" />
      <path d="M12 16.8v-1.3" />
      <path d="M15.5 12h1.3" />
      <path d="M7.2 12h1.3" />
    </Icon>
  );
}

export function PasswordsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="12" r="3.5" />
      <path d="M11.5 12H20" />
      <path d="M17 12v3" />
      <path d="M20 12v2.2" />
    </Icon>
  );
}

export function SecurityIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
      <path d="M12 14.5v2" />
    </Icon>
  );
}

export function SharingIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="17.5" cy="6.5" r="2.5" />
      <circle cx="6.5" cy="12" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
      <path d="M8.8 10.8 15.2 7.7" />
      <path d="m8.8 13.2 6.4 3.1" />
    </Icon>
  );
}

export function LockSessionIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    </Icon>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7" />
      <path d="m17 8 4 4-4 4" />
      <path d="M21 12H10" />
    </Icon>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </Icon>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.9 6.1a8.5 8.5 0 0 1 2.1-.3c6 0 9.5 6.2 9.5 6.2a16 16 0 0 1-2.7 3.4" />
      <path d="M6.4 7.9A16 16 0 0 0 2.5 12S6 18.2 12 18.2c1.4 0 2.7-.3 3.8-.9" />
      <path d="M10 10a2.8 2.8 0 0 0 3.9 3.9" />
      <path d="m4 4 16 16" />
    </Icon>
  );
}

export function ClipboardIcon(props: IconProps) {
  return (
    <Icon strokeWidth={1.7} className="h-4 w-4 shrink-0" {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon strokeWidth={1.7} className="h-4 w-4 shrink-0" {...props}>
      <path d="m5 13 4 4 10-10" />
    </Icon>
  );
}

export function NotesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M8.5 13h7" />
      <path d="M8.5 16.5h4.5" />
    </Icon>
  );
}

export function DocumentsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 2.5H8A2.5 2.5 0 0 0 5.5 5v14A2.5 2.5 0 0 0 8 21.5h8a2.5 2.5 0 0 0 2.5-2.5V6L15 2.5Z" />
      <path d="M14.5 2.5V6a1 1 0 0 0 1 1h3" />
      <path d="M9 11h6" />
      <path d="M9 14.5h6" />
      <path d="M9 18h3.5" />
    </Icon>
  );
}

export function DriveIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 13.5 6 5.5a2 2 0 0 1 1.9-1.4h8.2A2 2 0 0 1 18 5.5l2.5 8" />
      <path d="M3.5 13.5h17v4a2.5 2.5 0 0 1-2.5 2.5H6a2.5 2.5 0 0 1-2.5-2.5v-4Z" />
      <path d="M7 16.75h.01" />
      <path d="M10.5 16.75h.01" />
    </Icon>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M4.5 18.5h15" />
    </Icon>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 4v16h16" />
      <path d="M8 16v-4" />
      <path d="M12 16V8" />
      <path d="M16 16v-6" />
    </Icon>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </Icon>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </Icon>
  );
}

export function MonitorIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="12" rx="2.5" />
      <path d="M8 20h8M12 16v4" />
    </Icon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <path d="M4 17h4" />
      <path d="M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </Icon>
  );
}

export function PrintIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 9V4h10v5" />
      <path d="M7 17H5.5A1.5 1.5 0 0 1 4 15.5v-5A1.5 1.5 0 0 1 5.5 9h13a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17" />
      <path d="M7 14h10v6H7z" />
    </Icon>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 20.5v-11" />
      <path d="m7.5 13.5 4.5-4.5 4.5 4.5" />
      <path d="M4.5 5.5h15" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Icon>
  );
}

export function UndoIcon({ flipped, className = '', ...props }: IconProps & { flipped?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`${className} ${flipped ? '-scale-x-100' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M7 8H12.5a3.5 3.5 0 0 1 0 7H9" />
      <path d="M9.5 5.5 6.5 8l3 2.5" />
    </svg>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6l-12 12" />
    </Icon>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </Icon>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </Icon>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 6.5h11" />
      <path d="M9 12h11" />
      <path d="M9 17.5h11" />
      <path d="M4.5 6.5h.01" />
      <path d="M4.5 12h.01" />
      <path d="M4.5 17.5h.01" />
    </Icon>
  );
}

export function GripIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.6} {...props}>
      <path d="M9 6h.01" />
      <path d="M15 6h.01" />
      <path d="M9 12h.01" />
      <path d="M15 12h.01" />
      <path d="M9 18h.01" />
      <path d="M15 18h.01" />
    </Icon>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </Icon>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
      <path d="M3.5 4v4h4" />
      <path d="M12 8v4l3 2" />
    </Icon>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Icon strokeWidth={1.7} className="h-5 w-5 shrink-0" {...props}>
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </Icon>
  );
}

export function TitleIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2} {...props}>
      <path d="M6 5v14" />
      <path d="M18 5v14" />
      <path d="M6 12h12" />
    </Icon>
  );
}

export function TopicIcon(props: IconProps) {
  return (
    <Icon strokeWidth={1.7} {...props}>
      <circle cx="5" cy="7" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="17" r="1.1" fill="currentColor" stroke="none" />
      <path d="M10 7h9" />
      <path d="M10 12h9" />
      <path d="M10 17h9" />
    </Icon>
  );
}

export function TaskListIcon(props: IconProps) {
  return (
    <Icon strokeWidth={1.7} {...props}>
      <path d="m3.5 7 1.4 1.4L7.8 5.5" />
      <path d="m3.5 16 1.4 1.4 2.9-2.9" />
      <path d="M11 7h9" />
      <path d="M11 16h9" />
    </Icon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17" />
      <path d="M8 3.5v3" />
      <path d="M16 3.5v3" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 17.2h.01M12 17.2h.01" strokeWidth={2.4} />
    </Icon>
  );
}

export function DiaryIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 6 3.5Z" />
      <path d="M4.5 8H2.5M4.5 12H2.5M4.5 16H2.5" />
      <path d="M9 8.5h6M9 12h6" />
    </Icon>
  );
}

export function FolderIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h3.6a2 2 0 0 1 1.5.7l1.1 1.3h6.8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-10Z" />
    </Icon>
  );
}

export function FolderPlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h3.6a2 2 0 0 1 1.5.7l1.1 1.3h6.8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-10Z" />
      <path d="M12 11.5v5" />
      <path d="M9.5 14h5" />
    </Icon>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <Icon strokeWidth={1.7} className="h-4 w-4 shrink-0" {...props}>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17l-1 3Z" />
      <path d="m14.5 7.5 2 2" />
    </Icon>
  );
}

export function FolderGlyph({ open = false, ...props }: IconProps & { open?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 128 106" fill="none" className="h-full w-full" {...props}>
      <ellipse cx="64" cy="102" rx="52" ry="3.5" fill="#2a1608" opacity={0.16} />
      <path
        d="M8 14a8 8 0 0 1 8-8h30l10 10h56a8 8 0 0 1 8 8v66a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8Z"
        className="fill-folder-back"
      />
      <g className="transition-transform duration-200" transform={open ? 'translate(0 -6)' : undefined}>
        <rect x="20" y="22" width="88" height="44" rx="6" fill="#fff4e8" transform="rotate(-2 64 44)" />
        <rect x="24" y="16" width="80" height="48" rx="6" fill="#ffffff" transform="rotate(1.5 64 40)" />
        <g transform="rotate(1.5 64 40)">
          <rect x="32" y="26" width="30" height="5" rx="2.5" fill="#ff7a1a" />
          <rect x="32" y="36" width="64" height="4" rx="2" fill="#ffb066" opacity={0.7} />
          <rect x="32" y="45" width="48" height="4" rx="2" fill="#ffb066" opacity={0.7} />
        </g>
      </g>
      <path
        d="M8 42a8 8 0 0 1 8-8h96a8 8 0 0 1 8 8v46a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8Z"
        className="fill-folder-front"
      />
      <path d="M16 34h96a8 8 0 0 1 8 8v3H8v-3a8 8 0 0 1 8-8Z" className="fill-folder-shine" />
      <path d="M14 49h100" stroke="#fff" strokeOpacity={0.35} strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4.5 3.5V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
    </Icon>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </Icon>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 10a6 6 0 1 1 12 0c0 4.2 1.6 6 2 6.5H4c.4-.5 2-2.3 2-6.5Z" />
      <path d="M10 19.5a2.2 2.2 0 0 0 4 0" />
    </Icon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon strokeWidth={1.7} className="h-4 w-4 shrink-0" {...props}>
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7h12l-.8 12.1a1 1 0 0 1-1 .9H7.8a1 1 0 0 1-1-.9L6 7Z" />
      <path d="M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" />
    </Icon>
  );
}



type FileVariant = { tone: string; label: string; onTone: string };

const FILE_VARIANTS: Record<FileKind, FileVariant> = {
  pdf: { tone: 'text-file-pdf', label: 'PDF', onTone: 'fill-white' },
  document: { tone: 'text-file-document', label: 'DOC', onTone: 'fill-white' },
  sheet: { tone: 'text-file-sheet', label: 'XLS', onTone: 'fill-white' },
  slides: { tone: 'text-file-slides', label: 'PPT', onTone: 'fill-white' },
  archive: { tone: 'text-file-archive', label: 'ZIP', onTone: 'fill-ink' },
  image: { tone: 'text-file-image', label: 'IMG', onTone: 'fill-white' },
  video: { tone: 'text-file-video', label: 'VID', onTone: 'fill-white' },
  audio: { tone: 'text-file-audio', label: 'AUD', onTone: 'fill-white' },
  code: { tone: 'text-file-code', label: 'CODE', onTone: 'fill-white' },
  text: { tone: 'text-file-text', label: 'TXT', onTone: 'fill-white' },
  other: { tone: 'text-ink-muted', label: 'FILE', onTone: 'fill-white' },
};

const CSV_VARIANT: FileVariant = { tone: 'text-file-csv', label: 'CSV', onTone: 'fill-white' };
const FILE_LABEL_MAX = 4;

const OLD_MARK_FRAME = 'translate(9.6 14.6) scale(1.6)';

const FILE_MARKS: Record<FileKind, ReactNode> = {
  image: (
    <g transform={OLD_MARK_FRAME}>
      <g transform="translate(0 8)" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="16" y="10.5" width="16" height="12" rx="1.6" />
        <circle cx="20.5" cy="14.5" r="1.5" />
        <path d="m17 20.5 4.5-4.5 3 2.8 3-3.2 3.5 4.9" />
      </g>
    </g>
  ),
  video: (
    <g transform={OLD_MARK_FRAME}>
      <g transform="translate(0 8)" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="16" y="10.5" width="16" height="12" rx="1.6" />
        <path d="m22 14 6 2.5-6 2.5z" fill="currentColor" />
      </g>
    </g>
  ),
  audio: (
    <g transform={OLD_MARK_FRAME}>
      <g transform="translate(0 8)" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 21V12l9-2v9" />
        <circle cx="18.6" cy="21" r="2.4" />
        <circle cx="27.6" cy="19" r="2.4" />
      </g>
    </g>
  ),
  pdf: (
    <>
      <path
        d="M22 66C30 38 42 36 40 48S56 72 72 62"
        stroke="currentColor"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="20" y="36" width="22" height="5" rx="2.5" fill="currentColor" opacity={0.35} />
    </>
  ),
  archive: (
    <>
      <rect x="40" y="4" width="16" height="66" fill="currentColor" opacity={0.35} />
      {[0, 1, 2, 3, 4, 5, 6].map((index) => (
        <rect
          key={index}
          x={index % 2 === 0 ? 42 : 48}
          y={8 + index * 8}
          width="6"
          height="5"
          rx="1.5"
          className={index % 2 === 0 ? 'fill-brand-700' : 'fill-ink'}
        />
      ))}
      <rect x="40" y="58" width="16" height="18" rx="5" className="fill-brand-500 stroke-ink" strokeWidth={2.5} />
      <circle cx="48" cy="68" r="3" className="fill-ink" />
    </>
  ),
  document: (
    <>
      <rect x="20" y="36" width="36" height="6" rx="3" fill="currentColor" />
      <rect x="20" y="48" width="56" height="5" rx="2.5" fill="currentColor" opacity={0.35} />
      <rect x="20" y="58" width="40" height="5" rx="2.5" fill="currentColor" opacity={0.35} />
    </>
  ),
  sheet: (
    <>
      <rect x="20" y="36" width="56" height="36" rx="5" stroke="currentColor" strokeWidth={3} />
      <rect x="21.5" y="37.5" width="53" height="10.5" rx="3" fill="currentColor" opacity={0.35} />
      <path d="M38.7 36V72M57.3 36V72M20 48H76M20 60H76" stroke="currentColor" strokeWidth={2.5} />
    </>
  ),
  slides: (
    <g transform={OLD_MARK_FRAME}>
      <g transform="translate(0 8)" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="16" y="10" width="16" height="11" rx="1.6" />
        <path d="M24 21v3" />
        <path d="M20 24h8" />
      </g>
    </g>
  ),
  code: (
    <g transform={OLD_MARK_FRAME}>
      <g transform="translate(0 8)" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="m21 11.5-5 5 5 5" />
        <path d="m27 11.5 5 5-5 5" />
      </g>
    </g>
  ),
  text: (
    <>
      {[36, 45, 54, 63, 72].map((y, index) => (
        <rect key={y} x="20" y={y} width={[56, 48, 56, 40, 24][index]} height="4" rx="2" fill="currentColor" opacity={0.55} />
      ))}
    </>
  ),
  other: null,
};

const CSV_MARK: ReactNode = (
  <>
    {[38, 50, 62].map((y) => (
      <g key={y}>
        <rect x="20" y={y} width="11" height="6" rx="3" fill="currentColor" />
        <text x="35" y={y + 8} fontSize="16" fontWeight={900} fill="currentColor">,</text>
        <rect x="41" y={y} width="11" height="6" rx="3" fill="currentColor" opacity={0.6} />
        <text x="56" y={y + 8} fontSize="16" fontWeight={900} fill="currentColor">,</text>
        <rect x="62" y={y} width="14" height="6" rx="3" fill="currentColor" opacity={0.35} />
      </g>
    ))}
  </>
);

const FILE_PAGE_PATH = 'M16 4H62L88 30V102a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8V12a8 8 0 0 1 8-8Z';
const FILE_FOLD_PATH = 'M62 4V22a8 8 0 0 0 8 8H88Z';
const FILE_BADGE_BASE = 12;
const FILE_BADGE_PER_LETTER = 11;

export function FileTypeIcon({
  kind,
  extension,
  ...props
}: IconProps & { kind: FileKind; extension?: string }) {
  const typed = extension !== undefined && extension !== '' ? extension.toLowerCase() : undefined;
  const csv = typed === 'csv';
  const variant = csv ? CSV_VARIANT : FILE_VARIANTS[kind];
  const label = (typed ?? variant.label).toUpperCase().slice(0, FILE_LABEL_MAX);
  const badgeWidth = FILE_BADGE_BASE + FILE_BADGE_PER_LETTER * label.length;

  return (
    <svg aria-hidden="true" viewBox="0 0 96 120" fill="none" className="h-full w-full" {...props}>
      <ellipse cx="48" cy="115" rx="36" ry="3.5" fill="#2a1608" opacity={0.14} />
      <path d={FILE_PAGE_PATH} fill="#ffffff" stroke="#2a1608" strokeOpacity={0.14} strokeWidth={2} />
      <g className={variant.tone}>
        <path d={FILE_FOLD_PATH} fill="currentColor" opacity={0.3} />
        {csv ? CSV_MARK : FILE_MARKS[kind]}
        <rect x="2" y="80" width={badgeWidth} height="26" rx="9" fill="currentColor" />
      </g>
      <text
        x={2 + badgeWidth / 2}
        y="98.5"
        textAnchor="middle"
        fontSize="15"
        fontWeight={900}
        className={variant.onTone}
      >
        {label}
      </text>
    </svg>
  );
}

export function DocumentFileIcon(props: IconProps) {
  return <FileTypeIcon kind="document" {...props} />;
}

export function SpreadsheetFileIcon(props: IconProps) {
  return <FileTypeIcon kind="sheet" {...props} />;
}
