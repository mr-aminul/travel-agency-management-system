import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  HeartPulse,
  Megaphone,
  Package,
  Shield,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { PLATFORM_ADMIN_EMAIL } from '@/lib/authApi'
import { DEFAULT_STARTER_MODULES } from '@/lib/tenantsStore'
import { MODULE_CATALOG } from '@/lib/modules'
import { cx } from '@/lib/cx'
import { Badge, PageHeader } from '@/components/ui'
import '@/styles/layout-admin.css'

type SectionId =
  | 'admins'
  | 'defaults'
  | 'announcements'
  | 'ops'
  | 'danger'

const SECTIONS: {
  id: SectionId
  label: string
  icon: typeof Shield
}[] = [
  { id: 'admins', label: 'Admins', icon: Shield },
  { id: 'defaults', label: 'Defaults', icon: Package },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'ops', label: 'Ops', icon: HeartPulse },
  { id: 'danger', label: 'Danger zone', icon: AlertTriangle },
]

function isSectionId(value: string | null): value is SectionId {
  return (
    value === 'admins' ||
    value === 'defaults' ||
    value === 'announcements' ||
    value === 'ops' ||
    value === 'danger'
  )
}

export default function AdminPlatformPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const sectionParam = searchParams.get('section')
  const section: SectionId = isSectionId(sectionParam) ? sectionParam : 'admins'

  if (user?.role !== 'platform_admin') return null

  const defaultLabels = DEFAULT_STARTER_MODULES.map((id) => {
    const item = MODULE_CATALOG.find((row) => row.id === id)
    return item?.label ?? id
  })

  return (
    <div className="pd-page pd-admin" aria-label="Platform">
      <PageHeader
        title="Platform"
        description="Inventivelab operators, product defaults, and ops tools."
      />

      <div className="pd-admin__workspace">
        <nav className="pd-admin__rail" aria-label="Platform sections">
          {SECTIONS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className={cx(
                  'pd-admin__rail-link',
                  'pd-admin__rail-link--button',
                  section === item.id && 'is-active',
                )}
                onClick={() =>
                  setSearchParams(
                    item.id === 'admins' ? {} : { section: item.id },
                    { replace: true },
                  )
                }
              >
                <Icon size={16} strokeWidth={2} aria-hidden />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="pd-admin__workspace-main">
          {section === 'admins' ? (
            <section className="pd-admin__panel" aria-label="Platform admins">
              <header className="pd-admin__panel-header">
                <div>
                  <h2 className="pd-admin__panel-title">Platform admins</h2>
                  <p className="pd-admin__panel-desc">
                    Operators who can manage every agency. Bootstrap account is
                    seeded from the server environment.
                  </p>
                </div>
              </header>
              <div className="pd-admin__user">
                <Badge variant="completed">Active</Badge>
                <div>
                  <p className="pd-admin__user-name">{user.name}</p>
                  <p className="pd-admin__quiet">{user.email}</p>
                  {user.email === PLATFORM_ADMIN_EMAIL ? (
                    <p className="pd-admin__quiet">Bootstrap seed admin</p>
                  ) : null}
                </div>
              </div>
              <p className="pd-admin__quiet">
                Inviting additional platform admins will land in a later
                release. For now, share the seed credentials only with trusted
                operators.
              </p>
            </section>
          ) : null}

          {section === 'defaults' ? (
            <section className="pd-admin__panel" aria-label="Defaults">
              <header className="pd-admin__panel-header">
                <div>
                  <h2 className="pd-admin__panel-title">Default module pack</h2>
                  <p className="pd-admin__panel-desc">
                    New agencies start with every product switch off. You turn
                    on what each agency needs on their Product tab.
                  </p>
                </div>
              </header>
              {defaultLabels.length === 0 ? (
                <p className="pd-admin__quiet">Nothing enabled by default.</p>
              ) : (
                <ul className="pd-admin__chip-list">
                  {defaultLabels.map((label) => (
                    <li key={label}>
                      <Badge variant="pending">{label}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {section === 'announcements' ? (
            <section className="pd-admin__panel" aria-label="Announcements">
              <header className="pd-admin__panel-header">
                <div>
                  <h2 className="pd-admin__panel-title">Announcements</h2>
                  <p className="pd-admin__panel-desc">
                    Broadcast a banner or message to all agencies or a selected
                    set.
                  </p>
                </div>
              </header>
              <p className="pd-admin__quiet">
                Announcement composer ships in a follow-up. Use Support Mode or
                agency Help for urgent customer communication today.
              </p>
            </section>
          ) : null}

          {section === 'ops' ? (
            <section className="pd-admin__panel" aria-label="Ops">
              <header className="pd-admin__panel-header">
                <div>
                  <h2 className="pd-admin__panel-title">Ops health</h2>
                  <p className="pd-admin__panel-desc">
                    API and deploy status for the inventivelab VPS.
                  </p>
                </div>
              </header>
              <dl className="pd-admin__dl">
                <div>
                  <dt>UI</dt>
                  <dd>onetrack.inventivelab.bd</dd>
                </div>
                <div>
                  <dt>API</dt>
                  <dd>api.onetrack.inventivelab.bd</dd>
                </div>
                <div>
                  <dt>Health</dt>
                  <dd>
                    <a
                      href="https://api.onetrack.inventivelab.bd/api/platform/health"
                      target="_blank"
                      rel="noreferrer"
                    >
                      /api/platform/health
                    </a>
                  </dd>
                </div>
              </dl>
            </section>
          ) : null}

          {section === 'danger' ? (
            <section className="pd-admin__panel" aria-label="Danger zone">
              <header className="pd-admin__panel-header">
                <div>
                  <h2 className="pd-admin__panel-title">Danger zone</h2>
                  <p className="pd-admin__panel-desc">
                    Destructive exports and key deletes stay API-only until a
                    confirm-heavy UI ships.
                  </p>
                </div>
              </header>
              <p className="pd-admin__quiet">
                Use ops tooling for <code>GET /api/platform/admin/kv-dump</code>{' '}
                — never expose a raw dump in casual UI.
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
