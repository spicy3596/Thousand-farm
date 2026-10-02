import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabase'

export type { Session }

export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

/** The currently signed-in user (or null). */
export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase.auth.getUser()
  return data.user
}

/** Subscribe to auth changes (login / logout / token refresh). */
export function onAuthChange(cb: (session: Session | null) => void): () => void {
  if (!isSupabaseConfigured) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) throw new Error(translateAuthError(error.message))
}

/**
 * Register a new member. The nickname is stored in auth metadata; a Supabase
 * trigger on auth.users copies it into the `profiles` table
 * (id / nickname / created_at), so we don't write that row from the client.
 * Returns whether the account is immediately usable (no email confirmation).
 */
export async function signUp(
  email: string,
  password: string,
  username: string,
): Promise<{ needsConfirmation: boolean }> {
  const nickname = username.trim()
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    // The DB trigger reads raw_user_meta_data->>'nickname' to seed profiles.
    options: { data: { nickname } },
  })
  if (error) throw new Error(translateAuthError(error.message))

  return { needsConfirmation: !data.session }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

/** Email the user a password-reset link for the address they signed up with. */
export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin,
  })
  if (error) throw new Error(translateAuthError(error.message))
}

/** Turn common Supabase auth messages into friendly Korean copy. */
function translateAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login')) return '이메일 또는 비밀번호가 올바르지 않아요'
  if (m.includes('already registered') || m.includes('already exists')) {
    return '이미 가입된 이메일이에요'
  }
  if (m.includes('password') && m.includes('6')) return '비밀번호는 6자 이상이어야 해요'
  if (m.includes('email') && m.includes('valid')) return '이메일 형식을 확인해주세요'
  if (m.includes('confirm')) return '이메일 인증이 필요해요. 메일함을 확인해주세요'
  return message
}
