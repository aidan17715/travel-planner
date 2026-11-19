import { normalize } from '../storage.ts'
import type { Trip } from '../types.ts'
import { deepEqual, merge3 } from './merge.ts'
import type { Remote, RemoteEvent, RemoteTripRow, Store, SyncStatus } from './types.ts'

// What the cloud held when we last synced a trip: its revision and contents. It is the common
// ancestor for the three-way merge when someone else edits at the same time.
export interface SyncRecord {
  rev: number
  base: Trip
}

export type SyncRecords = Record<string, SyncRecord>

interface Options {
  remote: Remote
  store: Store
  userId: string
  records: SyncRecords
  saveRecords: () => void
  onStatus?: (status: SyncStatus, error?: string) => void
}

const forCloud = (t: Trip): Trip => {
  const { cloud: _cloud, ...rest } = t
  return rest
}

// Keeps shared trips in step with the cloud. Every operation runs one at a time, so a pull and a
// push can never interleave.
export class SyncEngine {
  private chain: Promise<unknown> = Promise.resolve()
  private pending = 0
  private lastError: string | undefined
  private unsubscribe: (() => void) | undefined
  private o: Options

  constructor(options: Options) {
    this.o = options
  }

  start() {
    this.unsubscribe = this.o.remote.subscribe((e) => void this.enqueue(() => this.onEvent(e)))
  }

  stop() {
    this.unsubscribe?.()
    this.unsubscribe = undefined
  }

  sync() {
    return this.enqueue(async () => {
      await this.pull()
      await this.push()
    })
  }

  // Sends local edits of shared trips to the cloud
  pushChanges() {
    return this.enqueue(() => this.push())
  }

  // Uploads a local trip so invited people can open it
  share(tripId: string) {
    return this.enqueue(async () => {
      const trip = this.o.store.get().find((t) => t.id === tripId)
      if (!trip) return
      const data = forCloud(trip)
      await this.o.remote.insertTrip(tripId, data)
      this.setRecord(tripId, { rev: 1, base: data })
      this.mark(tripId, this.o.userId)
    }, true)
  }

  // Owner: removes the cloud copy (everyone loses access); everyone keeps a local copy
  stopSharing(tripId: string) {
    return this.enqueue(async () => {
      await this.o.remote.deleteTrip(tripId)
      this.unmark([tripId])
    }, true)
  }

  // Collaborator: leaves the trip but keeps a local copy
  leave(tripId: string) {
    return this.enqueue(async () => {
      await this.o.remote.removeCollaborator(tripId, this.o.userId)
      this.unmark([tripId])
    }, true)
  }

  // Joins through an invite link, then downloads the trip
  join(token: string) {
    return this.enqueue(async () => {
      const id = await this.o.remote.joinWithLink(token)
      if (!id) return null
      await this.pull()
      return id
    }, true)
  }

  // Forgets all cloud state on this device (used when signing out); trips stay as local copies
  detachAll() {
    return this.enqueue(async () => {
      this.unmark(this.o.store.get().filter((t) => t.cloud).map((t) => t.id))
    })
  }

  private enqueue<T>(fn: () => Promise<T>, rethrow = false): Promise<T | undefined> {
    this.pending++
    this.o.onStatus?.('syncing')
    const run = this.chain.then(fn)
    this.chain = run.catch(() => undefined)
    return run.then(
      (value) => {
        this.finish(undefined)
        return value
      },
      (error: unknown) => {
        this.finish(error instanceof Error ? error.message : String(error))
        if (rethrow) throw error
        return undefined
      },
    )
  }

  private finish(error: string | undefined) {
    this.pending--
    this.lastError = error
    if (this.pending === 0) this.o.onStatus?.(this.lastError ? 'offline' : 'synced', this.lastError)
  }

  private setRecord(id: string, rec: SyncRecord) {
    this.o.records[id] = rec
    this.o.saveRecords()
  }

  private mark(id: string, ownerId: string) {
    this.o.store.update((trips) => trips.map((t) => (t.id === id ? { ...t, cloud: { ownerId } } : t)))
  }

  private unmark(ids: string[]) {
    if (ids.length === 0) return
    for (const id of ids) delete this.o.records[id]
    this.o.saveRecords()
    this.o.store.update((trips) => trips.map((t) => (ids.includes(t.id) ? { ...t, cloud: undefined } : t)))
  }

  private async onEvent(e: RemoteEvent) {
    if (e.type === 'upsert') this.applyRemote(e.row)
    else this.unmark([e.id])
  }

  private async pull() {
    const rows = await this.o.remote.fetchTrips()
    const ids = new Set(rows.map((r) => r.id))
    for (const row of rows) this.applyRemote(row)
    // Shared trips that are gone from the cloud: the owner stopped sharing or removed us
    this.unmark(this.o.store.get().filter((t) => t.cloud && !ids.has(t.id)).map((t) => t.id))
  }

  // Merges a cloud version into the local trip (adding it if it's new to this device)
  private applyRemote(row: RemoteTripRow) {
    const rec = this.o.records[row.id]
    if (rec && row.rev <= rec.rev) return
    const remote = forCloud(normalize(row.data))
    const base = rec?.base ?? ({} as Trip)
    const cloud = { ownerId: row.ownerId }

    this.o.store.update((trips) => {
      const local = trips.find((t) => t.id === row.id)
      if (!local) return [...trips, { ...remote, cloud }]
      // With no sync history (e.g. a stale local copy of the same trip) the cloud version wins conflicts
      const result = rec ? merge3(base, forCloud(local), remote) : merge3(base, remote, forCloud(local))
      const merged = normalize(result as Partial<Trip>)
      return trips.map((t) => (t.id === row.id ? { ...merged, cloud } : t))
    })
    this.setRecord(row.id, { rev: row.rev, base: remote })
  }

  private async push() {
    for (let attempt = 0; attempt < 3; attempt++) {
      let conflict = false
      for (const trip of this.o.store.get()) {
        const rec = trip.cloud ? this.o.records[trip.id] : undefined
        if (!rec) continue
        const data = forCloud(trip)
        if (deepEqual(data, rec.base)) continue

        const rev = await this.o.remote.updateTrip(trip.id, data, rec.rev)
        if (rev !== null) {
          this.setRecord(trip.id, { rev, base: data })
          continue
        }
        // Someone else saved first: merge their version in, then push again
        const row = await this.o.remote.fetchTrip(trip.id)
        if (row) this.applyRemote(row)
        else this.unmark([trip.id])
        conflict = true
      }
      if (!conflict) return
    }
  }
}
