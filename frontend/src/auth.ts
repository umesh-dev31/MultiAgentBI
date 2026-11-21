import { ApiError } from './api'

export interface AuthSession {
  username: string
  email: string
  workspace_id: string
}

export class AuthError extends ApiError {
  readonly field?: string

  constructor(message: string, status: number, field?: string) {
    super(message, status)
    this.field = field
  }
}

async function authRequest(path: string, options?: RequestInit) {
  const response = await fetch('/api/auth/' + path, { cache: 'no-store', ...options })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const detail = body?.detail ?? body?.error?.message
    throw new AuthError(
      typeof detail === 'string' ? detail : 'Authentication request could not be completed.',
      response.status,
      typeof body?.field === 'string' ? body.field : undefined,
    )
  }
  return response
}

export async function getSession(signal: AbortSignal): Promise<AuthSession | null> {
  try {
    const response = await authRequest('session', { signal })
    return await response.json() as AuthSession
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) return null
    throw error
  }
}

export async function submitAuth(
  mode: 'login' | 'signup',
  credentials: { username: string; email: string; password: string } | { identifier: string; password: string },
) {
  await authRequest(mode, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })
}

export async function logout() {
  try {
    await authRequest('logout', { method: 'POST' })
  } catch (error) {
    if (!(error instanceof AuthError) || error.status !== 401) throw error
  }
}
