import { useEffect } from 'react'
import dropSound from '../imports/Water Drop Sound Effect (HD)  How to (mp3cut.net).mp3'

/**
 * Plays a water-drop sound whenever a button (or role="button"/link) is
 * clicked, anywhere in the app.
 *
 * Uses the Web Audio API instead of an <audio> element: browsers (especially
 * mobile Safari and published/hosted contexts) reliably allow Web Audio once
 * the AudioContext is resumed inside a user gesture, and buffer playback has no
 * latency and overlaps cleanly on rapid clicks.
 */
export function useClickSound(volume = 0.5) {
  useEffect(() => {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return

    let ctx: AudioContext | null = null
    let buffer: AudioBuffer | null = null
    let loading: Promise<void> | null = null

    const ensure = async () => {
      if (!ctx) ctx = new AudioCtx()
      if (ctx.state === 'suspended') await ctx.resume()
      if (!buffer && !loading) {
        loading = fetch(dropSound)
          .then((r) => r.arrayBuffer())
          .then((data) => ctx!.decodeAudioData(data))
          .then((decoded) => {
            buffer = decoded
          })
          .catch(() => {})
      }
      await loading
    }

    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest(
        'button, [role="button"], a[href]',
      )
      if (!el) return
      ensure().then(() => {
        if (!ctx || !buffer) return
        const src = ctx.createBufferSource()
        src.buffer = buffer
        const gain = ctx.createGain()
        gain.gain.value = volume
        src.connect(gain).connect(ctx.destination)
        src.start(0)
      })
    }

    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      ctx?.close().catch(() => {})
    }
  }, [volume])
}
