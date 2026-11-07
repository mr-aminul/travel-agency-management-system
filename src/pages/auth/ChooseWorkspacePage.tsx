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
import { cn } from '@/lib/utils'
import {
  authCornerLogoClass,
  authPageBackgroundStyle,
  authShellClass,
  authTextLinkClass,
} from './authShell'

function iconFor(workspace: AuthWorkspace) {
  if (workspace.kind === 'platform_admin') return Shield
  if (workspace.kind === 'sub_agent') return Handshake
  return Building2
}

function toneClasses(workspace: AuthWorkspace) {
  if (workspace.kind === 'platform_admin') {
    return 'text-[#be123c] bg-[#ffe4e6]'
  }
  if (workspace.kind === 'sub_agent') {
    return 'text-[#b45309] bg-[#ffedd5]'
  }
  return 'text-[#0f766e] bg-[#d1fae5]'
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
    <div className={authShellClass} style={authPageBackgroundStyle}>
      <img
        src={publicUrl('images/logo.svg')}
        alt={layoutConfig.brand.name}
        className={authCornerLogoClass}
        width={86}
        height={44}
        decoding="async"
      />

      <div
        className="relative z-[1] my-auto w-full max-w-[28rem] rounded-[1.25rem] border border-[color-mix(in_srgb,#e5e7eb_80%,transparent)] bg-white px-6 pb-5 pt-7 shadow-[0_1px_2px_rgb(15_23_42/6%),0_18px_40px_rgb(15_23_42/10%)] max-md:rounded-2xl max-md:px-4 max-md:pb-4 max-md:pt-5"
        role="dialog"
        aria-labelledby="workspace-pick-title"
      >
        <header className="mb-[1.15rem] border-b border-[#e5e7eb] pb-[1.15rem]">
          <h1
            id="workspace-pick-title"
            className="m-0 text-xl leading-snug font-bold text-[#0f172a]"
          >
            Choose a workspace
          </h1>
        </header>

        <div className="grid gap-3" role="list">
          {workspaces.map((workspace) => {
            const Icon = iconFor(workspace)
            return (
              <button
                key={workspace.id}
                type="button"
                role="listitem"
                className="flex w-full cursor-pointer items-start gap-[0.9rem] rounded-[0.9rem] border border-[#e5e7eb] bg-[color-mix(in_srgb,white_88%,#f8fafc)] px-4 py-[0.95rem] text-left transition-[border-color,box-shadow,transform] duration-150 ease-out hover:-translate-y-px hover:border-[color-mix(in_srgb,#0f766e_45%,#e5e7eb)] hover:shadow-[0_6px_18px_rgb(15_23_42/6%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f766e] max-md:px-[0.875rem] max-md:py-[0.85rem] max-md:hover:translate-y-0"
                onClick={() => void choose(workspace.id)}
              >
                <span
                  className={cn(
                    'grid size-11 shrink-0 place-items-center rounded-xl',
                    toneClasses(workspace),
                  )}
                  aria-hidden
                >
                  <Icon size={22} strokeWidth={2} />
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <span className="text-[0.9875rem] font-semibold text-[#0f172a]">
                    {workspace.title}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <p className="mt-[1.15rem] mb-0 text-center text-[0.8125rem] text-[#64748b]">
          Signed in as {session.user.email}.{' '}
          <button
            type="button"
            className={authTextLinkClass}
            onClick={() =>
              void signOut().then(() => navigate('/login', { replace: true }))
            }
          >
            Use a different account
          </button>
        </p>
      </div>
    </div>
  )
}
