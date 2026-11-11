import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  Briefcase,
  Building2,
  Calendar,
  Check,
  Droplets,
  Globe2,
  GraduationCap,
  Hash,
  Heart,
  IdCard,
  Languages,
  Mail,
  MapPinned,
  Pencil,
  Phone,
  Sparkles,
  UserRound,
  Users,
  VenusAndMars,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import {
  BLOOD_GROUP_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_OPTIONS,
  PROFILE_GAP_FIELD,
  type ClientProfileDraft,
  type ClientProfileSectionId,
} from '@/components/clients/clientProfileDraft'
import { Button } from '@/components/shadcn/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'
import type { ClientInfoGap } from '@/lib/clientMissingInfo'
import { formatDisplayDate } from '@/lib/formatDate'
import { cn } from '@/lib/utils'
import type { ClientGender } from '@/types/client'
import type { ClientProfileField } from '@/types/clientProfileField'

type FieldKind =
  | 'text'
  | 'date'
  | 'tel'
  | 'email'
  | 'gender'
  | 'marital'
  | 'blood'
  | 'subAgent'

type WorkspaceField = {
  key: keyof ClientProfileDraft
  label: string
  kind?: FieldKind
  required?: boolean
  wide?: boolean
  icon?: LucideIcon
}

type ProfileGroupId = ClientProfileSectionId

type ProfileGroup = {
  id: ProfileGroupId
  label: string
  icon: LucideIcon
  fields: WorkspaceField[]
  gapIds?: Array<ClientInfoGap['id']>
}

const PROFILE_GROUPS: ProfileGroup[] = [
  {
    id: 'identity',
    label: 'Personal',
    icon: UserRound,
    fields: [
      { key: 'name', label: 'Full Name', required: true, icon: IdCard },
      { key: 'banglaName', label: 'Bangla Name', icon: Languages },
      { key: 'dateOfBirth', label: 'Date of Birth', kind: 'date', icon: Calendar },
      { key: 'gender', label: 'Gender', kind: 'gender', icon: VenusAndMars },
      { key: 'nationality', label: 'Nationality', icon: Globe2 },
      { key: 'placeOfBirth', label: 'Place of Birth', icon: MapPinned },
      { key: 'bloodGroup', label: 'Blood Group', kind: 'blood', icon: Droplets },
    ],
  },
  {
    id: 'contact',
    label: 'Contact',
    icon: Phone,
    gapIds: ['email', 'address'],
    fields: [
      { key: 'phone', label: 'Mobile Number', kind: 'tel', required: true, icon: Phone },
      { key: 'whatsapp', label: 'WhatsApp', kind: 'tel', icon: Phone },
      { key: 'email', label: 'Email', kind: 'email', icon: Mail },
      { key: 'subAgentId', label: 'Sub Agent', kind: 'subAgent', icon: Users },
      { key: 'presentAddress', label: 'Present Address', icon: MapPinned },
      { key: 'permanentAddress', label: 'Permanent Address', icon: MapPinned },
      { key: 'district', label: 'District', icon: Building2 },
      { key: 'upazila', label: 'Upazila', icon: Building2 },
    ],
  },
  {
    id: 'family',
    label: 'Family',
    icon: Users,
    fields: [
      { key: 'fatherName', label: 'Father Name', icon: UserRound },
      { key: 'motherName', label: 'Mother Name', icon: UserRound },
      { key: 'maritalStatus', label: 'Marital Status', kind: 'marital', icon: Heart },
      { key: 'spouseName', label: 'Spouse Name', icon: Heart },
    ],
  },
  {
    id: 'work',
    label: 'Work',
    icon: Briefcase,
    fields: [
      { key: 'profession', label: 'Profession', icon: Briefcase },
      { key: 'education', label: 'Education', icon: GraduationCap },
      { key: 'skillTrade', label: 'Skill / Trade', icon: Sparkles },
      { key: 'experience', label: 'Experience', icon: Hash },
      { key: 'previousOverseasExp', label: 'Overseas Experience', icon: Globe2 },
      { key: 'preferredCountry', label: 'Preferred Country', icon: Globe2 },
      { key: 'preferredJob', label: 'Preferred Job', icon: Briefcase },
      { key: 'expectedSalary', label: 'Expected Salary', icon: Wallet },
      { key: 'branch', label: 'Branch', icon: Building2 },
    ],
  },
]

function groupFromSection(
  section?: ClientProfileSectionId,
): ProfileGroupId {
  if (section === 'identity') return 'identity'
  if (section === 'contact') return 'contact'
  if (section === 'family') return 'family'
  if (section === 'work') return 'work'
  if (section === 'placement') return 'placement'
  if (section === 'extra') return 'extra'
  return 'identity'
}

function gapForField(
  gaps: ClientInfoGap[],
  fieldKey: keyof ClientProfileDraft,
): ClientInfoGap | undefined {
  return gaps.find((gap) => PROFILE_GAP_FIELD[gap.id] === fieldKey)
}

function formatValue(
  value: string,
  kind?: FieldKind,
  subAgentOptions?: { value: string; label: string }[],
): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (kind === 'date') return formatDisplayDate(trimmed)
  if (kind === 'subAgent') {
    return (
      subAgentOptions?.find((option) => option.value === trimmed)?.label ??
      trimmed
    )
  }
  return trimmed
}

const cellControlClass =
  'h-auto w-full min-w-0 cursor-text border-0 bg-transparent p-0 text-[0.8125rem] font-normal leading-snug text-foreground shadow-none outline-none ring-0 focus-visible:ring-0 disabled:cursor-default'

function selectOptionsForField(
  field: WorkspaceField,
  subAgentOptions: { value: string; label: string }[],
) {
  if (field.kind === 'gender') return GENDER_OPTIONS
  if (field.kind === 'marital') return MARITAL_OPTIONS
  if (field.kind === 'blood') return BLOOD_GROUP_OPTIONS
  if (field.kind === 'subAgent') return subAgentOptions
  return null
}

function CellControl({
  field,
  value,
  error,
  subAgentOptions,
  onBlur,
  onChange,
}: {
  field: WorkspaceField
  value: string
  error?: string
  subAgentOptions: { value: string; label: string }[]
  onBlur: () => void
  onChange: (value: string) => void
}) {
  const options = selectOptionsForField(field, subAgentOptions)
  if (options) {
    return (
      <Select
        value={value || '__empty'}
        onValueChange={(next) => onChange(next === '__empty' ? '' : next)}
        onOpenChange={(open) => {
          if (!open) onBlur()
        }}
      >
        <SelectTrigger
          aria-label={field.label}
          size="sm"
          className={cn(
            'h-auto min-h-0 w-full min-w-0 justify-between gap-1.5 rounded-sm border-0 bg-transparent px-0 py-0 text-[0.8125rem] font-normal leading-snug shadow-none outline-none focus-visible:border-0 focus-visible:ring-0 data-[size=sm]:h-auto data-[size=sm]:rounded-sm dark:bg-transparent dark:hover:bg-transparent [&_svg]:size-3.5',
            error ? 'text-destructive' : 'text-foreground',
            !value && 'text-muted-foreground',
          )}
        >
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent
          align="start"
          position="popper"
          className="min-w-[10rem] rounded-md [&_[data-slot=select-item]]:rounded-sm"
        >
          {options.map((option) => (
            <SelectItem
              key={option.value || '__empty'}
              value={option.value || '__empty'}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <input
      aria-label={field.label}
      className={cn(cellControlClass, error && 'text-destructive')}
      type={
        field.kind === 'date'
          ? 'date'
          : field.kind === 'email'
            ? 'email'
            : field.kind === 'tel'
              ? 'tel'
              : 'text'
      }
      value={value}
      onBlur={onBlur}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function ReadValue({
  value,
  kind,
  gap,
  subAgentOptions,
}: {
  value: string
  kind?: FieldKind
  gap?: ClientInfoGap
  subAgentOptions?: { value: string; label: string }[]
}) {
  const display = formatValue(value, kind, subAgentOptions)
  const empty = !display

  return (
    <span
      className={cn(
        'min-w-0 text-[0.8125rem] leading-snug',
        empty && 'text-muted-foreground/70',
        !empty && !gap && 'text-foreground',
        gap && 'font-medium text-destructive',
        !empty && 'break-words',
      )}
    >
      {empty ? '—' : display}
    </span>
  )
}

type FieldEntry = {
  key: string
  label: string
  value: string
  kind?: FieldKind
  gap?: ClientInfoGap
  required?: boolean
  workspaceField?: WorkspaceField
  customId?: string
  icon?: LucideIcon
}

function ProfileSectionCard({
  title,
  icon: Icon,
  sectionId,
  children,
}: {
  title: string
  icon: LucideIcon
  sectionId: string
  children: ReactNode
}) {
  return (
    <Card
      size="sm"
      className="pd-client-elevated-panel gap-0 overflow-hidden border-border py-0 shadow-[var(--shadow-card)] ring-0"
      id={`client-profile-section-${sectionId}`}
      aria-label={title}
    >
      <CardHeader className="flex h-9 flex-row items-center gap-1.5 border-b border-border/80 px-3.5 py-0 pt-0 [.border-b]:pb-0">
        <Icon
          className="size-3.5 shrink-0 text-muted-foreground"
          strokeWidth={1.75}
          aria-hidden
        />
        <CardTitle className="text-[0.9375rem] font-semibold tracking-tight">
          <h2 className="text-inherit font-inherit tracking-inherit">{title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3.5 py-2.5">
        <dl className="m-0">{children}</dl>
      </CardContent>
    </Card>
  )
}

function DetailRow({
  entry,
  editing,
  subAgentOptions,
  showError,
  fieldError,
  customFieldError,
  blur,
  onChange,
  onCustomChange,
}: {
  entry: FieldEntry
  editing: boolean
  subAgentOptions: { value: string; label: string }[]
  showError: (key: string) => boolean
  fieldError: (key: keyof ClientProfileDraft) => string | undefined
  customFieldError: (fieldId: string) => string | undefined
  blur: (key: string) => () => void
  onChange: <K extends keyof ClientProfileDraft>(
    key: K,
    value: ClientProfileDraft[K],
  ) => void
  onCustomChange: (fieldId: string, value: string) => void
}) {
  const Icon = entry.icon ?? Hash
  const isCustom = Boolean(entry.customId)
  const rawError = isCustom
    ? customFieldError(entry.customId!)
    : fieldError(entry.key as keyof ClientProfileDraft)
  const error =
    rawError && (showError(entry.key) || Boolean(entry.value.trim()))
      ? rawError
      : undefined
  const missingRequired = Boolean(entry.required) && !entry.value.trim()
  const showMissing = missingRequired || Boolean(error)
  const workspaceField =
    entry.workspaceField ??
    ({
      key: 'name',
      label: entry.label,
      kind: 'text' as const,
    } satisfies WorkspaceField)

  return (
    <div
      data-profile-field={entry.key}
      data-invalid={showMissing ? 'true' : undefined}
      title={error || undefined}
      className={cn(
        'grid grid-cols-[1rem_7.5rem_minmax(0,1fr)] items-center gap-x-2 gap-y-0.5 py-1',
        showMissing && 'rounded-md bg-destructive/10 px-1.5',
      )}
    >
      <Icon
        className="size-3.5 shrink-0 text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden
      />
      <dt className="min-w-0 text-[0.75rem] font-medium leading-tight text-muted-foreground">
        {entry.label}
      </dt>
      <dd className="min-w-0">
        {editing ? (
          isCustom ? (
            <input
              aria-label={entry.label}
              className={cn(cellControlClass, showMissing && 'text-destructive')}
              value={entry.value}
              onBlur={blur(entry.key)}
              onChange={(event) =>
                onCustomChange(entry.customId!, event.target.value)
              }
            />
          ) : (
            <CellControl
              field={workspaceField}
              value={entry.value}
              error={error ?? (missingRequired ? 'Required' : undefined)}
              subAgentOptions={subAgentOptions}
              onBlur={blur(entry.key)}
              onChange={(value) => {
                if (workspaceField.kind === 'gender') {
                  onChange('gender', value as ClientGender | '')
                  return
                }
                onChange(
                  workspaceField.key,
                  value as ClientProfileDraft[typeof workspaceField.key],
                )
              }}
            />
          )
        ) : (
          <ReadValue
            value={entry.value}
            kind={entry.kind}
            gap={entry.gap}
            subAgentOptions={subAgentOptions}
          />
        )}
      </dd>
    </div>
  )
}

function SectionPanel({
  group,
  draft,
  gaps,
  editing,
  subAgentOptions,
  customFieldDefs,
  showError,
  fieldError,
  customFieldError,
  blur,
  onChange,
  onCustomChange,
}: {
  group: ProfileGroup
  draft: ClientProfileDraft
  gaps: ClientInfoGap[]
  editing: boolean
  subAgentOptions: { value: string; label: string }[]
  customFieldDefs: ClientProfileField[]
  showError: (key: string) => boolean
  fieldError: (key: keyof ClientProfileDraft) => string | undefined
  customFieldError: (fieldId: string) => string | undefined
  blur: (key: string) => () => void
  onChange: <K extends keyof ClientProfileDraft>(
    key: K,
    value: ClientProfileDraft[K],
  ) => void
  onCustomChange: (fieldId: string, value: string) => void
}): ReactNode {
  const customForGroup = customFieldDefs.filter(
    (field) => field.section === group.id,
  )
  const entries: FieldEntry[] = [
    ...group.fields.map((field) => ({
      key: field.key,
      label: field.label,
      value: String(draft[field.key] ?? ''),
      kind: field.kind,
      gap: gapForField(gaps, field.key),
      required: field.required,
      workspaceField: field,
      icon: field.icon,
    })),
    ...customForGroup.map((field) => ({
      key: `custom:${field.id}`,
      label: field.label,
      value: draft.customFields[field.id] ?? '',
      customId: field.id,
      required: field.required,
      icon: Hash,
    })),
  ]

  return (
    <ProfileSectionCard
      title={group.label}
      icon={group.icon}
      sectionId={group.id}
    >
      {entries.map((entry) => (
        <DetailRow
          key={entry.key}
          entry={entry}
          editing={editing}
          subAgentOptions={subAgentOptions}
          showError={showError}
          fieldError={fieldError}
          customFieldError={customFieldError}
          blur={blur}
          onChange={onChange}
          onCustomChange={onCustomChange}
        />
      ))}
    </ProfileSectionCard>
  )
}

export function ClientProfileWorkspace({
  draft,
  savedDraft,
  gaps,
  customFieldDefs,
  subAgentOptions,
  showError,
  fieldError,
  customFieldError,
  blur,
  onChange,
  onCustomChange,
  onDiscard,
  onSave,
  initialSection,
  focusField,
}: {
  draft: ClientProfileDraft
  savedDraft: ClientProfileDraft
  gaps: ClientInfoGap[]
  customFieldDefs: ClientProfileField[]
  subAgentOptions: { value: string; label: string }[]
  showError: (key: string) => boolean
  fieldError: (key: keyof ClientProfileDraft) => string | undefined
  customFieldError: (fieldId: string) => string | undefined
  blur: (key: string) => () => void
  onChange: <K extends keyof ClientProfileDraft>(
    key: K,
    value: ClientProfileDraft[K],
  ) => void
  onCustomChange: (fieldId: string, value: string) => void
  onDiscard: () => void
  onSave: () => boolean
  initialSection?: ClientProfileSectionId
  focusField?: keyof ClientProfileDraft
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const isDirty = JSON.stringify(draft) !== JSON.stringify(savedDraft)
  const [editing, setEditing] = useState(Boolean(focusField) || isDirty)

  const groups = useMemo(() => {
    const next = [...PROFILE_GROUPS]
    if (customFieldDefs.some((field) => field.section === 'placement')) {
      next.push({
        id: 'placement' as const,
        label: 'Placement',
        icon: MapPinned,
        fields: [] as WorkspaceField[],
      })
    }
    if (customFieldDefs.some((field) => field.section === 'extra')) {
      next.push({
        id: 'extra' as const,
        label: 'Extra',
        icon: Sparkles,
        fields: [] as WorkspaceField[],
      })
    }
    return next
  }, [customFieldDefs])

  useEffect(() => {
    if (focusField || isDirty) setEditing(true)
  }, [focusField, isDirty])

  useEffect(() => {
    const target =
      focusField != null
        ? `[data-profile-field="${focusField}"]`
        : initialSection
          ? `#client-profile-section-${groupFromSection(initialSection)}`
          : null
    if (!target) return
    const frame = window.requestAnimationFrame(() => {
      const node = rootRef.current?.querySelector(target)
      if (!(node instanceof HTMLElement)) return
      node.scrollIntoView({
        block: focusField ? 'center' : 'start',
        behavior: 'smooth',
      })
      if (!focusField) return
      const input = node.querySelector('input, button, textarea')
      if (input instanceof HTMLElement) input.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [focusField, initialSection, editing, groups])

  const handleDiscard = () => {
    onDiscard()
    setEditing(false)
  }

  const handleSave = () => {
    if (onSave()) {
      setEditing(false)
      return
    }
    window.requestAnimationFrame(() => {
      const invalid = rootRef.current?.querySelector<HTMLElement>(
        '[data-invalid="true"]',
      )
      if (!invalid) return
      invalid.scrollIntoView({ block: 'center', behavior: 'smooth' })
      const input = invalid.querySelector('input, select, textarea')
      if (input instanceof HTMLElement) input.focus()
    })
  }

  const leftIds: ProfileGroupId[] = ['identity', 'contact']
  const rightIds: ProfileGroupId[] = ['family', 'work', 'placement', 'extra']
  const leftGroups = groups.filter((group) => leftIds.includes(group.id))
  const rightGroups = groups.filter((group) => rightIds.includes(group.id))

  const panelProps = {
    draft,
    gaps,
    editing,
    subAgentOptions,
    customFieldDefs,
    showError,
    fieldError,
    customFieldError,
    blur,
    onChange,
    onCustomChange,
  }

  return (
    <div
      ref={rootRef}
      className="pd-client-profile-overview flex min-w-0 flex-col gap-2.5"
      aria-label="Client profile editor"
    >
      <div className="pd-client-profile-overview__grid">
        <div className="pd-client-profile-overview__col">
          {leftGroups.map((group) => (
            <SectionPanel key={group.id} group={group} {...panelProps} />
          ))}
        </div>
        <div className="pd-client-profile-overview__col">
          {rightGroups.map((group) => (
            <SectionPanel key={group.id} group={group} {...panelProps} />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-start gap-2 pt-0.5">
        {editing ? (
          <>
            <Button
              variant="outline"
              className="h-8 rounded-md bg-card text-xs hover:bg-card"
              onClick={handleDiscard}
            >
              {isDirty ? 'Discard' : 'Cancel'}
            </Button>
            <Button
              className="h-8 rounded-md text-xs"
              onClick={handleSave}
              disabled={!isDirty}
            >
              <Check size={14} strokeWidth={2.25} aria-hidden />
              Save
            </Button>
          </>
        ) : (
          <Button
            className="h-8 gap-1.5 rounded-md text-xs"
            onClick={() => setEditing(true)}
          >
            <Pencil size={14} strokeWidth={2.25} aria-hidden />
            Edit
          </Button>
        )}
      </div>
    </div>
  )
}
