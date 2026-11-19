import { useEffect, useState } from 'react'
import type { Cloud } from '../cloud/useCloud.ts'
import type { Collaborator, InviteLink } from '../cloud/types.ts'
import type { Trip } from '../types.ts'
import { SyncBadge } from './Account.tsx'

interface Props {
  trip: Trip
  cloud: Cloud
  onClose: () => void
}

const inviteUrl = (token: string) => `${window.location.origin}${import.meta.env.BASE_URL}?join=${token}`

const fmtExpiry = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export function ShareDialog({ trip, cloud, onClose }: Props) {
  const [people, setPeople] = useState<Collaborator[]>([])
  const [links, setLinks] = useState<InviteLink[]>([])
  const [days, setDays] = useState(7)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [copied, setCopied] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const { remote, engine, user } = cloud
  const shared = !!trip.cloud
  const isOwner = !!user && trip.cloud?.ownerId === user.id

  const refresh = () => setVersion((v) => v + 1)

  useEffect(() => {
    if (!remote || !shared) return
    let cancelled = false
    void (async () => {
      try {
        const p = await remote.listCollaborators(trip.id)
        const l = isOwner ? await remote.listInviteLinks(trip.id) : []
        if (!cancelled) {
          setPeople(p)
          setLinks(l)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [remote, shared, isOwner, trip.id, version])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError(undefined)
    try {
      await action()
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const copy = async (token: string) => {
    const url = inviteUrl(token)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(token)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      prompt('Copy this invite link:', url)
    }
  }

  const share = async (token: string) => {
    const url = inviteUrl(token)
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join my trip: ${trip.name}`, text: `Join my trip “${trip.name}” on Travel Planner`, url })
      } catch {
        // Cancelled by the user
      }
    } else {
      await copy(token)
    }
  }

  const stopSharing = () => {
    if (!confirm(`Stop sharing “${trip.name}”? Everyone loses access to the shared copy. Each person keeps a copy on their own device.`)) return
    void run(async () => {
      await engine?.stopSharing(trip.id)
      onClose()
    })
  }

  const leave = () => {
    if (!confirm(`Leave “${trip.name}”? You'll keep a copy on this device but it will stop syncing.`)) return
    void run(async () => {
      await engine?.leave(trip.id)
      onClose()
    })
  }

  const remove = (p: Collaborator) => {
    if (!confirm(`Remove ${p.email || 'this person'} from the trip?`)) return
    void run(() => remote!.removeCollaborator(trip.id, p.userId))
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Share trip">
      <div className="dialog">
        <div className="overlay-head">
          <div>
            <h2>Share “{trip.name}”</h2>
            {shared && <SyncBadge cloud={cloud} />}
          </div>
          <button className="primary" onClick={onClose}>Close</button>
        </div>

        {!user && (
          <div className="panel">
            <p>Sign in with Google to share this trip. Only people you invite can see or edit it.</p>
            <button className="primary" onClick={() => void cloud.signIn()}>Sign in with Google</button>
          </div>
        )}

        {user && !shared && (
          <div className="panel">
            <p>
              Sharing saves this trip online so people you invite can view and edit it with you. Changes appear on everyone's
              devices. Nobody else can open it unless you send them an invite link.
            </p>
            <button className="primary" disabled={!engine || busy} onClick={() => void run(() => engine!.share(trip.id))}>
              {busy ? 'Turning on…' : 'Turn on sharing'}
            </button>
          </div>
        )}

        {user && shared && (
          <>
            <div className="panel">
              <h3 className="panel-title">People with access</h3>
              <ul className="list">
                {people.map((p) => (
                  <li key={p.userId}>
                    <div>
                      <strong>{p.email || 'Unknown'}{p.userId === user.id ? ' (you)' : ''}</strong>
                      <small>{p.role === 'owner' ? 'Owner' : 'Can edit'}</small>
                    </div>
                    {isOwner && p.role !== 'owner' && (
                      <button className="icon" aria-label={`Remove ${p.email}`} onClick={() => remove(p)}>✕</button>
                    )}
                  </li>
                ))}
                {people.length === 0 && <li><small className="muted">Loading…</small></li>}
              </ul>
            </div>

            {isOwner && (
              <div className="panel">
                <h3 className="panel-title">Invite people</h3>
                <p className="muted">
                  Create a link and send it to the people you want to plan with. They open it, sign in with Google and can then edit
                  this trip. Anyone with the link can join until it expires, so only share it with people you trust. You can revoke a
                  link at any time.
                </p>
                <div className="row">
                  <label>
                    Link works for
                    <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
                      <option value={1}>1 day</option>
                      <option value={7}>7 days</option>
                      <option value={30}>30 days</option>
                    </select>
                  </label>
                  <button
                    className="primary create-link"
                    disabled={busy}
                    onClick={() => void run(() => remote!.createInviteLink(trip.id, days))}
                  >
                    Create invite link
                  </button>
                </div>

                {links.length > 0 && (
                  <ul className="list">
                    {links.map((l) => (
                      <li key={l.token} className="stack">
                        <input readOnly value={inviteUrl(l.token)} aria-label="Invite link" onFocus={(e) => e.target.select()} />
                        <div className="line-split">
                          <small>Expires {fmtExpiry(l.expiresAt)}</small>
                          <span className="item-actions">
                            <button className="link" onClick={() => void copy(l.token)}>{copied === l.token ? 'Copied ✓' : 'Copy'}</button>
                            <button className="link" onClick={() => void share(l.token)}>Share…</button>
                            <button className="link danger-text" onClick={() => void run(() => remote!.revokeInviteLink(l.token))}>Revoke</button>
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="panel">
              {isOwner ? (
                <button className="danger" disabled={busy} onClick={stopSharing}>Stop sharing this trip</button>
              ) : (
                <button className="danger" disabled={busy} onClick={leave}>Leave this trip</button>
              )}
            </div>
          </>
        )}

        {error && <p className="warn">{error}</p>}
      </div>
    </div>
  )
}
