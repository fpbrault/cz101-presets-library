export function getSyncApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_SYNC_API_BASE_URL

  if (typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, '')
  }

  // Default for same-origin deployments (e.g. Vercel functions)
  return '/api'
}

export function getProviderSignInUrl(provider: 'google' | 'apple'): string {
  return `${getSyncApiBaseUrl()}/auth/${provider}/start`
}