import { useState } from 'react'
import { alertKey, type SensorAlert } from '../lib/alerts'
import type { SensorId } from '../farm'
import SensorIcon from './SensorIcon'

type Props = { alerts: SensorAlert[]; onOpen: (id: SensorId) => void }

export default function AlertBanner({ alerts, onOpen }: Props) {
  // Dismissal lasts only until the set of out-of-range sensors changes.
  const [dismissed, setDismissed] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const key = alertKey(alerts)
  if (!alerts.length || dismissed === key) return null

  const [top, ...rest] = alerts
  const list = expanded ? alerts : [top]

  return (
    <div
      role="alert"
      className="animate-float-in fixed left-1/2 top-24 z-30 w-[min(92vw,26rem)] -translate-x-1/2 overflow-hidden rounded-2xl border border-accent/40 bg-card/95 shadow-[var(--shadow-soft)] backdrop-blur"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-accent/10 px-4 py-2">
        <span className="flex items-center gap-2 text-xs font-semibold text-accent-foreground dark:text-accent">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          확인이 필요한 센서 {alerts.length}개
        </span>
        <button
          onClick={() => setDismissed(key)}
          aria-label="알림 닫기"
          className="rounded-full p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <ul className="max-h-72 divide-y divide-border/60 overflow-y-auto">
        {list.map((a) => (
          <li key={a.sensor.id}>
            <button
              onClick={() => onOpen(a.sensor.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-secondary/60"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <SensorIcon path={a.sensor.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{a.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{a.tip}</span>
              </span>
              <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                조절
              </span>
            </button>
          </li>
        ))}
      </ul>

      {rest.length > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full border-t border-border/60 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          {expanded ? '접기' : `외 ${rest.length}개 더 보기`}
        </button>
      )}
    </div>
  )
}
