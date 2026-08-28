import { isSupabaseConfigured, supabase } from './supabase'

export const MUSIC_BUCKET = 'music'

export type MusicTrack = {
  id: string
  name: string
  mood: string
  src: string
}

const AUDIO_RE = /\.(mp3|m4a|aac|ogg|oga|wav|flac|webm)$/i

function prettyName(fileName: string) {
  return fileName.replace(AUDIO_RE, '').replace(/[_-]+/g, ' ').trim() || fileName
}

export type MusicResult = { tracks: MusicTrack[]; error: string | null }

/** List audio files in the `music` bucket as playable tracks (signed URLs). */
export async function loadMusicTracks(): Promise<MusicResult> {
  if (!isSupabaseConfigured) return { tracks: [], error: 'Supabase가 연결되지 않았어요' }

  const { data, error } = await supabase.storage
    .from(MUSIC_BUCKET)
    .list('', { limit: 200, sortBy: { column: 'name', order: 'asc' } })

  if (error) {
    return {
      tracks: [],
      error: `'${MUSIC_BUCKET}' 버킷을 읽지 못했어요: ${error.message}`,
    }
  }
  if (!data || data.length === 0) {
    // A missing SELECT policy returns an empty list with no error.
    return { tracks: [], error: "곡이 없거나 'music' 버킷 읽기 권한이 없어요" }
  }

  const files = data.filter((f) => f.name && AUDIO_RE.test(f.name))
  if (files.length === 0) {
    return {
      tracks: [],
      error: '버킷에 오디오 파일 형식(mp3, m4a, wav 등)이 없어요',
    }
  }
  const tracks = files.map((f) => ({
    id: f.name,
    name: prettyName(f.name),
    mood: '내 보관함',
    src: supabase.storage.from(MUSIC_BUCKET).getPublicUrl(f.name).data.publicUrl,
  }))
  return { tracks, error: null }
}
