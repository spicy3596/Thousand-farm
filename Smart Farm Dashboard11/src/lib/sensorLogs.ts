import { isSupabaseConfigured, supabase } from './supabase'
import { SENSOR_COLUMN } from './farmSettings'
import type { Sensor, SensorId, SensorState } from '../farm'

/** Time window shown in the sensor history chart. */
export type HistoryRange = '24h' | '7d'

export type HistoryPoint = { t: number; v: number }

export const RANGE_MS: Record<HistoryRange, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
}

/** How often the app records a snapshot into `sensor_logs`. */
export const LOG_INTERVAL_MS = 10 * 60 * 1000

/** Append one snapshot of every sensor to the `sensor_logs` table. */
export async function logSensorSnapshot(sensors: SensorState): Promise<void> {
  if (!isSupabaseConfigured) return
  const row: Record<string, number> = {}
  for (const id of Object.keys(SENSOR_COLUMN) as SensorId[]) {
    row[SENSOR_COLUMN[id]] = sensors[id]
  }
  const { error } = await supabase.from('sensor_logs').insert(row as never)
  if (error) console.info('[sensor_logs] insert skipped:', error.message)
}

/** Read a sensor's history for the given range. Returns null if unavailable. */
export async function fetchSensorHistory(
  id: SensorId,
  range: HistoryRange,
): Promise<HistoryPoint[] | null> {
  if (!isSupabaseConfigured) return null
  const column = SENSOR_COLUMN[id]
  const since = new Date(Date.now() - RANGE_MS[range]).toISOString()
  const { data, error } = await supabase
    .from('sensor_logs')
    .select(`created_at, ${column}`)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(2000)
  if (error || !data) return null
  return (data as unknown as Record<string, string | number>[])
    .map((r) => ({ t: new Date(r.created_at as string).getTime(), v: Number(r[column]) }))
    .filter((p) => Number.isFinite(p.v))
}

/**
 * Plausible sample curve ending at the current value, used until enough
 * real logs exist. Deterministic per sensor so it doesn't jitter on re-render.
 */
export function sampleHistory(sensor: Sensor, current: number, range: HistoryRange): HistoryPoint[] {
  const count = range === '24h' ? 48 : 84
  const now = Date.now()
  const step = RANGE_MS[range] / (count - 1)
  const span = sensor.max - sensor.min
  const mid = (sensor.ideal[0] + sensor.ideal[1]) / 2
  const seed = sensor.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const periodsPerDay = range === '24h' ? 1 : 7
  return Array.from({ length: count }, (_, i) => {
    const x = i / (count - 1)
    const daily = Math.sin(x * Math.PI * 2 * periodsPerDay + seed) * span * 0.08
    const wobble = Math.sin(x * 37 + seed * 1.7) * span * 0.025
    const base = mid + (current - mid) * x // drift toward the live value
    const v = i === count - 1 ? current : base + daily + wobble
    return { t: now - (count - 1 - i) * step, v: Math.min(sensor.max, Math.max(sensor.min, v)) }
  })
}
