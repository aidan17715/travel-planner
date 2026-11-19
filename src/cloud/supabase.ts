import { createClient } from '@supabase/supabase-js'
import type { Trip } from '../types.ts'
import type { Auth, AuthUser, Collaborator, InviteLink, Remote, RemoteEvent, RemoteTripRow } from './types.ts'

interface TripRecord {
  id: string
  owner_id: string
  data: Trip
  rev: number
}

const toRow = (r: TripRecord): RemoteTripRow => ({ id: r.id, ownerId: r.owner_id, data: r.data, rev: r.rev })

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export function createSupabase(url: string, anonKey: string): { remote: Remote; auth: Auth } {
  const sb = createClient(url, anonKey, { auth: { flowType: 'pkce' } })

  const toUser = (u: { id: string; email?: string } | null | undefined): AuthUser | null =>
    u ? { id: u.id, email: u.email ?? '' } : null

  const auth: Auth = {
    async getUser() {
      const { data } = await sb.auth.getSession()
      return toUser(data.session?.user)
    },
    onChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => cb(toUser(session?.user)))
      return () => data.subscription.unsubscribe()
    },
    async signIn() {
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` },
      })
      check(error)
    },
    async signOut() {
      check((await sb.auth.signOut()).error)
    },
  }

  const remote: Remote = {
    async fetchTrips() {
      const { data, error } = await sb.from('trips').select('id, owner_id, data, rev')
      check(error)
      return ((data ?? []) as TripRecord[]).map(toRow)
    },
    async fetchTrip(id) {
      const { data, error } = await sb.from('trips').select('id, owner_id, data, rev').eq('id', id).maybeSingle()
      check(error)
      return data ? toRow(data as TripRecord) : null
    },
    async insertTrip(id, data) {
      check((await sb.from('trips').insert({ id, data })).error)
    },
    async updateTrip(id, data, expectedRev) {
      // Only succeeds if nobody saved since we last synced; otherwise no row matches
      const { data: rows, error } = await sb
        .from('trips')
        .update({ data, rev: expectedRev + 1 })
        .eq('id', id)
        .eq('rev', expectedRev)
        .select('rev')
      check(error)
      return rows && rows.length > 0 ? expectedRev + 1 : null
    },
    async deleteTrip(id) {
      check((await sb.from('trips').delete().eq('id', id)).error)
    },
    subscribe(onEvent) {
      const channel = sb
        .channel('trips-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, (payload) => {
          const event: RemoteEvent | null =
            payload.eventType === 'DELETE'
              ? { type: 'delete', id: (payload.old as { id: string }).id }
              : payload.new && 'data' in payload.new
                ? { type: 'upsert', row: toRow(payload.new as TripRecord) }
                : null
          if (event) onEvent(event)
        })
        .subscribe()
      return () => void sb.removeChannel(channel)
    },

    async listCollaborators(tripId) {
      const { data, error } = await sb.from('trip_members').select('user_id, email, role').eq('trip_id', tripId)
      check(error)
      return ((data ?? []) as { user_id: string; email: string; role: Collaborator['role'] }[]).map((m) => ({
        userId: m.user_id,
        email: m.email,
        role: m.role,
      }))
    },
    async removeCollaborator(tripId, userId) {
      check((await sb.from('trip_members').delete().eq('trip_id', tripId).eq('user_id', userId)).error)
    },
    async listInviteLinks(tripId) {
      const { data, error } = await sb
        .from('trip_invite_links')
        .select('token, expires_at')
        .eq('trip_id', tripId)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at')
      check(error)
      return ((data ?? []) as { token: string; expires_at: string }[]).map((l): InviteLink => ({ token: l.token, expiresAt: l.expires_at }))
    },
    async createInviteLink(tripId, days) {
      const { data, error } = await sb
        .from('trip_invite_links')
        .insert({ trip_id: tripId, expires_at: new Date(Date.now() + days * 86_400_000).toISOString() })
        .select('token, expires_at')
        .single()
      check(error)
      const row = data as { token: string; expires_at: string }
      return { token: row.token, expiresAt: row.expires_at }
    },
    async revokeInviteLink(token) {
      check((await sb.from('trip_invite_links').delete().eq('token', token)).error)
    },
    async joinWithLink(token) {
      const { data, error } = await sb.rpc('join_trip', { link_token: token })
      check(error)
      return typeof data === 'string' ? data : null
    },
  }

  return { remote, auth }
}
