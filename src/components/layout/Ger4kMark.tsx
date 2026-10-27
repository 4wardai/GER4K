/** GER4K brand mark: an indigo tile with a route that branches. Decorative. */
export function Ger4kMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#4F46E5" />
      <path d="M9 23V14.5a5.5 5.5 0 0 1 5.5-5.5H23" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M15 23v-4a4 4 0 0 1 4-4h4" fill="none" stroke="#A5B4FC" strokeWidth="3" strokeLinecap="round" />
      <circle cx="9" cy="23" r="2.6" fill="#fff" />
      <circle cx="23" cy="9" r="2.6" fill="#fff" />
    </svg>
  );
}
