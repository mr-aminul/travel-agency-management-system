import type { CSSProperties, ReactNode } from 'react'
import { ArrowRight, ChatCircle, Users, UsersThree } from '@phosphor-icons/react'
import { appUrl } from '@/lib/siteOrigins'
import { subscribeUrl } from './landingLinks'

const ROLES: readonly { title: string; body: string; href: string; cta: string; icon: ReactNode }[] = [
  {
    title: 'Your team',
    body: 'Staff sign in with their own email. Every agency has its own workspace.',
    href: subscribeUrl(),
    cta: 'Start free trial',
    icon: <Users weight="duotone" />,
  },
  {
    title: 'Sub agents',
    body: 'They send clients and follow progress in the sub agent portal.',
    href: appUrl('/login'),
    cta: 'Sign in',
    icon: <UsersThree weight="duotone" />,
  },
  {
    title: 'Clients',
    body: 'They open a tracking link with their passport number. No account needed.',
    href: appUrl('/track'),
    cta: 'Track a file',
    icon: <ChatCircle weight="duotone" />,
  },
]

export function WhoUsesIt() {
  return (
    <section className="section wrap" id="who" aria-labelledby="who-title">
      <header className="section-head" data-enter>
        <p className="eyebrow">
          <Users weight="bold" />
          Who uses it
        </p>
        <h2 id="who-title">One product for the whole desk.</h2>
        <p>Your staff, your sub agents, and your clients — each sees what they need.</p>
      </header>
      <ul className="cells who">
        {ROLES.map((role, index) => (
          <li key={role.title} data-enter style={{ '--enter-i': index } as CSSProperties}>
            <a className="who-card" href={role.href}>
              <span className="who-icon" aria-hidden>
                {role.icon}
              </span>
              <h3>{role.title}</h3>
              <p>{role.body}</p>
              <span className="who-cta">
                {role.cta}
                <ArrowRight weight="bold" />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
