export type PlatformTourStep = {
  id: string
  title: string
  body: string
  /** CSS selector for the highlighted element. Omit for a centered intro/outro. */
  selector?: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
}

export const PLATFORM_TOUR_STEPS: PlatformTourStep[] = [
  {
    id: 'welcome',
    title: 'A quick tour of your workspace',
    body: 'This walkthrough highlights the main parts of the platform so your team knows where to work.',
  },
  {
    id: 'search',
    title: 'Search across the agency',
    body: 'Find clients, services, payments, and more from one place. On other pages, search also lives in the top bar.',
    selector: '[data-tour="home-search"]',
    placement: 'bottom',
  },
  {
    id: 'quick-links',
    title: 'Jump into everyday work',
    body: 'These tiles open the areas staff use most — clients, services, payments, documents, and more.',
    selector: '[data-tour="home-quick-links"]',
    placement: 'top',
  },
  {
    id: 'sidebar',
    title: 'Full navigation',
    body: 'The sidebar is always available. Use it to move between modules even when you are not on Home.',
    selector: '[data-tour="sidebar-nav"]',
    placement: 'right',
  },
  {
    id: 'profile',
    title: 'Account and settings',
    body: 'Open your profile menu for settings, your account, and sign out.',
    selector: '[data-tour="topbar-profile"]',
    placement: 'bottom',
  },
  {
    id: 'done',
    title: 'You are ready to explore',
    body: 'Start with Clients or Services whenever you are ready. You can dismiss this tour permanently — it will not keep asking.',
  },
]
