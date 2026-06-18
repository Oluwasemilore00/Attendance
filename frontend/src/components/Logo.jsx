export default function Logo({ size = 38 }) {
  const id = `lg-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 38 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" />
          <stop offset="1" stopColor="#818CF8" />
        </linearGradient>
      </defs>

      {/* Background rounded square */}
      <rect width="38" height="38" rx="10" fill={`url(#${id})`} />

      {/* Clipboard body */}
      <rect x="9" y="11" width="20" height="20" rx="3"
        stroke="white" strokeWidth="1.6" fill="none" opacity="0.9" />

      {/* Clipboard top clip */}
      <rect x="14" y="8" width="10" height="6" rx="2.5"
        fill="white" opacity="0.9" />

      {/* Check mark */}
      <path d="M13.5 21.5L17 25L24.5 16.5"
        stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
