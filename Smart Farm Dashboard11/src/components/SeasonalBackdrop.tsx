import { useMemo } from 'react'
import { getSeason, SEASON_THEME, type ParticleShape } from '../lib/season'

type Particle = {
  left: number // %
  size: number // px
  duration: number // s
  delay: number // s
  drift: number // px (rightward)
  spin: number // deg
  opacity: number
  colorIndex: number
}

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    size: Math.random() * 10 + 8,
    duration: Math.random() * 8 + 9,
    delay: -Math.random() * 12,
    drift: Math.random() * 160 + 60,
    spin: Math.random() * 360 + 180,
    opacity: Math.random() * 0.45 + 0.45,
    colorIndex: Math.floor(Math.random() * 4),
  }))
}

// Shape of each particle: petals & leaves use organic border-radius, snow is round.
function shapeStyle(shape: ParticleShape, size: number): React.CSSProperties {
  if (shape === 'snow') {
    return { width: size * 0.6, height: size * 0.6, borderRadius: '9999px' }
  }
  if (shape === 'petal') {
    return { width: size, height: size * 0.72, borderRadius: '80% 0 80% 0' }
  }
  // leaf
  return { width: size, height: size * 0.55, borderRadius: '0 80% 0 80%' }
}

// A single canopy blob framing a corner.
function Blob({ className, color }: { className: string; color: string }) {
  return (
    <div
      className={`absolute rounded-full blur-[6px] ${className}`}
      style={{ background: color, opacity: 0.7 }}
    />
  )
}

// Crisp layered tree for the lower corners.
function Tree({ className, colors, trunk, flip }: { className: string; colors: string[]; trunk: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 200 260" className={`absolute ${className}`} style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <rect x="92" y="170" width="16" height="90" rx="4" fill={trunk} />
      <circle cx="70" cy="150" r="52" fill={colors[0]} />
      <circle cx="135" cy="140" r="56" fill={colors[1]} />
      <circle cx="100" cy="90" r="62" fill={colors[2]} />
      <circle cx="80" cy="70" r="26" fill="white" opacity="0.12" />
    </svg>
  )
}

export default function SeasonalBackdrop() {
  const season = getSeason()
  const theme = SEASON_THEME[season]
  const particles = useMemo(() => makeParticles(34), [])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* seasonal colour wash */}
      <div className="absolute inset-0" style={{ background: theme.tint }} />

      {/* canopy foliage framing the edges, leaving the centre clear */}
      <Blob className="-left-24 -top-28 h-80 w-80" color={theme.canopy[0]} />
      <Blob className="left-10 -top-16 h-56 w-56" color={theme.canopy[2]} />
      <Blob className="-right-24 -top-28 h-80 w-80" color={theme.canopy[1]} />
      <Blob className="right-10 -top-16 h-56 w-56" color={theme.canopy[3]} />
      <Blob className="-left-28 top-1/3 h-72 w-72" color={theme.canopy[0]} />
      <Blob className="-right-28 top-1/3 h-72 w-72" color={theme.canopy[1]} />

      {/* crisp corner trees */}
      <Tree className="-left-10 bottom-6 h-64 w-52 opacity-80" colors={[theme.canopy[0], theme.canopy[2], theme.canopy[1]]} trunk={theme.treeline} />
      <Tree className="left-32 bottom-4 h-44 w-36 opacity-70" colors={[theme.canopy[2], theme.canopy[3], theme.canopy[0]]} trunk={theme.treeline} flip />
      <Tree className="-right-10 bottom-6 h-64 w-52 opacity-80" colors={[theme.canopy[1], theme.canopy[3], theme.canopy[0]]} trunk={theme.treeline} flip />
      <Tree className="right-32 bottom-4 h-44 w-36 opacity-70" colors={[theme.canopy[3], theme.canopy[0], theme.canopy[2]]} trunk={theme.treeline} />

      {/* bottom treeline */}
      <svg
        viewBox="0 0 1440 220"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-40 w-full"
        style={{ color: theme.treeline, opacity: 0.75 }}
        fill="currentColor"
      >
        <path d="M0 220V138c46-10 70 24 110 22s58-34 104-26 52 36 98 32 56-40 108-30 54 38 100 32 58-42 110-32 54 36 102 30 56-38 108-28 52 34 98 30 56-36 106-28 54 32 100 28 58-34 108-26 52 30 98 26 44-20 70-16V220Z" />
        <path
          opacity="0.6"
          d="M0 220V170c52-6 80 18 126 16s62-24 112-18 58 26 108 22 64-28 116-20 60 26 110 22 62-28 114-20 58 24 108 20 62-26 112-18 58 24 106 20 62-24 112-18 54 22 104 18 60-22 112-16 34 8 50 10V220Z"
        />
      </svg>

      {/* falling particles */}
      {particles.map((p, i) => (
        <span
          key={i}
          className="season-particle"
          style={{
            left: `${p.left}%`,
            background: theme.particleColors[p.colorIndex] ?? theme.particleColors[0],
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            boxShadow: theme.particleShape === 'snow' ? '0 0 4px rgba(255,255,255,0.6)' : undefined,
            ...shapeStyle(theme.particleShape, p.size),
            ['--p-drift' as string]: `${p.drift}px`,
            ['--p-spin' as string]: `${p.spin}deg`,
            ['--p-opacity' as string]: p.opacity,
          }}
        />
      ))}
    </div>
  )
}
