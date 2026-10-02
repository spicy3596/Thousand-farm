// Seasonal theming for the forest backdrop + falling particles.
// 봄 3~5월 · 여름 6~9월 · 가을 10~11월 · 겨울 12~2월
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export function getSeason(date: Date = new Date()): Season {
  const m = date.getMonth() + 1 // 1–12
  if (m >= 3 && m <= 5) return 'spring'
  if (m >= 6 && m <= 9) return 'summer'
  if (m >= 10 && m <= 11) return 'autumn'
  return 'winter'
}

export type ParticleShape = 'petal' | 'leaf' | 'snow'

export type SeasonTheme = {
  label: string
  /** Soft wash laid over the whole backdrop (very low opacity). */
  tint: string
  /** Canopy blob colours framing the corners. */
  canopy: string[]
  /** Bottom treeline fill. */
  treeline: string
  /** Falling-particle colours. */
  particleColors: string[]
  particleShape: ParticleShape
}

export const SEASON_THEME: Record<Season, SeasonTheme> = {
  spring: {
    label: '봄',
    tint: 'radial-gradient(120% 80% at 50% -10%, rgba(249,198,211,0.28), rgba(215,239,194,0.12) 55%, transparent 80%)',
    canopy: ['#bfe3a6', '#d9f0c4', '#f7b8cc', '#fcd9e2'],
    treeline: '#a9d68f',
    particleColors: ['#f9c6d3', '#f7b2c6', '#fcd9e2', '#ffe4ec'],
    particleShape: 'petal',
  },
  summer: {
    label: '여름',
    tint: 'radial-gradient(120% 80% at 50% -10%, rgba(89,168,101,0.26), rgba(140,207,134,0.12) 55%, transparent 80%)',
    canopy: ['#4f9d5b', '#69b56f', '#8ccf86', '#3f8a4e'],
    treeline: '#3f8a4e',
    particleColors: ['#5aa563', '#79bd76', '#96cf8a', '#4f9d5b'],
    particleShape: 'leaf',
  },
  autumn: {
    label: '가을',
    tint: 'radial-gradient(120% 80% at 50% -10%, rgba(224,121,47,0.26), rgba(232,178,58,0.12) 55%, transparent 80%)',
    canopy: ['#e0792f', '#d64b3a', '#e8b23a', '#b5652d'],
    treeline: '#b5652d',
    particleColors: ['#e0792f', '#d64b3a', '#e8b23a', '#a9622f'],
    particleShape: 'leaf',
  },
  winter: {
    label: '겨울',
    tint: 'radial-gradient(120% 80% at 50% -10%, rgba(219,232,245,0.34), rgba(238,244,251,0.16) 55%, transparent 80%)',
    canopy: ['#e7eef7', '#f4f8fc', '#cfe0ef', '#dbe8f5'],
    treeline: '#e8eff7',
    particleColors: ['#ffffff', '#eef4fb', '#dbe8f5', '#f4f8fc'],
    particleShape: 'snow',
  },
}
