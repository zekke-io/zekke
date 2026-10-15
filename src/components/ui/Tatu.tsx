import { useId } from 'react';
import type { SVGProps } from 'react';

const BODY_PATH =
  'M90 320 C90 190 190 150 270 150 C350 150 400 210 400 300 C400 340 380 360 340 360 L140 360 C110 360 90 345 90 320 Z';

function scopedId(prefix: string, raw: string) {
  return `${prefix}-${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

export function Tatu({ className = 'h-10 w-auto', ...props }: SVGProps<SVGSVGElement>) {
  const clip = scopedId('tatu-body', useId());

  return (
    <svg aria-hidden="true" viewBox="20 120 470 310" className={className} {...props}>
      <defs>
        <clipPath id={clip}>
          <path d={BODY_PATH} />
        </clipPath>
      </defs>
      <ellipse cx="254" cy="410" rx="190" ry="14" fill="#2a1608" opacity=".12" />
      <path d="M96 318 C60 318 36 340 30 372 C62 366 92 352 104 336 Z" fill="#ffb066" />
      <rect x="160" y="330" width="56" height="76" rx="28" fill="#ffb066" />
      <rect x="296" y="330" width="56" height="76" rx="28" fill="#ffb066" />
      <path d={BODY_PATH} fill="#ff7a1a" />
      <g clipPath={`url(#${clip})`} fill="#ffb066">
        <path d="M150 140 Q128 250 150 370 L186 370 Q164 250 186 140 Z" />
        <path d="M226 140 Q204 250 226 370 L262 370 Q240 250 262 140 Z" />
        <path d="M302 140 Q280 250 302 370 L338 370 Q316 250 338 140 Z" />
      </g>
      <path d="M130 230 Q150 185 215 168" stroke="#fff" strokeWidth="12" strokeLinecap="round" fill="none" opacity=".6" />
      <path d="M380 268 C400 235 450 240 470 285 C478 305 468 322 450 326 L388 332 Z" fill="#ffb066" />
      <ellipse cx="398" cy="250" rx="16" ry="28" transform="rotate(-25 398 250)" fill="#ffb066" />
      <ellipse cx="398" cy="252" rx="7" ry="18" transform="rotate(-25 398 252)" fill="#ff9a4a" />
      <circle cx="428" cy="282" r="8" fill="#2a1608" />
      <circle cx="431" cy="279" r="2.6" fill="#fff" />
      <circle cx="414" cy="302" r="9" fill="#ff7a1a" opacity=".55" />
      <path d="M432 308 Q447 319 461 306" stroke="#2a1608" strokeWidth="5" strokeLinecap="round" fill="none" />
      <circle cx="469" cy="294" r="7" fill="#2a1608" />
    </svg>
  );
}

export function TatuClosed({
  tone = 'orange',
  className = 'h-40 w-40',
  ...props
}: SVGProps<SVGSVGElement> & { tone?: 'orange' | 'cream' }) {
  const clip = scopedId('tatu-ball', useId());
  const ball = tone === 'orange' ? '#ff7a1a' : '#fff4e8';

  return (
    <svg aria-hidden="true" viewBox="76 80 360 360" className={className} {...props}>
      <defs>
        <clipPath id={clip}>
          <circle cx="256" cy="256" r="150" />
        </clipPath>
      </defs>
      <ellipse cx="256" cy="420" rx="96" ry="12" fill="#2a1608" opacity=".2" />
      <circle cx="256" cy="256" r="150" fill={ball} />
      <g clipPath={`url(#${clip})`} fill="#ffb066">
        <path d="M90 190 Q256 252 422 190 L422 228 Q256 290 90 228 Z" />
        <path d="M90 254 Q256 316 422 254 L422 292 Q256 354 90 292 Z" />
        <path d="M90 318 Q256 380 422 318 L422 356 Q256 418 90 356 Z" />
      </g>
      <path d="M168 176 Q196 138 252 126" stroke="#fff" strokeWidth="14" strokeLinecap="round" fill="none" opacity=".6" />
    </svg>
  );
}
