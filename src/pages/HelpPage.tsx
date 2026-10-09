import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  ClipboardList,
  FileText,
  Handshake,
  Kanban,
  Keyboard,
  LayoutDashboard,
  Link2,
  Search,
  Settings,
  Trash2,
  UserRoundSearch,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { Accordion, Button, PageHeader } from '@/components/ui'
import { useGlobalSearch } from '@/layout/GlobalSearchProvider'
import { isPathAllowed } from '@/lib/modules'
import type { ModuleId, UserRole } from '@/types/tenant'
import { settingsSectionPath } from '@/lib/workPaths'
import { useActiveTenant } from '@/lib/useActiveTenant'
import { useAuth } from '@/lib/useAuth'
import '@/styles/layout-help.css'

type FlowStep = {
  id: string
  label: string
  hint: string
  to: string
  icon: LucideIcon
}

type Guide = {
  id: string
  title: string
  body: string
  icon: LucideIcon
  links: Array<{ label: string; to: string }>
}

type MapTile = {
  path: string
  label: string
  description: string
  icon: LucideIcon
}

const TOC = [
  { id: 'workflow', label: 'Workflow' },
  { id: 'guides', label: 'Guides' },
  { id: 'search', label: 'Search' },
  { id: 'map', label: 'Workspace' },
  { id: 'faq', label: 'FAQ' },
] as const

const FLOW_STEPS: FlowStep[] = [
  {
    id: 'client',
    label: 'Register client',
    hint: 'Identity, passport, referral',
    to: '/clients?new=1',
    icon: Users,
  },
  {
    id: 'service',
    label: 'Open a service',
    hint: 'Visa, ticket, package…',
    to: '/services?new=1',
    icon: ClipboardList,
  },
  {
    id: 'board',
    label: 'Move the file',
    hint: 'Board + checklist steps',
    to: '/service-board',
    icon: Kanban,
  },
  {
    id: 'pay',
    label: 'Collect payment',
    hint: 'Balances & invoices',
    to: '/payments',
    icon: Wallet,
  },
  {
    id: 'share',
    label: 'Share status',
    hint: 'Public passport tracking',
    to: '/track',
    icon: UserRoundSearch,
  },
]

const GUIDES: Guide[] = [
  {
    id: 'clients',
    title: 'Clients & profiles',
    body: 'A client is the person or organization. Add passport details, custom fields from Settings, and attach a sub agent when they referred the booking.',
    icon: Users,
    links: [
      { label: 'Clients', to: '/clients' },
      { label: 'New client', to: '/clients?new=1' },
      { label: 'Client fields', to: settingsSectionPath('clientFields') },
    ],
  },
  {
    id: 'services',
    title: 'Services & Service Board',
    body: 'A service file is the work: tourist visa, air ticket, tour package, and more. The Service Board shows who is ready for which checklist step.',
    icon: Kanban,
    links: [
      { label: 'Services', to: '/services' },
      { label: 'Service Board', to: '/service-board' },
      { label: 'Service catalog', to: settingsSectionPath('services') },
    ],
  },
  {
    id: 'money',
    title: 'Payments & reports',
    body: 'Record collections against a client or service, share invoices with a link, and use Reports for date-ranged collections and outstanding balances.',
    icon: Wallet,
    links: [
      { label: 'Payments', to: '/payments' },
      { label: 'Reports', to: '/reports' },
    ],
  },
  {
    id: 'partners',
    title: 'Sub agents & intake',
    body: 'Track referring agencies and commissions. Give partners a login (invite or set password) so they can manage their referrals; public join links still work without signing in. Approvals appear when Settings → Sub-agent access requires review.',
    icon: Handshake,
    links: [
      { label: 'Sub Agents', to: '/sub-agents' },
      { label: 'Public tracking', to: '/track' },
    ],
  },
  {
    id: 'docs-hr',
    title: 'Documents & HR',
    body: 'Print embassy lists, put-up sheets, and notes from Documents. HR covers employees, attendance & leave, and payroll when that module is on.',
    icon: FileText,
    links: [
      { label: 'Documents', to: '/documents' },
      { label: 'Employees', to: '/hr/employees' },
      { label: 'Attendance', to: '/hr/attendance' },
    ],
  },
  {
    id: 'admin',
    title: 'Settings, access & trash',
    body: 'Tune business profile, appearance, and who can view or edit each page. Soft-deleted clients land in Trash until restored or purged.',
    icon: Settings,
    links: [
      { label: 'Settings', to: '/settings' },
      { label: 'User access', to: settingsSectionPath('userAccess') },
      { label: 'Trash', to: '/trash' },
    ],
  },
]

const MAP_TILES: MapTile[] = [
  {
    path: '/',
    label: 'Home',
    description: 'Search + quick links',
    icon: Search,
  },
  {
    path: '/dashboard',
    label: 'Dashboard',
    description: 'Cash & pipeline health',
    icon: LayoutDashboard,
  },
  {
    path: '/clients',
    label: 'Clients',
    description: 'People & passports',
    icon: Users,
  },
  {
    path: '/services',
    label: 'Services',
    description: 'Open service files',
    icon: ClipboardList,
  },
  {
    path: '/service-board',
    label: 'Service Board',
    description: 'Who is ready next',
    icon: Kanban,
  },
  {
    path: '/payments',
    label: 'Payments',
    description: 'Collections & balances',
    icon: Wallet,
  },
  {
    path: '/reports',
    label: 'Reports',
    description: 'Collections overview',
    icon: FileText,
  },
  {
    path: '/documents',
    label: 'Documents',
    description: 'Print templates',
    icon: FileText,
  },
  {
    path: '/sub-agents',
    label: 'Sub Agents',
    description: 'Referring partners',
    icon: Handshake,
  },
  {
    path: '/hr/employees',
    label: 'HR',
    description: 'Staff & payroll',
    icon: UsersRound,
  },
  {
    path: '/track',
    label: 'Track',
    description: 'Public passport lookup',
    icon: UserRoundSearch,
  },
  {
    path: '/trash',
    label: 'Trash',
    description: 'Restore deleted clients',
    icon: Trash2,
  },
]

const SEARCH_PREFIXES = [
  { code: '@ or client:', scope: 'Clients' },
  { code: 's: or file:', scope: 'Service files' },
  { code: 'agent:', scope: 'Sub agents' },
  { code: 'hr: or emp:', scope: 'Employees' },
  { code: '# or page:', scope: 'Pages' },
  { code: '> or action:', scope: 'Quick actions' },
] as const

function pathAllowed(
  path: string,
  modules: readonly ModuleId[],
  role: UserRole,
) {
  const pathname = path.split('?')[0] ?? path
  return isPathAllowed(pathname, modules, role)
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="pd-help-kbd">{children}</kbd>
}

export default function HelpPage() {
  const { user } = useAuth()
  const tenant = useActiveTenant()
  const { openSearch } = useGlobalSearch()
  const [modKey] = useState(() =>
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)
      ? '⌘'
      : 'Ctrl',
  )

  const role = user?.role ?? 'agency_user'
  const modules = tenant.enabledModules

  const flowSteps = useMemo(
    () => FLOW_STEPS.filter((step) => pathAllowed(step.to, modules, role)),
    [modules, role],
  )

  const guides = useMemo(
    () =>
      GUIDES.map((guide) => ({
        ...guide,
        links: guide.links.filter((link) => pathAllowed(link.to, modules, role)),
      })).filter((guide) => guide.links.length > 0),
    [modules, role],
  )

  const mapTiles = useMemo(
    () => MAP_TILES.filter((tile) => pathAllowed(tile.path, modules, role)),
    [modules, role],
  )

  const faqItems = useMemo(
    () => [
      {
        id: 'client-vs-service',
        title: 'What is the difference between a client and a service?',
        content: (
          <>
            <p>
              A <strong>client</strong> is the person (passport, contact, referral).
              A <strong>service</strong> is the file of work for them — for example a
              tourist visa or air ticket. One client can have many services.
            </p>
          </>
        ),
      },
      {
        id: 'tracking',
        title: 'How do clients check status without logging in?',
        content: (
          <>
            <p>
              Share the public{' '}
              <Link to="/track">Track</Link> page. Recipients only need the passport
              number — no staff account is required.
            </p>
          </>
        ),
      },
      {
        id: 'checklist',
        title: 'Where do checklist steps come from?',
        content: (
          <>
            <p>
              Each product line has a journey in{' '}
              <Link to={settingsSectionPath('services')}>
                Settings → Service catalog
              </Link>
              . New service files pick up that checklist; you can also set
              country-specific journeys when a destination needs different
              documents.
            </p>
          </>
        ),
      },
      {
        id: 'access',
        title: 'Why can some teammates not open Payments or HR?',
        content: (
          <>
            <p>Two switches control what appears:</p>
            <ul>
              <li>
                The agency may have that <strong>module</strong> turned off.
              </li>
              <li>
                Owners and managers set per-page access (None / View / Edit) under{' '}
                <Link to={settingsSectionPath('userAccess')}>
                  Settings → User access
                </Link>
                .
              </li>
            </ul>
          </>
        ),
      },
      {
        id: 'invoice',
        title: 'How do I share an invoice?',
        content: (
          <>
            <p>
              Open the service file, go to its invoice, and use the share link. The
              recipient opens a public page (no login) at a unique <code>/i/…</code>{' '}
              URL.
            </p>
          </>
        ),
      },
      {
        id: 'trash',
        title: 'I deleted a client by mistake',
        content: (
          <>
            <p>
              Soft-deleted clients sit in <Link to="/trash">Trash</Link> until someone
              restores or permanently removes them. Retention depends on your agency
              policy.
            </p>
          </>
        ),
      },
    ],
    [],
  )

  return (
    <div className="pd-page pd-help" aria-label="Help">
      <PageHeader
        title="Help"
        description="How OneTrack fits together — from registering a client to sharing status."
      />

      <section className="pd-help__intro" aria-label="Overview">
        <div>
          <p className="pd-help__lede">
            Staff work moves through a simple loop: register the person, open a
            service file, advance checklist steps on the Service Board, collect
            payment, then let clients track progress with a passport number.
          </p>
          <nav className="pd-help__toc" aria-label="On this page">
            {TOC.map((item) => (
              <a key={item.id} className="pd-help__toc-link" href={`#${item.id}`}>
                {item.label}
                <ArrowUpRight size={12} strokeWidth={2.25} aria-hidden />
              </a>
            ))}
          </nav>
        </div>

        <aside className="pd-help__aside-card">
          <h2>Need something fast?</h2>
          <p>
            Global search finds clients, services, pages, and actions. Press{' '}
            <Kbd>{modKey}</Kbd>
            <Kbd>K</Kbd> or <Kbd>/</Kbd> anywhere.
          </p>
          <div className="pd-help__aside-actions">
            <Button type="button" size="sm" onClick={openSearch}>
              <Search size={14} strokeWidth={2.25} aria-hidden />
              Open search
            </Button>
            <Link
              to="/track"
              className="pd-btn pd-btn--secondary pd-btn--sm"
            >
              <span className="pd-btn__label">
                <Link2 size={14} strokeWidth={2.25} aria-hidden />
                Public tracking
              </span>
            </Link>
          </div>
        </aside>
      </section>

      <section id="workflow" className="pd-help__section" aria-labelledby="help-workflow">
        <div className="pd-help__section-head">
          <h2 id="help-workflow">Everyday workflow</h2>
          <p>Five stops most files pass through</p>
        </div>
        <div className="pd-help-flow" role="list">
          {flowSteps.map((step, index) => {
            const Icon = step.icon
            return (
              <Link
                key={step.id}
                to={step.to}
                className="pd-help-flow__step"
                role="listitem"
              >
                <span className="pd-help-flow__marker">
                  <Icon aria-hidden strokeWidth={2.25} />
                  <span className="pd-help-flow__index">{index + 1}</span>
                </span>
                <p className="pd-help-flow__label">{step.label}</p>
                <p className="pd-help-flow__hint">{step.hint}</p>
              </Link>
            )
          })}
        </div>
      </section>

      <section id="guides" className="pd-help__section" aria-labelledby="help-guides">
        <div className="pd-help__section-head">
          <h2 id="help-guides">Guides</h2>
          <p>Jump into the area that matches the job</p>
        </div>
        <div className="pd-help-guides">
          {guides.map((guide) => {
            const Icon = guide.icon
            return (
              <article key={guide.id} className="pd-help-guide">
                <span className="pd-help-guide__icon" aria-hidden>
                  <Icon size={18} strokeWidth={2.25} />
                </span>
                <h3>{guide.title}</h3>
                <p>{guide.body}</p>
                <div className="pd-help-guide__links">
                  {guide.links.map((link) => (
                    <Link key={link.to} to={link.to}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section id="search" className="pd-help__section" aria-labelledby="help-search">
        <div className="pd-help__section-head">
          <h2 id="help-search">Find anything</h2>
          <p>Keyboard shortcuts and typed filters</p>
        </div>
        <div className="pd-help-split">
          <div className="pd-help-panel">
            <h3 className="pd-help-panel__title">
              <Keyboard size={16} strokeWidth={2.25} aria-hidden />
              Shortcuts
            </h3>
            <p>Works from any page when you are not typing in a field.</p>
            <ul className="pd-help-shortcut-list">
              <li>
                <span>Open or close search</span>
                <span className="pd-help-keys">
                  <Kbd>{modKey}</Kbd>
                  <Kbd>K</Kbd>
                </span>
              </li>
              <li>
                <span>Open search</span>
                <span className="pd-help-keys">
                  <Kbd>/</Kbd>
                </span>
              </li>
              <li>
                <span>Move through results</span>
                <span className="pd-help-keys">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd>
                </span>
              </li>
              <li>
                <span>Open selection</span>
                <span className="pd-help-keys">
                  <Kbd>Enter</Kbd>
                </span>
              </li>
              <li>
                <span>Cycle filters</span>
                <span className="pd-help-keys">
                  <Kbd>Tab</Kbd>
                </span>
              </li>
              <li>
                <span>Close</span>
                <span className="pd-help-keys">
                  <Kbd>Esc</Kbd>
                </span>
              </li>
            </ul>
          </div>

          <div className="pd-help-panel">
            <h3>Type a prefix</h3>
            <p>
              Narrow results before you finish typing. Example:{' '}
              <code>@rahim</code> or <code>s: tourist</code>.
            </p>
            <div className="pd-help-prefix-grid">
              {SEARCH_PREFIXES.map((item) => (
                <div key={item.code} className="pd-help-prefix">
                  <code>{item.code}</code>
                  <span>{item.scope}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="map" className="pd-help__section" aria-labelledby="help-map">
        <div className="pd-help__section-head">
          <h2 id="help-map">Workspace map</h2>
          <p>Areas enabled for this agency</p>
        </div>
        <div className="pd-help-map">
          {mapTiles.map((tile) => {
            const Icon = tile.icon
            return (
              <Link key={tile.path} to={tile.path} className="pd-help-map__tile">
                <Icon aria-hidden strokeWidth={2.25} />
                <span>
                  <strong>{tile.label}</strong>
                  <span>{tile.description}</span>
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      <section id="faq" className="pd-help__section" aria-labelledby="help-faq">
        <div className="pd-help__section-head">
          <h2 id="help-faq">FAQ</h2>
          <p>Common questions from the desk</p>
        </div>
        <Accordion
          className="pd-help-faq"
          multiple
          defaultOpenIds={['client-vs-service']}
          items={faqItems}
        />
      </section>
    </div>
  )
}
