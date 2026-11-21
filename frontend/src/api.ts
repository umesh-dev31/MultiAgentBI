/**
 * API Client & Network Helper
 * ----------------------------
 * Backend se JSON requests fetch karne ka centralized helper module:
 * 1. ApiError: HTTP status code aur backend error message preserve karta hai.
 * 2. requestJson<T>: Typed fetch wrapper jo non-200 responses par error extract karta hai.
 */
export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options)
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const detail = body?.error?.message ?? body?.detail
    throw new ApiError(typeof detail === 'string' ? detail : `Request failed (${response.status}).`, response.status)
  }
  return response.json() as Promise<T>
}
