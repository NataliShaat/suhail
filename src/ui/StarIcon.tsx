import { useId } from 'react';

/** Suhail's mark: a four-point sparkle in the app's gold. */
export function StarIcon({ size = 24, className }: { size?: number; className?: string }) {
  const id = `star-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <defs>
        <linearGradient id={id} x1="5" y1="2" x2="19" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FBE3A6" />
          <stop offset="0.55" stopColor="#E3A83C" />
          <stop offset="1" stopColor="#C98F25" />
        </linearGradient>
      </defs>
      <path d="M12 1C12.6 7.4 16.6 11.4 23 12C16.6 12.6 12.6 16.6 12 23C11.4 16.6 7.4 12.6 1 12C7.4 11.4 11.4 7.4 12 1Z" fill={`url(#${id})`} />
    </svg>
  );
}
