import type { Cloud } from '../cloud/useCloud.ts'

export function SyncBadge({ cloud }: { cloud: Cloud }) {
  if (cloud.status === 'syncing') return <small className="muted">Syncing…</small>
  if (cloud.status === 'synced') return <small className="muted">✓ Synced</small>
  if (cloud.status === 'offline') return <small className="warn" title={cloud.error}>Offline · will sync later</small>
  return null
}

export function AccountBar({ cloud }: { cloud: Cloud }) {
  if (!cloud.configured || !cloud.ready) return null

  const signIn = () => cloud.signIn().catch((e: unknown) => alert(e instanceof Error ? e.message : 'Could not start sign-in.'))

  if (!cloud.user) {
    return (
      <div className="panel account">
        <div>
          <strong>☁️ Plan together</strong>
          <small className="muted">Sign in with Google to share trips with friends and keep them in sync on all your devices.</small>
        </div>
        <button className="primary" onClick={signIn}>Sign in with Google</button>
      </div>
    )
  }

  return (
    <div className="account-chip">
      <span>☁️ {cloud.user.email}</span>
      <SyncBadge cloud={cloud} />
      <button className="link" onClick={() => void cloud.signOut()}>Sign out</button>
    </div>
  )
}

interface BannerProps {
  cloud: Cloud
  tripName?: string
  onOpen: (tripId: string) => void
}

// Shown after opening an invite link
export function InviteBanner({ cloud, tripName, onOpen }: BannerProps) {
  const invite = cloud.invite
  if (!invite) return null

  const dismiss = <button className="link" onClick={cloud.dismissInvite}>Dismiss</button>

  if (invite.state === 'needsSignIn') {
    return (
      <div className="panel account">
        <div>
          <strong>You've been invited to a trip</strong>
          <small className="muted">Sign in with Google to join and start planning together.</small>
        </div>
        <button className="primary" onClick={() => void cloud.signIn()}>Sign in to join</button>
      </div>
    )
  }
  if (invite.state === 'joining') return <div className="panel"><small className="muted">Joining trip…</small></div>
  if (invite.state === 'joined') {
    return (
      <div className="panel account">
        <div>
          <strong>You joined {tripName ? `“${tripName}”` : 'the trip'} 🎉</strong>
          <small className="muted">It's now in your trips and stays in sync with everyone.</small>
        </div>
        <div className="row">
          <button className="primary" onClick={() => { onOpen(invite.tripId); cloud.dismissInvite() }}>Open trip</button>
          {dismiss}
        </div>
      </div>
    )
  }
  return (
    <div className="panel account">
      <div>
        <strong>{invite.state === 'invalid' ? 'That invite link has expired or was revoked' : 'Could not join the trip'}</strong>
        <small className="muted">
          {invite.state === 'invalid' ? 'Ask the trip owner for a new link.' : invite.message}
        </small>
      </div>
      {dismiss}
    </div>
  )
}
