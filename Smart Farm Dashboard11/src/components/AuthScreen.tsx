import { useState } from 'react'
import { LOGO } from '../plantImages'
import { resetPassword, signIn, signUp } from '../lib/auth'

type Mode = 'login' | 'register' | 'reset'

// Decorative field icons.
function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
    </svg>
  )
}
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  )
}
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const switchTo = (m: Mode) => {
    setMode(m)
    setError(null)
    setPassword('')
    setConfirm('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    if (mode === 'register' && password !== confirm) {
      setError('비밀번호가 일치하지 않아요')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
        // AuthScreen unmounts once the session propagates.
      } else if (mode === 'reset') {
        await resetPassword(email)
        switchTo('login')
        setNotice('비밀번호 재설정 메일을 보냈어요. 메일함을 확인해주세요')
      } else {
        const { needsConfirmation } = await signUp(email, password, username)
        switchTo('login')
        setNotice(
          needsConfirmation
            ? '가입 완료! 이메일 인증 후 로그인해주세요'
            : '가입 완료! 이제 로그인해주세요',
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '문제가 발생했어요')
    } finally {
      setBusy(false)
    }
  }

  const isLogin = mode === 'login'
  const isReset = mode === 'reset'

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      {/* smart-farm night garden backdrop */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_50%_-10%,#123a2e_0%,#0d2a24_45%,#081d1a_100%)]" />
      {/* stars */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {STARS.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{ left: s.x, top: s.y, width: s.r, height: s.r, opacity: s.o }}
          />
        ))}
      </div>
      {/* soft grow-light glow */}
      <div className="pointer-events-none absolute -z-10 left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl" />
      {/* leaf silhouettes along the bottom */}
      <svg viewBox="0 0 1440 220" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-48 w-full text-emerald-950/80" fill="currentColor">
        <path d="M0 220V120c40-6 60 30 80 40s40-20 70-10 30 40 60 40 40-50 80-40 30 50 70 40 40-60 90-45 40 55 80 45 40-45 90-35 40 45 80 40 50-40 90-30 50 35 90 30 40-30 90-20 40 25 70 30V220Z" />
      </svg>

      <div className="animate-float-in w-full max-w-sm rounded-[2rem] border border-white/15 bg-white/10 p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
        <div className="flex flex-col items-center">
          <img src={LOGO} alt="GRO FARM" className="h-14 w-14 rounded-2xl object-contain" />
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white">
            {isLogin ? '로그인' : isReset ? '비밀번호 찾기' : '회원가입'}
          </h1>
          <p className="mt-1 text-xs text-emerald-100/70">
            {isLogin
              ? 'GRO FARM에 오신 걸 환영해요'
              : isReset
                ? '가입한 이메일로 재설정 링크를 보내드려요'
                : '스마트팜 계정을 만들어보세요'}
          </p>
        </div>

        <form onSubmit={submit} className="mt-7 space-y-3">
          {mode === 'register' && (
            <Field icon={<UserIcon />}>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="이름 (닉네임)"
                required
                autoComplete="nickname"
                className={inputCls}
              />
            </Field>
          )}
          <Field icon={<MailIcon />}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              required
              autoComplete="email"
              className={inputCls}
            />
          </Field>
          {!isReset && (
            <Field icon={<LockIcon />}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className={inputCls}
              />
            </Field>
          )}
          {mode === 'register' && (
            <Field icon={<LockIcon />}>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="비밀번호 확인"
                required
                autoComplete="new-password"
                className={inputCls}
              />
            </Field>
          )}

          {isLogin && (
            <div className="flex items-center justify-between px-1 text-xs text-emerald-100/80">
              <label className="flex cursor-pointer items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-3.5 w-3.5 accent-emerald-400"
                />
                로그인 유지
              </label>
              <button
                type="button"
                onClick={() => switchTo('reset')}
                className="font-medium transition hover:text-white"
              >
                비밀번호 찾기
              </button>
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-red-500/20 px-3 py-2 text-xs text-red-100">{error}</p>
          )}
          {notice && (
            <p className="rounded-xl bg-emerald-500/20 px-3 py-2 text-xs text-emerald-50">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 w-full rounded-full bg-white py-3 font-display text-sm font-semibold text-emerald-950 shadow-lg transition hover:bg-emerald-50 disabled:opacity-60"
          >
            {busy
              ? '처리 중…'
              : isLogin
                ? '로그인'
                : isReset
                  ? '재설정 메일 보내기'
                  : '가입하기'}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-emerald-100/80">
          {isLogin ? (
            <>
              계정이 없으신가요?{' '}
              <button
                onClick={() => switchTo('register')}
                className="font-semibold text-white underline-offset-4 transition hover:underline"
              >
                회원가입
              </button>
            </>
          ) : (
            <>
              {isReset ? '비밀번호가 기억나셨나요?' : '이미 계정이 있으신가요?'}{' '}
              <button
                onClick={() => switchTo('login')}
                className="font-semibold text-white underline-offset-4 transition hover:underline"
              >
                로그인
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const inputCls =
  'w-full bg-transparent text-sm text-white placeholder:text-emerald-100/50 outline-none'

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-3 transition focus-within:border-emerald-300/60">
      <span className="text-emerald-100/70">{icon}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

// Precomputed star field so it stays stable across renders.
const STARS = Array.from({ length: 46 }, () => ({
  x: `${Math.random() * 100}%`,
  y: `${Math.random() * 65}%`,
  r: `${Math.random() * 2 + 1}px`,
  o: Math.random() * 0.6 + 0.2,
}))
