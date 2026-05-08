export default function FlagIcon({ className = 'w-5 h-5', flagColor = '#a3392a' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M5 3v18"
        stroke="#2c2418"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M5 4 C 11 4, 13 8, 19 6 L 19 11 C 13 13, 11 9, 5 10 Z"
        fill={flagColor}
      />
      <circle cx="5" cy="21" r="1.4" fill="#2c2418" />
    </svg>
  );
}
