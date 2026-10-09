import { useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Building2, Handshake, Shield } from 'lucide-react'
import { layoutConfig } from '@/config/layout'
import { useAuth } from '@/lib/auth'
import {
  postLoginPath,
  type AuthWorkspace,
} from '@/lib/authWorkspaces'
import { publicUrl } from '@/lib/publicUrl'
import '@/styles/layout-login.css'
import '@/styles/layout-workspace.css'

function iconFor(workspace: AuthWorkspace) {
  if (workspace.kind === 'platform_admin') return Shield
  if (workspace.kind === 'sub_agent') return Handshake
  return Building2
}

function toneFor(workspace: AuthWorkspace) {
  if (workspace.kind === 'platform_admin') return 'admin'
  if (workspace.kind === 'sub_agent') return 'sub-agent'
  return 'agency'
}

export default function ChooseWorkspacePage() {
  const navigate = useNavigate()
  const { status, session, selectWorkspace, signOut } = useAuth()

  const workspaces = useMemo(
    () => session?.workspaces ?? [],
    [session?.workspaces],
  )

  if (status !== 'authenticated' || !session) {
    return <Navigate to="/login" replace />
  }

  if (!session.workspacePending) {
    return <Navigate to={postLoginPath(session)} replace />
  }

  if (workspaces.length === 0) {
    return <Navigate to="/login" replace />
  }

  const choose = async (workspaceId: string) => {
    const next = await selectWorkspace(workspaceId)
    navigate(postLoginPath(next), { replace: true })
  }

  return (
    <div className="pd-login pd-workspace-pick">
      <img
        src={publicUrl('images/logo.svg')}
        alt={layoutConfig.brand.name}
        className="pd-login__corner-logo"
        width={86}
        height={44}
        decoding="async"
      />

      <div className="pd-workspace-pick__card" role="dialog" aria-labelledby="workspace-pick-title">
        <header className="pd-workspace-pick__header">
          <h1 id="workspace-pick-title" className="pd-workspace-pick__title">
            How would you like to continue?
          </h1>
          <p className="pd-workspace-pick__subtitle">
            This login has more than one workspace. Choose one for this session.
          </p>
        </header>

        <div className="pd-workspace-pick__options" role="list">
          {workspaces.map((workspace) => {
            const Icon = iconFor(workspace)
            return (
              <button
                key={workspace.id}
                type="button"
                role="listitem"
                className={`pd-workspace-pick__option pd-workspace-pick__option--${toneFor(workspace)}`}
                onClick={() => void choose(workspace.id)}
              >
                <span className="pd-workspace-pick__icon" aria-hidden>
                  <Icon size={22} strokeWidth={2} />
                </span>
                <span className="pd-workspace-pick__copy">
                  <span className="pd-workspace-pick__option-title">
                    {workspace.title}
                  </span>
                  <span className="pd-workspace-pick__option-desc">
                    {workspace.description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <p className="pd-workspace-pick__footer">
          Signed in as {session.user.email}.{' '}
          <button
            type="button"
            className="pd-login__text-link"
            onClick={() => void signOut().then(() => navigate('/login', { replace: true }))}
          >
            Use a different account
          </button>
        </p>
      </div>
    </div>
  )
}
