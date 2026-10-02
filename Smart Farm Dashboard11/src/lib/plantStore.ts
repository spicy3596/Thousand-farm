import { isSupabaseConfigured, supabase } from './supabase'
import { getCurrentUser } from './auth'

export type PlantRecord = {
  id: number
  user_id: string
  name: string
  type: string
  planted_at: string | null
  growth_stage: number
  created_at: string
}

const COLUMNS = 'id, user_id, name, type, planted_at, growth_stage, created_at'

/** The signed-in user's plant (oldest first), or null when none exists yet. */
export async function loadMyPlant(): Promise<PlantRecord | null> {
  if (!isSupabaseConfigured) return null
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('plants')
    .select(COLUMNS)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`식물 정보를 불러오지 못했어요: ${error.message}`)

  return (data as PlantRecord | null) ?? null
}

export async function createMyPlant(input: {
  type: string
  name: string
  plantedAt?: string | null
  growthStage?: number
}): Promise<PlantRecord> {
  if (!isSupabaseConfigured) throw new Error('Supabase가 설정되어 있지 않아요')
  const user = await getCurrentUser()
  if (!user) throw new Error('로그인이 필요해요')

  const { data, error } = await supabase
    .from('plants')
    .insert({
      user_id: user.id,
      type: input.type,
      name: input.name,
      planted_at: input.plantedAt ?? new Date().toISOString().slice(0, 10),
      growth_stage: input.growthStage ?? 1,
    } as never)
    .select(COLUMNS)
    .single()
  if (error) throw new Error(`식물 정보를 저장하지 못했어요: ${error.message}`)

  return data as PlantRecord
}

export async function updateMyPlant(
  plantId: number,
  input: {
    type?: string
    name?: string
    plantedAt?: string | null
    growthStage?: number
  },
): Promise<PlantRecord> {
  if (!isSupabaseConfigured) throw new Error('Supabase가 설정되어 있지 않아요')
  const user = await getCurrentUser()
  if (!user) throw new Error('로그인이 필요해요')

  const update: Record<string, unknown> = {}
  if (input.type !== undefined) update.type = input.type
  if (input.name !== undefined) update.name = input.name
  if (input.plantedAt !== undefined) update.planted_at = input.plantedAt
  if (input.growthStage !== undefined) update.growth_stage = input.growthStage

  const { data, error } = await supabase
    .from('plants')
    .update(update as never)
    .eq('id', plantId)
    .eq('user_id', user.id)
    .select(COLUMNS)
    .single()
  if (error) throw new Error(`식물 정보를 수정하지 못했어요: ${error.message}`)

  return data as PlantRecord
}
