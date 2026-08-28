import { useEffect, useRef, useState } from 'react'
import { isSupabaseConfigured } from '../lib/supabase'
import { loadMusicTracks, type MusicTrack as Track } from '../lib/musicStore'

// Fallback royalty-free tracks, shown only when the `music` bucket is empty.
const SAMPLE_TRACKS: Track[] = [
  {
    id: 'calm',
    name: '잔잔한 오후',
    mood: '샘플 · 휴식',
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: 'sunny',
    name: '햇살 가득',
    mood: '샘플 · 활력',
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
  },
  {
    id: 'night',
    name: '고요한 밤',
    mood: '샘플 · 집중',
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
]

function fmt(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function MusicButton() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<string | null>(null) // id that is actively playing
  const [loadedId, setLoadedId] = useState<string | null>(null) // id whose audio is loaded
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [tracks, setTracks] = useState<Track[]>(SAMPLE_TRACKS)
  const [fromBucket, setFromBucket] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [bucketError, setBucketError] = useState<string | null>(null)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const seekingRef = useRef(false)
  const advanceRef = useRef<() => void>(() => {})

  const refresh = async () => {
    if (!isSupabaseConfigured) return
    setFetching(true)
    setBucketError(null)
    try {
      const { tracks: rows, error } = await loadMusicTracks()
      if (rows.length) {
        setTracks(rows)
        setFromBucket(true)
      } else {
        setTracks(SAMPLE_TRACKS)
        setFromBucket(false)
        setBucketError(error)
      }
    } catch (e) {
      setTracks(SAMPLE_TRACKS)
      setFromBucket(false)
      setBucketError(e instanceof Error ? e.message : '음악을 불러오지 못했어요')
    } finally {
      setFetching(false)
    }
  }

  // Load the user's Supabase music library each time the menu opens.
  useEffect(() => {
    if (open && isSupabaseConfigured) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    const audio = new Audio()
    audio.volume = 0.6
    audioRef.current = audio

    const onTime = () => {
      if (!seekingRef.current) setTime(audio.currentTime)
    }
    const onMeta = () => setDuration(audio.duration || 0)
    // When a track finishes, play the next one; wrap back to the top.
    const onEnded = () => advanceRef.current()
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('durationchange', onMeta)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('durationchange', onMeta)
      audio.removeEventListener('ended', onEnded)
      audio.pause()
      audio.src = ''
    }
  }, [])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-music-root]')) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Load a track from the start and play it.
  const startTrack = async (track: Track) => {
    const audio = audioRef.current
    if (!audio) return
    audio.src = track.src
    setLoadedId(track.id)
    setTime(0)
    setDuration(0)
    setLoadingId(track.id)
    try {
      await audio.play()
      setCurrent(track.id)
    } catch {
      setCurrent(null)
    } finally {
      setLoadingId(null)
    }
  }

  const play = async (track: Track) => {
    const audio = audioRef.current
    if (!audio) return

    // Same track already loaded → toggle pause/resume, keeping the position.
    if (loadedId === track.id) {
      if (current === track.id) {
        audio.pause()
        setCurrent(null)
      } else {
        try {
          await audio.play()
          setCurrent(track.id)
        } catch {
          setCurrent(null)
        }
      }
      return
    }

    startTrack(track)
  }

  // Keep the "on ended" handler pointed at the latest tracks / position so it
  // can advance to the next track (wrapping to the first) with fresh state.
  useEffect(() => {
    advanceRef.current = () => {
      if (tracks.length === 0) return
      const i = tracks.findIndex((t) => t.id === loadedId)
      const next = tracks[(i + 1 + tracks.length) % tracks.length]
      if (next) startTrack(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks, loadedId])

  const togglePlay = () => {
    const np = tracks.find((t) => t.id === loadedId)
    if (np) play(np)
  }

  const skip = (dir: 1 | -1) => {
    if (tracks.length === 0) return
    const i = tracks.findIndex((t) => t.id === loadedId)
    const base = i === -1 ? 0 : i
    const next = tracks[(base + dir + tracks.length) % tracks.length]
    if (next) startTrack(next)
  }

  const seekTo = (value: number) => {
    const audio = audioRef.current
    if (audio) audio.currentTime = value
    setTime(value)
  }

  const playing = current !== null
  const nowPlaying = tracks.find((t) => t.id === loadedId) ?? null
  const seekPct = duration > 0 ? (time / duration) * 100 : 0

  return (
    <div className="relative" data-music-root>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="음악 변경"
        aria-pressed={playing}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border bg-card transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          playing
            ? 'border-primary/60 text-primary'
            : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        {playing && (
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
        )}
      </button>

      {open && (
        <div className="animate-float-in absolute left-0 top-12 z-50 w-72 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="font-display text-sm font-medium tracking-[0.1em] text-muted-foreground">
              음악 선택
            </p>
            {isSupabaseConfigured && (
              <button
                onClick={refresh}
                aria-label="보관함 새로고침"
                className="rounded-full p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 ${fetching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
              </button>
            )}
          </div>
          {!fromBucket && isSupabaseConfigured && (
            <p className={`px-2 pb-1 text-[0.68rem] ${bucketError ? 'text-accent' : 'text-muted-foreground'}`}>
              {fetching
                ? '보관함을 불러오는 중…'
                : bucketError
                  ? bucketError
                  : "'music' 버킷에 곡을 올리면 여기 표시돼요 (지금은 샘플)"}
            </p>
          )}
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {tracks.map((track) => {
              const active = current === track.id
              const loaded = loadedId === track.id
              return (
                <button
                  key={track.id}
                  onClick={() => play(track)}
                  className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${
                    loaded ? 'bg-secondary' : 'hover:bg-secondary/60'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      active ? 'bg-primary text-primary-foreground' : 'bg-background text-primary'
                    }`}
                  >
                    {loadingId === track.id ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M21 12a9 9 0 1 1-6.2-8.5" strokeLinecap="round" />
                      </svg>
                    ) : active ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                        <rect x="6" y="5" width="4" height="14" rx="1" />
                        <rect x="14" y="5" width="4" height="14" rx="1" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{track.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {loaded && !active ? '일시정지됨' : track.mood}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {/* now playing + seek bar */}
          {nowPlaying && (
            <div className="mt-2 rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => skip(-1)}
                  aria-label="이전 곡"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M6 5h2v14H6zM20 5l-11 7 11 7z" />
                  </svg>
                </button>
                <button
                  onClick={togglePlay}
                  aria-label={playing ? '일시정지' : '재생'}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90"
                >
                  {playing ? (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <rect x="6" y="5" width="4" height="14" rx="1" />
                      <rect x="14" y="5" width="4" height="14" rx="1" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => skip(1)}
                  aria-label="다음 곡"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M16 5h2v14h-2zM4 5l11 7-11 7z" />
                  </svg>
                </button>
                <div className="min-w-0 flex-1 pl-1">
                  <p className="truncate text-sm font-medium">{nowPlaying.name}</p>
                  <p className="truncate text-[0.68rem] text-muted-foreground">{nowPlaying.mood}</p>
                </div>
              </div>

              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={Math.min(time, duration || 0)}
                onPointerDown={() => (seekingRef.current = true)}
                onChange={(e) => setTime(Number(e.target.value))}
                onPointerUp={(e) => {
                  seekingRef.current = false
                  seekTo(Number((e.target as HTMLInputElement).value))
                }}
                onKeyUp={(e) => seekTo(Number((e.target as HTMLInputElement).value))}
                aria-label="재생 위치"
                className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow"
                style={{
                  background: `linear-gradient(to right, var(--primary) ${seekPct}%, var(--sensor-track) ${seekPct}%)`,
                }}
              />
              <div className="mt-1 flex justify-between font-mono text-[0.65rem] text-muted-foreground">
                <span>{fmt(time)}</span>
                <span>{fmt(duration)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
