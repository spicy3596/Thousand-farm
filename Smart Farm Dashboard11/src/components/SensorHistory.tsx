import { useEffect, useMemo, useState } from 'react'
import type { Sensor } from '../farm'
import {
  fetchSensorHistory,
  sampleHistory,
  type HistoryPoint,
  type HistoryRange,
} from '../lib/sensorLogs'

type Props = { sensor: Sensor; current: number; format: (v: number) => string }

const W = 320
const H = 112
const PAD_Y = 8
const MIN_REAL_POINTS = 6

function timeLabel(t: number, range: HistoryRange) {
  const d = new Date(t)
  return range === '24h'
    ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    : `${d.getMonth() + 1}/${d.getDate()}`
}

export default function SensorHistory({ sensor, current, format }: Props) {
  const [range, setRange] = useState<HistoryRange>('24h')
  const [real, setReal] = useState<HistoryPoint[] | null>(null)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    setReal(null)
    fetchSensorHistory(sensor.id, range).then((pts) => alive && setReal(pts))
    return () => {
      alive = false
    }
  }, [sensor.id, range])

  const isSample = !real || real.length < MIN_REAL_POINTS
  const points = useMemo(
    () => (isSample ? sampleHistory(sensor, current, range) : real!),
    // sample curve only re-anchors when the modal opens / range changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSample, real, sensor, range],
  )

  const t0 = points[0].t
  const t1 = points[points.length - 1].t || t0 + 1
  const x = (t: number) => ((t - t0) / (t1 - t0 || 1)) * W
  const y = (v: number) =>
    PAD_Y + (1 - (v - sensor.min) / (sensor.max - sensor.min)) * (H - PAD_Y * 2)

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join('')
  const area = `${line}L${W} ${H}L0 ${H}Z`
  const vals = points.map((p) => p.v)
  const stats = {
    min: Math.min(...vals),
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    max: Math.max(...vals),
  }
  const inIdeal = vals.filter((v) => v >= sensor.ideal[0] && v <= sensor.ideal[1]).length / vals.length
  const active = hover !== null ? points[hover] : null
  const gradId = `hist-${sensor.id}`

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const tx = t0 + ((e.clientX - rect.left) / rect.width) * (t1 - t0)
    let best = 0
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(points[i].t - tx) < Math.abs(points[best].t - tx)) best = i
    }
    setHover(best)
  }

  return (
    <section className="mt-7 rounded-2xl border border-border bg-card/60 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">기록</h3>
          <p className="text-xs text-muted-foreground">
            적정 범위 유지 <span className="font-semibold text-primary">{Math.round(inIdeal * 100)}%</span>
            {isSample && ' · 예시 데이터'}
          </p>
        </div>
        <div className="flex rounded-full bg-secondary p-0.5 text-xs font-medium" role="tablist">
          {(['24h', '7d'] as const).map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={range === r}
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1 transition ${
                range === r ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r === '24h' ? '24시간' : '7일'}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-28 w-full touch-none overflow-visible"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={`${sensor.label} ${range === '24h' ? '24시간' : '7일'} 추이`}
        >
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* ideal band */}
          <rect
            x="0"
            width={W}
            y={y(sensor.ideal[1])}
            height={y(sensor.ideal[0]) - y(sensor.ideal[1])}
            fill="var(--primary)"
            opacity="0.07"
          />
          <line x1="0" x2={W} y1={y(sensor.ideal[1])} y2={y(sensor.ideal[1])} stroke="var(--primary)" strokeOpacity="0.25" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          <line x1="0" x2={W} y1={y(sensor.ideal[0])} y2={y(sensor.ideal[0])} stroke="var(--primary)" strokeOpacity="0.25" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          <path d={area} fill={`url(#${gradId})`} />
          <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {active && (
            <line x1={x(active.t)} x2={x(active.t)} y1="0" y2={H} stroke="currentColor" strokeOpacity="0.2" vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        {/* dots in HTML so they stay round under preserveAspectRatio="none" */}
        {(() => {
          const p = active ?? points[points.length - 1]
          return (
            <span
              className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-primary shadow"
              style={{ left: `${(x(p.t) / W) * 100}%`, top: `${(y(p.v) / H) * 100}%` }}
            />
          )
        })()}
        {active && (
          <div
            className="pointer-events-none absolute -top-2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-foreground px-2 py-1 font-mono text-[0.68rem] text-background"
            style={{ left: `${Math.min(88, Math.max(12, (x(active.t) / W) * 100))}%` }}
          >
            {timeLabel(active.t, range)} · {format(active.v)}
            {sensor.unit}
          </div>
        )}
      </div>

      <div className="mt-1 flex justify-between font-mono text-[0.65rem] text-muted-foreground">
        <span>{timeLabel(t0, range)}</span>
        <span>지금</span>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {([['최저', stats.min], ['평균', stats.avg], ['최고', stats.max]] as const).map(([k, v]) => (
          <div key={k} className="rounded-xl bg-secondary/60 py-2">
            <dt className="text-[0.68rem] text-muted-foreground">{k}</dt>
            <dd className="font-mono text-sm font-semibold">
              {format(sensor.step < 1 ? +v.toFixed(1) : Math.round(v))}
              <span className="ml-0.5 text-[0.62rem] font-normal text-muted-foreground">{sensor.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
