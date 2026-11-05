export type AnnouncementStatus = 'draft' | 'scheduled' | 'live' | 'ended'

/** Visual / semantic category for templates and agency popup styling. */
export type AnnouncementKind =
  | 'policy'
  | 'security'
  | 'promotional'
  | 'maintenance'
  | 'feature'
  | 'billing'
  | 'holiday'
  | 'urgent'
  | 'general'

/**
 * once — show until Got it (sticky dismiss until the announcement is edited)
 * continuous — may show again based on interval + daily cap (standard)
 */
export type AnnouncementRepeatMode = 'once' | 'continuous'

export type PlatformAnnouncement = {
  id: string
  title: string
  body: string
  kind: AnnouncementKind
  imageUrl: string | null
  imageFileId: string | null
  published: boolean
  /** Popup inside signed-in agency app. */
  showInApp: boolean
  /** Popup on the public marketing landing page. */
  showOnLanding: boolean
  repeatMode: AnnouncementRepeatMode
  /** Continuous only. 0 = unlimited shows per calendar day. */
  maxShowsPerDay: number
  /** Continuous only. Minutes to wait between shows. 0 = every eligible visit. */
  intervalMinutes: number
  startsAt: string | null
  endsAt: string | null
  createdAt: string
  updatedAt: string
  createdBy?: string | null
  status: AnnouncementStatus
}

export type AnnouncementInput = {
  title: string
  body: string
  kind?: AnnouncementKind
  published?: boolean
  showInApp?: boolean
  showOnLanding?: boolean
  repeatMode?: AnnouncementRepeatMode
  maxShowsPerDay?: number
  intervalMinutes?: number
  startsAt?: string | null
  endsAt?: string | null
  imageUrl?: string | null
  imageFileId?: string | null
}

export type ActiveAnnouncement = Pick<
  PlatformAnnouncement,
  | 'id'
  | 'title'
  | 'body'
  | 'kind'
  | 'imageUrl'
  | 'imageFileId'
  | 'showInApp'
  | 'showOnLanding'
  | 'repeatMode'
  | 'maxShowsPerDay'
  | 'intervalMinutes'
  | 'startsAt'
  | 'endsAt'
  | 'updatedAt'
  | 'status'
>
