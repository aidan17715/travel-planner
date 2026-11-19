import type { Trip } from '../types.ts'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline'

// A trip as stored in the cloud. `data` never contains the local-only `cloud` marker.
export interface RemoteTripRow {
  id: string
  ownerId: string
  data: Trip
  rev: number
}

export type RemoteEvent = { type: 'upsert'; row: RemoteTripRow } | { type: 'delete'; id: string }

export interface Collaborator {
  userId: string
  email: string
  role: 'owner' | 'editor'
}

export interface InviteLink {
  token: string
  expiresAt: string
}

export interface Remote {
  fetchTrips(): Promise<RemoteTripRow[]>
  fetchTrip(id: string): Promise<RemoteTripRow | null>
  insertTrip(id: string, data: Trip): Promise<void>
  // Resolves to the new revision, or null if someone else changed the trip first
  updateTrip(id: string, data: Trip, expectedRev: number): Promise<number | null>
  deleteTrip(id: string): Promise<void>
  subscribe(onEvent: (e: RemoteEvent) => void): () => void

  listCollaborators(tripId: string): Promise<Collaborator[]>
  removeCollaborator(tripId: string, userId: string): Promise<void>
  listInviteLinks(tripId: string): Promise<InviteLink[]>
  createInviteLink(tripId: string, days: number): Promise<InviteLink>
  revokeInviteLink(token: string): Promise<void>
  // Joins the trip the link belongs to; resolves to its id, or null if the link is invalid or expired
  joinWithLink(token: string): Promise<string | null>
}

export interface AuthUser {
  id: string
  email: string
}

export interface Auth {
  getUser(): Promise<AuthUser | null>
  onChange(cb: (user: AuthUser | null) => void): () => void
  signIn(): Promise<void>
  signOut(): Promise<void>
}

export interface Store {
  get(): Trip[]
  update(fn: (trips: Trip[]) => Trip[]): void
}
