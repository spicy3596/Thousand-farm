// GRO FARM app root — auth gate + main screen.
import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_SENSOR_STATE,
  PLANTS,
  SENSORS,
  type PlantId,
  type Screen,
  type SensorId,
  type SensorState,
  type ThemeMode,
} from './farm'
import { LOGO, MAX_STAGE } from './plantImages'
import { useDiary } from './useDiary'
import {
  fetchFarmSettings,
  pushFarmSettings,
  pushSensor,
  subscribeFarmSettings,
  type FarmSettings,
} from './lib/farmSettings'
import {
  createMyPlant,
  loadMyPlant,
  updateMyPlant,
  type PlantRecord,
} from './lib/plantStore'
import MusicButton from './components/MusicButton'
import MixupButton from './components/MixupButton'
import { MusicProvider } from './lib/MusicContext'
import { useClickSound } from './lib/useClickSound'
import AuthScreen from './components/AuthScreen'
import { getSession, onAuthChange, signOut, type Session } from './lib/auth'
import { isSupabaseConfigured } from './lib/supabase'
import RadialHome from './components/RadialHome'
import SeasonalBackdrop from './components/SeasonalBackdrop'
import PlantStatusPanel from './components/PlantStatusPanel'
import CarePanel from './components/CarePanel'
import AlertBanner from './components/AlertBanner'
import { getAlerts } from './lib/alerts'
import { LOG_INTERVAL_MS, logSensorSnapshot } from './lib/sensorLogs'
import SensorModal from './components/SensorModal'
import CameraModal from './components/CameraModal'
import Diary from './components/Diary'
import SettingsPanel from './components/SettingsPanel'

function MainApp({ onSignOut }: { onSignOut: () => void }) {
  const [theme, setTheme] = useState<ThemeMode>('light')
  const [plant, setPlant] = useState<PlantId>('bokchoy')
  const [screen, setScreen] = useState<Screen>('home')
  const [stage, setStage] = useState(2)
  const [sensors, setSensors] = useState<SensorState>(DEFAULT_SENSOR_STATE)
  const [activeSensor, setActiveSensor] = useState<SensorId | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [linked, setLinked] = useState(false)
  const [myPlant, setMyPlant] = useState<PlantRecord | null>(null)
  const [plantLoading, setPlantLoading] = useState(true)
  const diary = useDiary(myPlant?.id)
  useClickSound()

  // Record a sensor snapshot periodically for the history charts.
  const sensorsRef = useRef(sensors)
  sensorsRef.current = sensors
  useEffect(() => {
    const first = setTimeout(() => logSensorSnapshot(sensorsRef.current), 5000)
    const timer = setInterval(() => logSensorSnapshot(sensorsRef.current), LOG_INTERVAL_MS)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [])

  const harvest = async () => {
    await diary.clearAll()
    setStage(1)
    pushFarmSettings({ target_stage: 1 })
    if (myPlant) {
      try {
        const updated = await updateMyPlant(myPlant.id, { growthStage: 1 })
        setMyPlant(updated)
      } catch (error) {
        console.error('[plant] 수확(성장 단계 초기화) 저장 실패:', error)
      }
    }
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Load (or seed) this user's persistent plant from the `plants` table.
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const existing = await loadMyPlant()
        if (!active) return
        if (existing) {
          setMyPlant(existing)
          if (existing.type === 'bokchoy' || existing.type === 'lettuce') {
            setPlant(existing.type)
          }
          setStage(Math.min(MAX_STAGE, Math.max(1, Math.round(existing.growth_stage))))
        } else {
          // No plant yet → seed the current default (청경채).
          const created = await createMyPlant({
            type: 'bokchoy',
            name: PLANTS.bokchoy.name,
            growthStage: stage,
          })
          if (active) setMyPlant(created)
        }
      } catch (error) {
        console.error('[plant] 식물 정보 불러오기/생성 실패:', error)
      } finally {
        if (active) setPlantLoading(false)
      }
    })()
    return () => {
      active = false
    }
    // Runs once per user (MainApp is keyed by user id in App()).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Live smart-farm link: hydrate from the `settings` row, then follow realtime
  // updates pushed by the external control panel.
  useEffect(() => {
    let active = true
    const apply = (s: Partial<FarmSettings>) => {
      if (s.target_stage != null) {
        setStage(Math.min(MAX_STAGE, Math.max(1, Math.round(s.target_stage))))
      }
      if (s.plant === 'bokchoy' || s.plant === 'lettuce') setPlant(s.plant)
      setSensors((prev) => ({
        ...prev,
        water: s.water_level ?? prev.water,
        soil: s.soil_moisture ?? prev.soil,
        light: s.light_lux ?? prev.light,
        co2: s.co2_ppm ?? prev.co2,
        temp: s.target_temp ?? prev.temp,
        humidity: s.humidity ?? prev.humidity,
        led: s.led_brightness ?? prev.led,
      }))
      setLinked(true)
    }
    fetchFarmSettings().then((s) => {
      if (active && s) apply(s)
    })

    // Realtime is the primary channel; when it can't subscribe (table not in
    // the publication or RLS blocks SELECT) we fall back to polling so the app
    // still stays in sync.
    let poll: ReturnType<typeof setInterval> | null = null
    const startPolling = () => {
      if (poll) return
      poll = setInterval(() => {
        fetchFarmSettings().then((s) => {
          if (active && s) apply(s)
        })
      }, 4000)
    }
    const unsub = subscribeFarmSettings(
      (s) => active && apply(s),
      (ok) => {
        if (!active) return
        if (ok && poll) {
          clearInterval(poll)
          poll = null
        } else if (!ok) {
          startPolling()
        }
      },
    )

    return () => {
      active = false
      unsub()
      if (poll) clearInterval(poll)
    }
  }, [])

  const sensor = SENSORS.find((s) => s.id === activeSensor) ?? null
  const grow = async () => {
    const next = Math.min(MAX_STAGE, stage + 1)
    setStage(next)
    pushFarmSettings({ target_stage: next })
    if (myPlant) {
      try {
        const updated = await updateMyPlant(myPlant.id, { growthStage: next })
        setMyPlant(updated)
      } catch (error) {
        console.error('[plant] 성장 단계 저장 실패:', error)
      }
    }
  }

  // Persist whichever sensor was adjusted back to the farm when its dial closes.
  const closeSensor = () => {
    if (activeSensor) pushSensor(activeSensor, sensors[activeSensor])
    setActiveSensor(null)
  }

  // Sync the selected plant to Supabase when it changes in settings.
  const changePlant = async (p: PlantId) => {
    setPlant(p)
    pushFarmSettings({ plant: p })
    if (myPlant) {
      try {
        const updated = await updateMyPlant(myPlant.id, {
          type: p,
          name: PLANTS[p].name,
        })
        setMyPlant(updated)
      } catch (error) {
        console.error('[plant] 식물 변경 저장 실패:', error)
      }
    }
  }

  if (plantLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        식물 정보를 불러오는 중…
      </div>
    )
  }

  return (
    <MusicProvider>
    <div className="relative flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* seasonal forest backdrop (home + diary) */}
      <SeasonalBackdrop />

      {/* top bar */}
      <header className="relative z-10 mx-auto flex w-full max-w-[1400px] shrink-0 items-center justify-between px-5 pt-5 sm:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScreen('home')}
            aria-label="홈으로 이동"
            className="flex items-center gap-3 font-display text-2xl font-semibold tracking-tight transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl sm:text-3xl"
          >
            <img
              src={LOGO}
              alt="GRO FARM 로고"
              className="h-12 w-12 rounded-2xl object-contain shadow-[var(--shadow-soft)] dark:invert sm:h-14 sm:w-14"
            />
            GRO FARM
          </button>
          {linked && (
            <span className="hidden items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[0.68rem] font-semibold text-primary sm:inline-flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              실시간 연동
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <MusicButton />
          <MixupButton />
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="설정 열기"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary/50 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </svg>
          </button>
        </div>
      </header>

      {/* main */}
      <main className="relative z-10 mx-auto w-full max-w-[1400px] min-h-0 flex-1 px-5 pb-24 pt-4 sm:px-8">
        {screen === 'home' && !activeSensor && (
          <AlertBanner alerts={getAlerts(sensors)} onOpen={setActiveSensor} />
        )}
        {screen === 'home' ? (
          <div className="flex h-full items-stretch justify-center gap-4 xl:gap-6">
            <aside className="hidden w-60 shrink-0 self-center lg:block xl:w-72">
              <PlantStatusPanel plant={PLANTS[plant]} stage={stage} sensors={sensors} />
            </aside>
            <div className="min-w-0 flex-1">
              <RadialHome
                plant={PLANTS[plant]}
                stage={stage}
                sensors={sensors}
                onSelect={setActiveSensor}
                onOpenCamera={() => setCameraOpen(true)}
              />
            </div>
            <aside className="hidden w-60 shrink-0 self-center lg:block xl:w-72">
              <CarePanel sensors={sensors} onOpenDiary={() => setScreen('diary')} />
            </aside>
          </div>
        ) : (
          <Diary
            plant={PLANTS[plant]}
            entries={diary.entries}
            loading={diary.loading}
            configured={diary.configured}
            onGrow={grow}
            onAdd={diary.add}
          />
        )}
      </main>

      {/* screen switch */}
      <button
        onClick={() => setScreen(screen === 'home' ? 'diary' : 'home')}
        className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold shadow-[var(--shadow-soft)] transition hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {screen === 'home' ? '다이어리로 넘어가기' : '홈으로 돌아가기'}
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d={screen === 'home' ? 'M5 12h14M13 6l6 6-6 6' : 'M19 12H5M11 18l-6-6 6-6'} />
        </svg>
      </button>

      {sensor && (
        <SensorModal
          sensor={sensor}
          sensors={sensors}
          onChange={(value) => setSensors((prev) => ({ ...prev, [sensor.id]: value }))}
          onClose={closeSensor}
        />
      )}

      {cameraOpen && (
        <CameraModal plantName={PLANTS[plant].name} onClose={() => setCameraOpen(false)} />
      )}

      {settingsOpen && (
        <SettingsPanel
          theme={theme}
          plant={plant}
          onTheme={setTheme}
          onPlant={changePlant}
          onHarvest={harvest}
          onSignOut={onSignOut}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
    </MusicProvider>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // With Supabase unconfigured we skip auth entirely and show the app.
    if (!isSupabaseConfigured) {
      setReady(true)
      return
    }
    getSession().then((s) => {
      setSession(s)
      setReady(true)
    })
    return onAuthChange((s) => setSession(s))
  }, [])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        불러오는 중…
      </div>
    )
  }

  if (isSupabaseConfigured && !session) return <AuthScreen />

  // Key by user so all per-user state (diary, etc.) resets on account switch.
  return <MainApp key={session?.user.id ?? 'local'} onSignOut={signOut} />
}
