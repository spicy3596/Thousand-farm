import type { SensorState } from '../farm'

type Props = {
  sensors: SensorState
  onOpenDiary: () => void
}

function CareRow({
  icon,
  title,
  line1,
  line2,
}: {
  icon: string
  title: string
  line1: string
  line2: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/70 text-primary">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-card-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{line1}</p>
        <p className="text-xs font-medium text-card-foreground">{line2}</p>
      </div>
      <svg viewBox="0 0 24 24" className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </div>
  )
}

export default function CarePanel({ sensors, onOpenDiary }: Props) {
  // Derive gentle, deterministic "care" hints from live sensor values.
  const refillMinutes = Math.round((sensors.water / 100) * 300) // 0–5h by water level
  const refillH = Math.floor(refillMinutes / 60)
  const refillM = refillMinutes % 60
  const ledHours = Math.round((sensors.led / 100) * 20)

  return (
    <div className="animate-float-in flex flex-col gap-5 rounded-[var(--radius)] border border-border bg-card/90 p-5 shadow-[var(--shadow-soft)] backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22V12M12 12C12 8 9 5 4 5c0 4 3 7 8 7Zm0-2c0-4 3-7 8-7 0 4-3 7-8 7Z" />
        </svg>
        <p className="font-display text-xs font-semibold tracking-[0.18em] text-muted-foreground">
          TODAY'S CARE
        </p>
      </div>

      <div className="space-y-5">
        <CareRow
          icon="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"
          title="물 공급"
          line1="다음 공급까지"
          line2={`${refillH}시간 ${refillM}분`}
        />
        <div className="border-t border-border" />
        <CareRow
          icon="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2ZM9 21h6"
          title="LED"
          line1="오늘 사용 시간"
          line2={`${ledHours}시간 / 20시간`}
        />
        <div className="border-t border-border" />
        <CareRow
          icon="M12 22V12M12 12C12 8 9 5 4 5c0 4 3 7 8 7Zm0-2c0-4 3-7 8-7 0 4-3 7-8 7Z"
          title="성장 기록"
          line1="새로운 성장 단계에"
          line2="진입할 준비가 됐어요!"
        />
      </div>

      <button
        onClick={onOpenDiary}
        className="mt-1 flex w-full items-center justify-between gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
            <path d="M9 8h5M9 12h6M9 16h4" />
          </svg>
          다이어리에 기록하기
        </span>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  )
}
