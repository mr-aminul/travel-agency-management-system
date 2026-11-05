import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  BadgePercent,
  CalendarClock,
  FileText,
  Gift,
  Lock,
  Megaphone,
  PartyPopper,
  ShieldAlert,
  Sparkles,
  Wrench,
} from 'lucide-react'
import type { AnnouncementKind } from '@/types/announcement'

export type AnnouncementTemplate = {
  id: string
  kind: AnnouncementKind
  label: string
  description: string
  title: string
  body: string
  icon: LucideIcon
}

export const ANNOUNCEMENT_KIND_META: Record<
  AnnouncementKind,
  {
    label: string
    shortLabel: string
    description: string
    icon: LucideIcon
  }
> = {
  policy: {
    label: 'Policy update',
    shortLabel: 'Policy',
    description: 'Terms, rules, and compliance changes',
    icon: FileText,
  },
  security: {
    label: 'Security update',
    shortLabel: 'Security',
    description: 'Password, login, and account safety',
    icon: ShieldAlert,
  },
  promotional: {
    label: 'Promotional',
    shortLabel: 'Promo',
    description: 'Offers, campaigns, and limited deals',
    icon: BadgePercent,
  },
  maintenance: {
    label: 'Maintenance',
    shortLabel: 'Maintenance',
    description: 'Downtime and scheduled work windows',
    icon: Wrench,
  },
  feature: {
    label: 'New feature',
    shortLabel: 'Feature',
    description: 'Product improvements and launches',
    icon: Sparkles,
  },
  billing: {
    label: 'Billing update',
    shortLabel: 'Billing',
    description: 'Plans, invoices, and payment notices',
    icon: Gift,
  },
  holiday: {
    label: 'Holiday notice',
    shortLabel: 'Holiday',
    description: 'Office hours and holiday schedules',
    icon: PartyPopper,
  },
  urgent: {
    label: 'Urgent alert',
    shortLabel: 'Urgent',
    description: 'Time-sensitive issues agencies must see',
    icon: AlertTriangle,
  },
  general: {
    label: 'General notice',
    shortLabel: 'General',
    description: 'Anything else for every agency',
    icon: Megaphone,
  },
}

export const ANNOUNCEMENT_KINDS = Object.keys(
  ANNOUNCEMENT_KIND_META,
) as AnnouncementKind[]

export function isAnnouncementKind(value: unknown): value is AnnouncementKind {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(ANNOUNCEMENT_KIND_META, value)
  )
}

export function normalizeAnnouncementKind(
  value: unknown,
): AnnouncementKind {
  return isAnnouncementKind(value) ? value : 'general'
}

/** Ready-to-edit copy for common platform notices. */
export const ANNOUNCEMENT_TEMPLATES: AnnouncementTemplate[] = [
  {
    id: 'blank',
    kind: 'general',
    label: 'Blank message',
    description: 'Start from scratch with your own title and body.',
    title: '',
    body: '',
    icon: Megaphone,
  },
  {
    id: 'policy-terms',
    kind: 'policy',
    label: 'Policy / terms update',
    description: 'Tell agencies about updated platform rules.',
    title: 'Policy update — please review',
    body: `We have updated OneTrack platform policies that apply to every agency.

What changed:
• [Summarize the main change]
• [Optional second point]

What you should do:
1. Read the updated policy in Settings or the link we shared.
2. Brief your team so everyone follows the new rules.
3. Contact support if anything is unclear.

Effective date: [DD Mon YYYY]
Thank you for keeping your agency compliant.`,
    icon: FileText,
  },
  {
    id: 'security-password',
    kind: 'security',
    label: 'Security / password',
    description: 'Ask agencies to secure accounts promptly.',
    title: 'Security notice — protect your logins',
    body: `We are strengthening account security across OneTrack.

Please do this today:
• Change weak or shared passwords for owner and staff logins.
• Turn off any unused user accounts.
• Never share one login between multiple people.

If you notice unusual sign-in activity, reset passwords immediately and message support.

Stay safe — your client data depends on it.`,
    icon: Lock,
  },
  {
    id: 'security-incident',
    kind: 'urgent',
    label: 'Urgent security alert',
    description: 'High-priority safety message for all agencies.',
    title: 'Urgent: security action required',
    body: `This is an urgent security notice for every agency on OneTrack.

Immediate action:
1. Sign out of shared devices.
2. Reset your password now.
3. Review recent People / login activity in your agency.

We will follow up with more detail shortly. If something looks wrong in your account, contact support right away.`,
    icon: ShieldAlert,
  },
  {
    id: 'promo-offer',
    kind: 'promotional',
    label: 'Promotional offer',
    description: 'Announce a limited deal or campaign.',
    title: 'Special offer for OneTrack agencies',
    body: `We have a limited-time offer for your agency.

Offer: [Describe the deal — e.g. extra SMS pack / plan upgrade credit]
Valid until: [DD Mon YYYY]

How to claim:
• Reply to this announcement from support, or
• Open Billing and follow the instructions we shared.

This offer applies to active agencies only. Don’t miss it.`,
    icon: BadgePercent,
  },
  {
    id: 'promo-referral',
    kind: 'promotional',
    label: 'Referral / reward',
    description: 'Invite agencies to refer others for rewards.',
    title: 'Refer an agency — earn rewards',
    body: `Know another travel agency that should run on OneTrack?

Refer them and you can earn: [reward details].

How it works:
1. Share your referral note with the new agency.
2. They sign up and go live.
3. We credit your reward after activation.

Questions? Message platform support and we will help.`,
    icon: Gift,
  },
  {
    id: 'maintenance-window',
    kind: 'maintenance',
    label: 'Scheduled maintenance',
    description: 'Warn agencies before downtime.',
    title: 'Scheduled maintenance',
    body: `OneTrack will be briefly unavailable for maintenance.

When: [Day], [DD Mon YYYY], [start time] – [end time] (local)
Impact: Login and some pages may be slow or offline during this window.

What to do:
• Finish urgent client updates before the window starts.
• Avoid starting long uploads during maintenance.

We will restore service as quickly as possible. Thank you for your patience.`,
    icon: Wrench,
  },
  {
    id: 'feature-launch',
    kind: 'feature',
    label: 'New feature launch',
    description: 'Highlight something new in the product.',
    title: 'New in OneTrack',
    body: `We just shipped something new for your team.

What’s new: [Feature name]
Why it helps: [One short benefit]

Try it here: [Path or menu — e.g. Clients → …]

Tips:
• [Quick tip 1]
• [Quick tip 2]

Feedback is welcome — tell us what you think.`,
    icon: Sparkles,
  },
  {
    id: 'billing-plan',
    kind: 'billing',
    label: 'Billing / plan change',
    description: 'Plan prices, renewals, or invoice reminders.',
    title: 'Billing update',
    body: `This is a billing notice for your OneTrack subscription.

Details:
• [What changed — price, plan, renewal, or invoice]
• Effective: [DD Mon YYYY]

Please check Billing in your agency workspace. If payment is overdue, update it soon to avoid interruption.

Need a custom plan or invoice copy? Contact platform support.`,
    icon: Gift,
  },
  {
    id: 'holiday-hours',
    kind: 'holiday',
    label: 'Holiday / office hours',
    description: 'Support hours during holidays.',
    title: 'Holiday support hours',
    body: `Our support schedule will change for the holiday.

Dates: [DD Mon] – [DD Mon YYYY]
Support hours: [e.g. 10:00–16:00] or closed

Your OneTrack workspace stays available. For urgent platform issues, email support and we will respond as soon as we can.

Happy holidays from the OneTrack team.`,
    icon: CalendarClock,
  },
  {
    id: 'general-update',
    kind: 'general',
    label: 'General platform update',
    description: 'Catch-all notice for all agencies.',
    title: 'Platform update',
    body: `Quick update from the OneTrack platform team:

[Write the main message in 2–4 short sentences.]

If this affects your daily work:
• [Action item for agencies]
• [Optional second action]

Thank you for using OneTrack.`,
    icon: Megaphone,
  },
]

export function announcementKindLabel(kind: AnnouncementKind): string {
  return ANNOUNCEMENT_KIND_META[kind]?.shortLabel ?? 'General'
}

export function announcementKindIcon(kind: AnnouncementKind): LucideIcon {
  return ANNOUNCEMENT_KIND_META[kind]?.icon ?? Megaphone
}
