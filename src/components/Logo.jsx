// Inline version of /public/favicon.svg so the in-app mark always matches
// the browser tab favicon. Size + container styling stay flexible per call site.
export default function Logo({ className = '', size = 32 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="OweNow logo"
    >
      <defs>
        <linearGradient id="owenow-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00D4AA" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#0A0F1E" />
      <path
        d="M18 22h28M18 32h22M18 42h16"
        stroke="url(#owenow-logo-g)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="48" cy="42" r="3" fill="#00D4AA" />
    </svg>
  );
}
