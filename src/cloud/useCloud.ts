import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Trip } from '../types.ts'
import { SUPABASE_ANON_KEY, SUPABASE_URL, cloudConfigured } from './config.ts'
import { SyncEngine, type SyncRecords } from './engine.ts'
import type { Auth, AuthUser, Remote, Store, SyncStatus } from './types.ts'

const RECORDS_KEY = 'travel-planner:sync:v1'
const PENDING_JOIN_KEY = 'travel-planner:pending-join'

export type InviteState =
  | { state: 'needsSignIn' }
  | { state: 'joining' }
  | { state: 'joined'; tripId: string }
  | { state: 'invalid' }
  | { state: 'error'; message: string }

export interface Cloud {
  configured: boolean
  ready: boolean
  user: AuthUser | null
  status: SyncStatus
  error: string | undefined
  engine: SyncEngine | null
  remote: Remote | null
  invite: InviteState | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  dismissInvite: () => void
}

function loadRecords(): SyncRecords {
  try {
    return JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '{}') as SyncRecords
  } catch {
    return {}
  }
}

// An invite link looks like <app url>?join=<token>. The token is remembered across the Google
// sign-in redirect and removed from the address bar.
function readPendingJoin(): string | null {
  const url = new URL(window.location.href)
  const token = url.searchParams.get('join')
  if (token) {
    localStorage.setItem(PENDING_JOIN_KEY, token)
    url.searchParams.delete('join')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  }
  return localStorage.getItem(PENDING_JOIN_KEY)
}

export function useCloud(store: Store, trips: Trip[]): Cloud {
  const [client, setClient] = useState<{ remote: Remote; auth: Auth } | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(!cloudConfigured)
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [error, setError] = useState<string | undefined>()
  const [pendingToken, setPendingToken] = useState<string | null>(() => (cloudConfigured ? readPendingJoin() : null))
  const [inviteResult, setInviteResult] = useState<InviteState | null>(null)

  useEffect(() => {
    if (!cloudConfigured) return
    let cancelled = false
    let off = () => {}
    void (async () => {
      // Loaded on demand so the app starts without the Supabase code when sharing isn't configured
      const { createSupabase } = await import('./supabase.ts')
      const c = createSupabase(SUPABASE_URL, SUPABASE_ANON_KEY)
      if (cancelled) return
      setClient(c)
      off = c.auth.onChange(setUser)
      setUser(await c.auth.getUser())
      setReady(true)
    })()
    return () => {
      cancelled = true
      off()
    }
  }, [])

  const userId = user?.id
  const engine = useMemo(() => {
    if (!client || !userId) return null
    const records = loadRecords()
    return new SyncEngine({
      remote: client.remote,
      store,
      userId,
      records,
      saveRecords: () => localStorage.setItem(RECORDS_KEY, JSON.stringify(records)),
      onStatus: (s, err) => {
        setStatus(s)
        setError(err)
      },
    })
  }, [client, userId, store])

  useEffect(() => {
    if (!engine) return
    engine.start()
    void engine.sync()
    return () => engine.stop()
  }, [engine])

  // Pull other people's changes when the app comes back into view, goes online, or every 30s
  useEffect(() => {
    if (!engine) return
    const run = () => void engine.sync()
    const timer = setInterval(() => document.visibilityState === 'visible' && run(), 30_000)
    window.addEventListener('online', run)
    window.addEventListener('focus', run)
    return () => {
      clearInterval(timer)
      window.removeEventListener('online', run)
      window.removeEventListener('focus', run)
    }
  }, [engine])

  // Push local edits shortly after they stop
  useEffect(() => {
    if (!engine) return
    const timer = setTimeout(() => void engine.pushChanges(), 600)
    return () => clearTimeout(timer)
  }, [engine, trips])

  useEffect(() => {
    if (!engine || !pendingToken) return
    let cancelled = false
    engine
      .join(pendingToken)
      .then((tripId) => {
        if (cancelled) return
        localStorage.removeItem(PENDING_JOIN_KEY)
        setPendingToken(null)
        setInviteResult(tripId ? { state: 'joined', tripId } : { state: 'invalid' })
      })
      .catch((e: unknown) => {
        if (!cancelled) setInviteResult({ state: 'error', message: e instanceof Error ? e.message : String(e) })
      })
    return () => {
      cancelled = true
    }
  }, [engine, pendingToken])

  const signIn = useCallback(async () => {
    await client?.auth.signIn()
  }, [client])

  const signOut = useCallback(async () => {
    await engine?.detachAll()
    await client?.auth.signOut()
  }, [client, engine])

  const dismissInvite = useCallback(() => {
    setInviteResult(null)
    setPendingToken(null)
    localStorage.removeItem(PENDING_JOIN_KEY)
  }, [])

  const invite: InviteState | null =
    inviteResult ??
    (pendingToken && engine ? { state: 'joining' } : pendingToken && ready && !user ? { state: 'needsSignIn' } : null)

  return { configured: cloudConfigured, ready, user, status, error, engine, remote: client?.remote ?? null, invite, signIn, signOut, dismissInvite }
}
