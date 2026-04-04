import { loadFromLocalStorage, saveToLocalStorage } from '@/utils'
import {
  getNeonOnlineSession,
  OnlineAuthSession,
  signInWithNeonProvider,
  signOutNeonSession,
} from '@/lib/neonAuthClient'

const ONLINE_AUTH_SESSION_KEY = 'cz101.online-auth-session.v1'

export function loadOnlineAuthSession(): OnlineAuthSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  const stored = loadFromLocalStorage(ONLINE_AUTH_SESSION_KEY, null)
  if (!stored || typeof stored !== 'object') {
    return null
  }

  const session = stored as Partial<OnlineAuthSession>
  if (!session.userId) {
    return null
  }

  return {
    userId: String(session.userId),
    displayName: String(session.displayName ?? ''),
    provider: String(session.provider ?? 'unknown'),
  }
}

export function saveOnlineAuthSession(session: OnlineAuthSession): void {
  if (typeof window === 'undefined') {
    return
  }

  saveToLocalStorage(ONLINE_AUTH_SESSION_KEY, {
    userId: session.userId,
    displayName: session.displayName,
    provider: session.provider,
  })
}

export function clearOnlineAuthSession(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(ONLINE_AUTH_SESSION_KEY)
}

export async function refreshOnlineAuthSession(): Promise<OnlineAuthSession | null> {
  const session = await getNeonOnlineSession()
  if (session) {
    saveOnlineAuthSession(session)
    return session
  }

  clearOnlineAuthSession()
  return null
}

export async function startOnlineProviderSignIn(
  provider: 'google' | 'apple',
): Promise<void> {
  if (typeof window === 'undefined') {
    return
  }

  // Use origin as callback to avoid malformed paths (e.g. accidental double slashes).
  await signInWithNeonProvider(provider, window.location.origin)
}

export async function disconnectOnlineSession(): Promise<void> {
  try {
    await signOutNeonSession()
  } finally {
    clearOnlineAuthSession()
  }
}