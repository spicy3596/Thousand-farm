import { SENSORS, sensorStatus, type Sensor, type SensorId, type SensorState } from '../farm'

export type SensorAlert = {
  sensor: Sensor
  status: 'low' | 'high'
  value: number
  title: string
  tip: string
}

// Plain-language guidance for each sensor when it drifts out of range.
const TIPS: Record<SensorId, { low: string; high: string }> = {
  water: { low: '물통에 물을 채워 주세요', high: '물통이 넘치지 않는지 확인해 주세요' },
  soil: { low: '흙이 말랐어요. 물을 조금 주세요', high: '과습이에요. 물 공급을 잠시 멈춰 주세요' },
  light: { low: '빛이 부족해요. 조명을 밝혀 주세요', high: '빛이 너무 강해요. 잎이 탈 수 있어요' },
  co2: { low: '환기를 줄여 CO₂를 보충해 주세요', high: '환기가 필요해요' },
  temp: { low: '너무 추워요. 온도를 올려 주세요', high: '너무 더워요. 온도를 낮춰 주세요' },
  humidity: { low: '공기가 건조해요. 가습이 필요해요', high: '습도가 높아요. 곰팡이에 주의하세요' },
  led: { low: 'LED 밝기를 올려 주세요', high: 'LED 밝기를 조금 낮춰 주세요' },
}

// Korean subject particle: 이 after a final consonant, 가 otherwise.
function subject(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  if (code < 0 || code > 11171) return '이(가)'
  return code % 28 ? '이' : '가'
}

/** Every sensor currently outside its ideal range, most severe first. */
export function getAlerts(sensors: SensorState): SensorAlert[] {
  return SENSORS.flatMap((sensor) => {
    const value = sensors[sensor.id]
    const status = sensorStatus(sensor, value)
    if (status === 'ok') return []
    return [
      {
        sensor,
        status,
        value,
        title: `${sensor.label}${subject(sensor.label)} ${status === 'low' ? '낮아요' : '높아요'}`,
        tip: TIPS[sensor.id][status],
      },
    ]
  }).sort((a, b) => severity(b) - severity(a))
}

/** How far outside the ideal band, relative to the sensor's full range. */
export function severity(a: SensorAlert): number {
  const { ideal, min, max } = a.sensor
  const gap = a.status === 'low' ? ideal[0] - a.value : a.value - ideal[1]
  return gap / (max - min)
}

/** Stable key for the current alert set, used to re-show a dismissed banner. */
export const alertKey = (alerts: SensorAlert[]) =>
  alerts.map((a) => `${a.sensor.id}:${a.status}`).sort().join('|')
