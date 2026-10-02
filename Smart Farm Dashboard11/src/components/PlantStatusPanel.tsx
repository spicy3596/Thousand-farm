import type { Plant, SensorState } from '../farm'
import { MAX_STAGE } from '../plantImages'

type Props = {
  plant: Plant
  stage: number
  sensors: SensorState
}

// Map a sensor value onto a friendly Korean status word.
function moisture(v: number) {
  return v >= 55 ? '좋음' : v >= 35 ? '보통' : '주의'
}
function light(v: number) {
  return v >= 8000 ? '좋음' : v >= 4000 ? '보통' : '부족'
}
function temp(v: number) {
  return v >= 18 && v <= 24 ? '적정' : v < 18 ? '서늘' : '더움'
}

function StatRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
        {label}
      </span>
      <span className="font-medium text-card-foreground">{value}</span>
    </div>
  )
}

export default function PlantStatusPanel({ plant, stage, sensors }: Props) {
  const growth = Math.round((stage / MAX_STAGE) * 100)
  const daysLeft = Math.max(1, MAX_STAGE - stage + 1)
  const healthy = sensors.temp >= 18 && sensors.temp <= 24 && sensors.soil >= 40

  return (
    <div className="animate-float-in flex flex-col gap-5 rounded-[var(--radius)] border border-border bg-card/90 p-5 shadow-[var(--shadow-soft)] backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22V12M12 12C12 8 9 5 4 5c0 4 3 7 8 7Zm0-2c0-4 3-7 8-7 0 4-3 7-8 7Z" />
        </svg>
        <p className="font-display text-xs font-semibold tracking-[0.18em] text-muted-foreground">
          TODAY'S PLANT
        </p>
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold">오늘의 {plant.name} 상태</h2>
        <p className="mt-2 flex items-center gap-2 text-sm font-medium text-primary">
          <span className="text-lg">{healthy ? '😊' : '🌡️'}</span>
          {healthy ? '건강하게 성장 중이에요' : '조건을 살펴봐 주세요'}
        </p>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">성장 단계</span>
          <span className="font-mono font-semibold">{stage} / {MAX_STAGE}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">성장률</span>
          <span className="font-mono font-semibold">{growth}%</span>
        </div>
      </div>

      <div className="space-y-2.5 border-t border-border pt-4">
        <StatRow icon="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" label="수분 상태" value={moisture(sensors.soil)} />
        <StatRow icon="M12 4V2m0 20v-2m8-8h2M2 12h2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" label="광량" value={light(sensors.light)} />
        <StatRow icon="M12 3a2 2 0 0 0-2 2v9.2a4 4 0 1 0 4 0V5a2 2 0 0 0-2-2Z" label="온도" value={temp(sensors.temp)} />
      </div>

      {/* stage progress */}
      <div>
        <div className="flex gap-1.5">
          {Array.from({ length: MAX_STAGE }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i < stage ? 'bg-primary' : 'bg-[var(--sensor-track)]'}`}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          다음 성장 단계까지 약 {daysLeft}일 예상
        </p>
      </div>
    </div>
  )
}
