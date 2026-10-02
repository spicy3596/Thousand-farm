import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { listFarmPhotos, type DiaryEntry, type TimelapseFrame } from '../lib/diaryStore'

type Props = { plantName: string; entries: DiaryEntry[]; onClose: () => void }

const SPEEDS = [
  { label: '0.5×', ms: 1200 },
  { label: '1×', ms: 600 },
  { label: '2×', ms: 300 },
]

function formatDay(t: number) {
  return new Date(t).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function TimelapseModal({ plantName, entries, onClose }: Props) {
  const [farm, setFarm] = useState<TimelapseFrame[] | null>(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [loop, setLoop] = useState(true)
  const loaded = useRef(new Set<string>())

  useEffect(() => {
    listFarmPhotos().then(setFarm)
  }, [])

  // Diary photos + farm camera shots, merged on one timeline.
  const frames = useMemo<TimelapseFrame[]>(() => {
    const diary = entries
      .filter((e) => e.photo)
      .map((e) => ({ id: `diary-${e.id}`, url: e.photo, at: new Date(e.date + 'T12:00:00').getTime(), caption: e.title || '다이어리' }))
    return [...diary, ...(farm ?? [])].sort((a, b) => a.at - b.at)
  }, [entries, farm])

  const last = frames.length - 1
  const frame = frames[Math.min(index, Math.max(0, last))]
  const days = frames.length ? Math.max(1, Math.round((frames[last].at - frames[0].at) / 86400000) + 1) : 0
  const dayOf = frame && frames.length ? Math.round((frame.at - frames[0].at) / 86400000) + 1 : 0

  // Preload so playback doesn't flash.
  useEffect(() => {
    frames.forEach((f) => {
      if (loaded.current.has(f.url)) return
      const img = new Image()
      img.src = f.url
      loaded.current.add(f.url)
    })
  }, [frames])

  useEffect(() => {
    if (!playing || frames.length < 2) return
    const t = setInterval(() => {
      setIndex((i) => {
        if (i < last) return i + 1
        if (loop) return 0
        setPlaying(false)
        return i
      })
    }, SPEEDS[speed].ms)
    return () => clearInterval(t)
  }, [playing, speed, loop, last, frames.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === ' ') {
        e.preventDefault()
        setPlaying((p) => !p)
      } else if (e.key === 'ArrowRight') setIndex((i) => Math.min(last, i + 1))
      else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, last])

  const togglePlay = () => {
    if (!playing && index >= last) setIndex(0)
    setPlaying((p) => !p)
  }

  // Portal out of <main>'s stacking context so it sits above the screen switch.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="성장 타임랩스">
      <button aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" />

      <div className="animate-float-in relative flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[calc(var(--radius)+0.5rem)] border border-border bg-popover text-popover-foreground shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between px-6 pt-5">
          <div>
            <p className="font-display text-xs font-medium tracking-[0.2em] text-muted-foreground">TIMELAPSE</p>
            <h2 className="mt-1 font-display text-xl font-semibold">{plantName}의 성장 기록</h2>
            {frames.length > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                사진 {frames.length}장 · {days}일간의 이야기
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="닫기" className="rounded-full p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* stage */}
        <div className="relative mx-6 mt-4 aspect-[4/3] overflow-hidden rounded-2xl bg-secondary">
          {farm === null && frames.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">사진을 모으는 중…</div>
          ) : frames.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="text-4xl">📷</span>
              <p className="mt-3 font-display font-medium">아직 사진이 없어요</p>
              <p className="mt-1 text-sm text-muted-foreground">다이어리에 사진을 남기면 타임랩스가 만들어져요</p>
            </div>
          ) : (
            <>
              {frames.map((f, i) => (
                <img
                  key={f.id}
                  src={f.url}
                  alt={i === index ? `${formatDay(f.at)} ${f.caption}` : ''}
                  aria-hidden={i !== index}
                  className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
                  style={{ opacity: i === index ? 1 : 0 }}
                />
              ))}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-10 text-white">
                <div>
                  <p className="font-display text-2xl font-semibold leading-none">D+{dayOf}</p>
                  <p className="mt-1 text-xs opacity-80">
                    {formatDay(frame.at)} · {frame.caption}
                  </p>
                </div>
                <p className="font-mono text-xs opacity-80">
                  {index + 1} / {frames.length}
                </p>
              </div>
            </>
          )}
        </div>

        {/* controls */}
        <div className="px-6 pb-6 pt-4">
          <input
            type="range"
            min={0}
            max={Math.max(0, last)}
            value={index}
            disabled={frames.length < 2}
            onChange={(e) => {
              setPlaying(false)
              setIndex(Number(e.target.value))
            }}
            aria-label="프레임 이동"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none disabled:opacity-40 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary"
            style={{
              background: `linear-gradient(to right, var(--primary) ${last ? (index / last) * 100 : 0}%, var(--sensor-track) 0)`,
            }}
          />

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={frames.length < 2}
                aria-label="이전 사진"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card transition hover:border-primary/50 disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14L9 12z" /></svg>
              </button>
              <button
                onClick={togglePlay}
                disabled={frames.length < 2}
                aria-label={playing ? '일시정지' : '재생'}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-soft)] transition hover:opacity-90 disabled:opacity-40"
              >
                {playing ? (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor"><path d="M7 4v16l13-8z" /></svg>
                )}
              </button>
              <button
                onClick={() => setIndex((i) => Math.min(last, i + 1))}
                disabled={frames.length < 2}
                aria-label="다음 사진"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card transition hover:border-primary/50 disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M16 5h2v14h-2zM4 5v14l11-7z" /></svg>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setLoop((l) => !l)}
                aria-pressed={loop}
                aria-label="반복 재생"
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                  loop ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3" />
                </svg>
              </button>
              <div className="flex rounded-full bg-secondary p-0.5 text-xs font-medium" role="radiogroup" aria-label="재생 속도">
                {SPEEDS.map((s, i) => (
                  <button
                    key={s.label}
                    role="radio"
                    aria-checked={speed === i}
                    onClick={() => setSpeed(i)}
                    className={`rounded-full px-2.5 py-1 font-mono transition ${
                      speed === i ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ,
    document.body,
  )
}
