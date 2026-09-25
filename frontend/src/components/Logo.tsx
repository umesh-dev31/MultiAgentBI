type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const SIZE_MAP: Record<LogoSize, number> = {
  xs: 20, // collapsed sidebar / compact nav
  sm: 24, // mobile header
  md: 32, // default sidebar/header
  lg: 48, // dashboard headers, modals
  xl: 96, // empty states, onboarding, loading/splash screens
}

export function Logo({ size = 'md' }: { size?: LogoSize }) {
  const px = SIZE_MAP[size]
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 512 512"
      fill="none"
      role="img"
      aria-label="AgentInsight AI logo"
      style={{ flexShrink: 0 }}
      className="app-logo"
    >
      <rect width="512" height="512" rx="102" fill="var(--logo-bg, #18181b)" />
      <rect x="2" y="2" width="508" height="508" rx="100" stroke="var(--logo-border, #27272a)" strokeWidth="4" />
      <rect x="96" y="280" width="80" height="120" rx="14" fill="var(--logo-bar-muted, #71717a)" />
      <rect x="216" y="200" width="80" height="200" rx="14" fill="var(--logo-bar-muted, #71717a)" />
      <rect x="336" y="120" width="80" height="280" rx="14" fill="var(--logo-bar-accent, #34d399)" />
    </svg>
  )
}

const textSizeMap: Record<LogoSize, string> = {
  xs: 'text-sm',
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
  xl: 'text-4xl',
}

export function LogoWithWordmark({ size = 'md' }: { size?: LogoSize }) {
  return (
    <div className="flex items-center gap-2">
      <Logo size={size} />
      <span
        className={`font-semibold ${textSizeMap[size]}`}
        style={{ color: 'var(--text-primary)' }}
      >
        AgentInsight AI
      </span>
    </div>
  )
}
