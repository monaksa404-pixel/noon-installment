export default function NoonLogo({ className = "noon-logo" }) {
  return (
    <svg className={className} viewBox="0 0 92 32" role="img" aria-label="noon">
      <rect width="92" height="32" rx="7" fill="#ffe600" />
      <text
        x="46"
        y="22"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="16"
        fontWeight="800"
        fill="#111111"
      >
        noon
      </text>
    </svg>
  );
}
