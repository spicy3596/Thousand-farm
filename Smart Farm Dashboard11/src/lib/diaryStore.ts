import { isSupabaseConfigured, supabase } from './supabase'
import { getCurrentUser } from './auth'

export const DIARY_BUCKET = 'diary-images'
export const FARM_BUCKET = 'farm-photos'
const SIGNED_TTL = 60 * 60 * 24 * 7 // 7 days

export type DiaryEntry = {
  id: string
  date: string
  title: string
  body: string
  imagePath: string // path within the diary bucket ('' when no photo)
  photo: string // signed display URL (resolved at load time)
}

// Row shape of the `diaries` table (the client has no generated DB types).
type DiaryRow = {
  id: string | number
  title: string
  content: string | null
  image_url: string | null
  created_at: string
}

const IMAGE_RE = /\.(png|jpe?g|webp|gif|bmp|heic|heif|avif)$/i

function extOf(blob: Blob): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  return map[blob.type] ?? 'jpg'
}

async function signedUrl(path: string): Promise<string> {
  if (!path) return ''
  const { data, error } = await supabase.storage
    .from(DIARY_BUCKET)
    .createSignedUrl(path, SIGNED_TTL)
  if (error) {
    // A missing object just means the entry has no viewable photo (e.g. legacy
    // rows saved under the old path layout) — degrade quietly to no image.
    if (!/not\s*found/i.test(error.message)) {
      console.warn('[diary] 사진 URL 생성 실패:', error.message)
    }
    return ''
  }
  return data?.signedUrl ?? ''
}

/**
 * Load the signed-in user's diary entries (newest first). When `plantId` is
 * given, only entries linked to that plant are returned; otherwise all of the
 * user's entries come back.
 */
export async function loadDiaryEntries(
  plantId?: number | null,
): Promise<DiaryEntry[]> {
  if (!isSupabaseConfigured) return []
  const user = await getCurrentUser()
  if (!user) return []

  let query = supabase
    .from('diaries')
    .select('id, title, content, image_url, created_at')
    .eq('user_id', user.id)
  if (plantId != null) query = query.eq('plant_id', plantId)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw new Error(`다이어리를 불러오지 못했어요: ${error.message}`)

  return Promise.all(
    ((data ?? []) as DiaryRow[]).map(async (row) => {
      const imagePath = row.image_url ?? ''
      return {
        id: String(row.id),
        date: String(row.created_at).slice(0, 10),
        title: row.title,
        body: row.content ?? '',
        imagePath,
        photo: await signedUrl(imagePath),
      }
    }),
  )
}

/** Upload a photo (if any) under the user's folder, then insert the entry. */
export async function addDiaryEntry(input: {
  title: string
  body: string
  photo: Blob | null
  plantId?: number | null
}): Promise<DiaryEntry> {
  if (!isSupabaseConfigured) throw new Error('Supabase가 설정되어 있지 않아요')
  const user = await getCurrentUser()
  if (!user) throw new Error('로그인이 필요해요')

  // Photos live at diary-images/<userId>/<uuid>.<ext> so RLS can scope them.
  let imagePath = ''
  if (input.photo) {
    imagePath = `${user.id}/${crypto.randomUUID()}.${extOf(input.photo)}`
    const { error } = await supabase.storage
      .from(DIARY_BUCKET)
      .upload(imagePath, input.photo, {
        contentType: input.photo.type || 'image/jpeg',
        upsert: false,
      })
    if (error) throw new Error(`사진을 저장하지 못했어요: ${error.message}`)
  }

  const { data, error } = await supabase
    .from('diaries')
    .insert({
      user_id: user.id,
      plant_id: input.plantId ?? null,
      title: input.title.trim(),
      content: input.body,
      image_url: imagePath || null,
    } as never)
    .select('id, title, content, image_url, created_at')
    .single()

  if (error) {
    // Roll back the just-uploaded photo if the row failed to save.
    if (imagePath) await supabase.storage.from(DIARY_BUCKET).remove([imagePath])
    throw new Error(`다이어리를 저장하지 못했어요: ${error.message}`)
  }

  const row = data as DiaryRow
  return {
    id: String(row.id),
    date: String(row.created_at).slice(0, 10),
    title: row.title,
    body: row.content ?? '',
    imagePath: row.image_url ?? '',
    photo: await signedUrl(row.image_url ?? ''),
  }
}

/** Delete every diary row + photo belonging to the signed-in user. */
export async function clearDiary(): Promise<void> {
  if (!isSupabaseConfigured) return
  const user = await getCurrentUser()
  if (!user) throw new Error('로그인이 필요해요')

  // RLS also enforces this, but scoping the delete keeps it explicit.
  const { error: diaryError } = await supabase
    .from('diaries')
    .delete()
    .eq('user_id', user.id)
  if (diaryError) throw new Error(`다이어리를 삭제하지 못했어요: ${diaryError.message}`)

  const { data, error: listError } = await supabase.storage
    .from(DIARY_BUCKET)
    .list(user.id, { limit: 1000 })
  if (listError) throw new Error(`다이어리 사진을 확인하지 못했어요: ${listError.message}`)

  const paths = (data ?? [])
    .filter((f) => f.name && f.name !== '.emptyFolderPlaceholder' && IMAGE_RE.test(f.name))
    .map((f) => `${user.id}/${f.name}`)
  if (paths.length) {
    const { error: removeError } = await supabase.storage.from(DIARY_BUCKET).remove(paths)
    if (removeError) throw new Error(`다이어리 사진을 삭제하지 못했어요: ${removeError.message}`)
  }
}

/** Pull the most recent photo the smart farm dropped into `farm-photos`. */
export async function latestFarmPhoto(): Promise<{ url: string; blob: Blob } | null> {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase.storage
    .from(FARM_BUCKET)
    .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
  if (error) throw new Error(`'${FARM_BUCKET}' 버킷을 읽지 못했어요: ${error.message}`)
  if (!data || data.length === 0) {
    throw new Error("'farm-photos' 버킷이 비었거나 읽기 권한이 없어요")
  }
  // Skip folders and Supabase's placeholder object; keep real image files.
  const file = data.find(
    (f) => f.id !== null && IMAGE_RE.test(f.name) && f.name !== '.emptyFolderPlaceholder',
  )
  if (!file) throw new Error('스마트팜 사진을 찾지 못했어요')
  const { data: blob, error: dlErr } = await supabase.storage.from(FARM_BUCKET).download(file.name)
  if (dlErr || !blob) {
    throw new Error(`사진을 내려받지 못했어요: ${dlErr?.message ?? '알 수 없는 오류'}`)
  }
  return { url: URL.createObjectURL(blob), blob }
}

export type TimelapseFrame = { id: string; url: string; at: number; caption: string }

/**
 * Every photo in `farm-photos`, oldest first, with signed URLs — the raw
 * material for the growth timelapse. Returns [] when the bucket is unreadable.
 */
export async function listFarmPhotos(limit = 300): Promise<TimelapseFrame[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase.storage
    .from(FARM_BUCKET)
    .list('', { limit, sortBy: { column: 'created_at', order: 'asc' } })
  if (error || !data) return []
  const files = data.filter(
    (f) => f.id !== null && IMAGE_RE.test(f.name) && f.name !== '.emptyFolderPlaceholder',
  )
  if (!files.length) return []
  const { data: signed } = await supabase.storage
    .from(FARM_BUCKET)
    .createSignedUrls(files.map((f) => f.name), SIGNED_TTL)
  return files.flatMap((f, i) => {
    const url = signed?.[i]?.signedUrl
    if (!url) return []
    return [{ id: `farm-${f.name}`, url, at: new Date(f.created_at ?? Date.now()).getTime(), caption: '스마트팜 카메라' }]
  })
}
