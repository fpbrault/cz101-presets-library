import { loadFromLocalStorage, saveToLocalStorage } from '@/utils/utils'
import {
  getNeonOnlineSession,
  OnlineAuthSession,
  signInWithNeonProvider,
  signOutNeonSession,
} from '@/lib/auth/neonAuthClient'

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

  const callbackUrl = `${window.location.origin}?auth_popup=1`
  const redirectUrl = await signInWithNeonProvider(provider, callbackUrl)

  const popup = window.open(redirectUrl, 'neon_auth', 'width=600,height=700,popup=yes')

  if (!popup) {
    // Fallback: full-page redirect if popup was blocked
    window.location.href = redirectUrl
    return
  }

  return new Promise((resolve) => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if ((event.data as { type?: string })?.type === 'auth_complete') {
        window.removeEventListener('message', onMessage)
        clearInterval(poll)
        resolve()
      }
    }
    window.addEventListener('message', onMessage)

    // Fallback: resolve when user manually closes the popup
    const poll = setInterval(() => {
      if (popup.closed) {
        window.removeEventListener('message', onMessage)
        clearInterval(poll)
        resolve()
      }
    }, 500)
  })
}

export async function disconnectOnlineSession(): Promise<void> {
  try {
    await signOutNeonSession()
  } finally {
    clearOnlineAuthSession()
  }
}