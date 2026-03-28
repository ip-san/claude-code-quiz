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
      <path
        d="M120 180 L60 256 L120 332"
        stroke="white"
        strokeWidth="40"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M392 180 L452 256 L392 332"
        stroke="white"
        strokeWidth="40"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M222 195 Q222 150 256 150 Q290 150 290 195 Q290 240 256 255 L256 280"
        stroke="white"
        strokeWidth="30"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="256" cy="330" r="17" fill="white" />
    </svg>
  )
}
