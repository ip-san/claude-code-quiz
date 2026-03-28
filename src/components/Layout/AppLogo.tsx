/**
 * アプリロゴ — < ? > アイコン
 * ウェルカム画面、ローディング画面、チュートリアルで使用
 */
export function AppLogo({ size = 96 }: { size?: number }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#F09070' }} />
          <stop offset="100%" style={{ stopColor: '#C4644A' }} />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#logo-bg)" />
      {/* < bracket — pulled inward for padding */}
      <path
        d="M155 200 L100 256 L155 312"
        stroke="white"
        strokeWidth="36"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* > bracket */}
      <path
        d="M357 200 L412 256 L357 312"
        stroke="white"
        strokeWidth="36"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* ? mark */}
      <path
        d="M228 208 Q228 170 256 170 Q284 170 284 208 Q284 245 256 258 L256 278"
        stroke="white"
        strokeWidth="28"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="256" cy="320" r="15" fill="white" />
    </svg>
  )
}
