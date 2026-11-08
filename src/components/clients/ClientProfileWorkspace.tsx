import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  Briefcase,
  Check,
  Contact,
  FileText,
  IdCard,
  Pencil,
  Puzzle,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { ClientCustomFieldControl } from '@/components/clients/ClientCustomFieldControl'
import { Input, Select } from '@/components/clients/clientShadcnFields'
import {
  BLOOD_GROUP_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_OPTIONS,
  PROFILE_GAP_FIELD,
  type ClientProfileDraft,
  type ClientProfileSectionId,
} from '@/components/clients/clientProfileDraft'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
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
  | 'document'

type WorkspaceField = {
  key: keyof ClientProfileDraft
  label: string
  kind?: FieldKind
  required?: boolean
  wide?: boolean
  documentFocus?: 'passport' | 'nid'
}

const SECTION_FIELDS: Record<
  Exclude<ClientProfileSectionId, 'extra'>,
  WorkspaceField[]
> = {
  reach: [
    { key: 'name', label: 'Full Name', required: true },
    { key: 'banglaName', label: 'Bangla Name' },
    { key: 'phone', label: 'Mobile Number', kind: 'tel', required: true },
    { key: 'email', label: 'Email', kind: 'email' },
    { key: 'subAgentId', label: 'Sub Agent', kind: 'subAgent' },
    { key: 'address', label: 'Address', wide: true },
  ],
  travel: [
    {
      key: 'passport',
      label: 'Passport',
      kind: 'document',
      documentFocus: 'passport',
    },
    { key: 'passportPlaceOfIssue', label: 'Place of Issue' },
    { key: 'passportIssuedOn', label: 'Date of Issue', kind: 'date' },
    { key: 'passportExpiry', label: 'Date of Expiry', kind: 'date' },
    { key: 'nid', label: 'National ID', kind: 'document', documentFocus: 'nid' },
  ],
  personal: [
    { key: 'dateOfBirth', label: 'Date of Birth', kind: 'date' },
    { key: 'gender', label: 'Gender', kind: 'gender' },
    { key: 'nationality', label: 'Nationality' },
    { key: 'placeOfBirth', label: 'Place of Birth' },
    { key: 'bloodGroup', label: 'Blood Group', kind: 'blood' },
  ],
  family: [
    { key: 'fatherName', label: 'Father Name' },
    { key: 'motherName', label: 'Mother Name' },
    { key: 'maritalStatus', label: 'Marital Status', kind: 'marital' },
    { key: 'spouseName', label: 'Spouse Name' },
  ],
  work: [
    { key: 'profession', label: 'Profession' },
    { key: 'education', label: 'Education' },
    { key: 'skillTrade', label: 'Skill / Trade' },
    { key: 'experience', label: 'Experience' },
    { key: 'previousOverseasExp', label: 'Overseas Experience' },
    { key: 'preferredCountry', label: 'Preferred Country' },
    { key: 'preferredJob', label: 'Preferred Job' },
    { key: 'expectedSalary', label: 'Expected Salary' },
    { key: 'branch', label: 'Branch' },
  ],
  places: [
    { key: 'presentAddress', label: 'Present Address', wide: true },
    { key: 'permanentAddress', label: 'Permanent Address', wide: true },
    { key: 'district', label: 'District' },
    { key: 'upazila', label: 'Upazila' },
  ],
}

type ProfileGroupId = 'contact' | 'identity' | 'family' | 'work' | 'extra'

type ProfileGroup = {
  id: ProfileGroupId
  label: string
  icon: LucideIcon
  fields: WorkspaceField[]
  gapIds?: Array<ClientInfoGap['id']>
}

const PROFILE_GROUPS: ProfileGroup[] = [
  {
    id: 'contact',
    label: 'Contact',
    icon: Contact,
    fields: [...SECTION_FIELDS.reach, ...SECTION_FIELDS.places],
    gapIds: ['email', 'address'],
  },
  {
    id: 'identity',
    label: 'Identity',
    icon: IdCard,
    fields: [...SECTION_FIELDS.travel, ...SECTION_FIELDS.personal],
    gapIds: ['passport', 'passportIssuedOn', 'passportExpiry', 'nid'],
  },
  {
    id: 'family',
    label: 'Family',
    icon: Users,
    fields: SECTION_FIELDS.family,
  },
  {
    id: 'work',
    label: 'Work',
    icon: Briefcase,
    fields: SECTION_FIELDS.work,
  },
]

function groupFromSection(
  section?: ClientProfileSectionId,
): ProfileGroupId {
  if (section === 'travel' || section === 'personal') return 'identity'
  if (section === 'family') return 'family'
  if (section === 'work') return 'work'
  if (section === 'extra') return 'extra'
  // reach + places (+ default)
  return 'contact'
}

const DOCUMENT_OWNED_KEYS = new Set<keyof ClientProfileDraft>([
  'passport',
  'passportPlaceOfIssue',
  'passportIssuedOn',
  'passportExpiry',
  'nid',
])

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
  if (!trimmed) return '—'
  if (kind === 'date') return formatDisplayDate(trimmed)
  if (kind === 'subAgent') {
    return (
      subAgentOptions?.find((option) => option.value === trimmed)?.label ??
      trimmed
    )
  }
  return trimmed
}

function fieldCellClass(wide?: boolean, alert?: boolean) {
  return cn(
    'min-w-0 rounded-lg border bg-[color-mix(in_srgb,var(--color-bg)_55%,var(--color-surface))] px-2.5 py-2',
    alert ? 'border-destructive/35' : 'border-border/80',
    wide && 'sm:col-span-2',
  )
}

function FieldControl({
  field,
  value,
  dirty,
  gap,
  error,
  subAgentOptions,
  onBlur,
  onChange,
}: {
  field: WorkspaceField
  value: string
  dirty: boolean
  gap?: ClientInfoGap
  error?: string
  subAgentOptions: { value: string; label: string }[]
  onBlur: () => void
  onChange: (value: string) => void
}) {
  const wrapClass = cn(
    'min-w-0',
    dirty &&
      '[&_input]:border-[var(--color-theme-ink)] [&_button]:border-[var(--color-theme-ink)]',
    gap &&
      '[&_input]:border-[color-mix(in_srgb,var(--color-danger)_55%,var(--color-border))] [&_input]:bg-[color-mix(in_srgb,var(--color-danger)_5%,var(--color-surface))]',
    gap?.blocksProgress && '[&_input]:border-[var(--color-danger)]',
  )

  let control
  if (field.kind === 'gender') {
    control = (
      <Select
        label={field.label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        options={GENDER_OPTIONS}
        error={error}
      />
    )
  } else if (field.kind === 'marital') {
    control = (
      <Select
        label={field.label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        options={MARITAL_OPTIONS}
        error={error}
      />
    )
  } else if (field.kind === 'blood') {
    control = (
      <Select
        label={field.label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        options={BLOOD_GROUP_OPTIONS}
        error={error}
      />
    )
  } else if (field.kind === 'subAgent') {
    control = (
      <Select
        label={field.label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        options={subAgentOptions}
        error={error}
      />
    )
  } else {
    control = (
      <Input
        label={field.label}
        required={field.required}
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
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        error={error}
      />
    )
  }

  return (
    <div className={wrapClass} data-profile-field={field.key}>
      {control}
    </div>
  )
}

function ReadCell({
  fieldKey,
  label,
  value,
  kind,
  wide,
  gap,
  subAgentOptions,
  mono,
  action,
}: {
  fieldKey: string
  label: string
  value: string
  kind?: FieldKind
  wide?: boolean
  gap?: ClientInfoGap
  subAgentOptions?: { value: string; label: string }[]
  mono?: boolean
  action?: ReactNode
}) {
  return (
    <div
      className={fieldCellClass(wide, Boolean(gap))}
      data-profile-field={fieldKey}
    >
      <div className="flex items-center justify-between gap-2">
        <dt className="m-0 text-[0.6875rem] font-medium text-muted-foreground">
          {label}
        </dt>
        {action}
      </div>
      <dd
        className={cn(
          'm-0 mt-1 break-words text-sm font-medium leading-snug text-foreground',
          mono && 'font-mono tracking-wide',
          !value.trim() && 'font-normal text-muted-foreground',
          gap && 'text-destructive',
          gap?.blocksProgress && 'font-semibold',
        )}
      >
        {formatValue(value, kind, subAgentOptions)}
      </dd>
    </div>
  )
}

function SectionPanel({
  groupId,
  fields,
  draft,
  savedDraft,
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
  onOpenDocuments,
}: {
  groupId: ProfileGroupId
  fields: WorkspaceField[]
  draft: ClientProfileDraft
  savedDraft: ClientProfileDraft
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
  onOpenDocuments: (focus?: 'passport' | 'nid') => void
}) {
  const showCustom = groupId === 'extra'

  if (!editing) {
    return (
      <dl
        className="m-0 grid grid-cols-1 gap-2 sm:grid-cols-2"
        id={`client-profile-section-${groupId}`}
      >
        {fields.map((field) => {
          const gap = gapForField(gaps, field.key)
          const raw = String(draft[field.key] ?? '')
          const openDocs =
            field.kind === 'document' ? (
              <Button
                type="button"
                variant="ghost"
                className="h-6 shrink-0 px-1.5 text-[0.6875rem]"
                onClick={() => onOpenDocuments(field.documentFocus)}
              >
                <FileText data-icon="inline-start" />
                Open
              </Button>
            ) : undefined
          return (
            <ReadCell
              key={field.key}
              fieldKey={field.key}
              label={field.label}
              value={raw}
              kind={field.kind}
              wide={field.wide}
              gap={gap}
              subAgentOptions={subAgentOptions}
              mono={field.key === 'passport' || field.key === 'nid'}
              action={openDocs}
            />
          )
        })}
        {showCustom
          ? customFieldDefs.map((field) => (
              <ReadCell
                key={field.id}
                fieldKey={`custom:${field.id}`}
                label={field.label}
                value={draft.customFields[field.id] ?? ''}
              />
            ))
          : null}
      </dl>
    )
  }

  return (
    <div
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      id={`client-profile-section-${groupId}`}
    >
      {fields.map((field) => {
        if (DOCUMENT_OWNED_KEYS.has(field.key) || field.kind === 'document') {
          return (
            <ReadCell
              key={field.key}
              fieldKey={field.key}
              label={field.label}
              value={String(draft[field.key] ?? '')}
              kind={field.kind}
              wide={field.wide}
              gap={gapForField(gaps, field.key)}
              mono={field.key === 'passport' || field.key === 'nid'}
              action={
                field.documentFocus ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-6 shrink-0 px-1.5 text-[0.6875rem]"
                    onClick={() => onOpenDocuments(field.documentFocus)}
                  >
                    <FileText data-icon="inline-start" />
                    Open
                  </Button>
                ) : undefined
              }
            />
          )
        }
        return (
          <div
            key={field.key}
            className={fieldCellClass(
              field.wide,
              Boolean(gapForField(gaps, field.key)),
            )}
          >
            <FieldControl
              field={field}
              value={String(draft[field.key] ?? '')}
              dirty={
                String(draft[field.key] ?? '') !==
                String(savedDraft[field.key] ?? '')
              }
              gap={gapForField(gaps, field.key)}
              error={showError(field.key) ? fieldError(field.key) : undefined}
              subAgentOptions={subAgentOptions}
              onBlur={blur(field.key)}
              onChange={(value) => {
                if (field.kind === 'gender') {
                  onChange('gender', value as ClientGender)
                  return
                }
                onChange(
                  field.key,
                  value as ClientProfileDraft[typeof field.key],
                )
              }}
            />
          </div>
        )
      })}
      {showCustom
        ? customFieldDefs.map((field) => {
            const key = `custom:${field.id}`
            return (
              <div
                key={field.id}
                className={cn(
                  fieldCellClass(),
                  (draft.customFields[field.id] ?? '') !==
                    (savedDraft.customFields[field.id] ?? '') &&
                    '[&_input]:border-[var(--color-theme-ink)] [&_button]:border-[var(--color-theme-ink)]',
                )}
                data-profile-field={key}
              >
                <ClientCustomFieldControl
                  field={field}
                  value={draft.customFields[field.id] ?? ''}
                  error={
                    showError(key) ? customFieldError(field.id) : undefined
                  }
                  onBlur={blur(key)}
                  onChange={(value) => onCustomChange(field.id, value)}
                />
              </div>
            )
          })
        : null}
    </div>
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
  onOpenDocuments,
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
  onOpenDocuments: (focus?: 'passport' | 'nid') => void
  initialSection?: ClientProfileSectionId
  focusField?: keyof ClientProfileDraft
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const isDirty = JSON.stringify(draft) !== JSON.stringify(savedDraft)
  const [editing, setEditing] = useState(Boolean(focusField) || isDirty)
  const [activeGroup, setActiveGroup] = useState<ProfileGroupId>(
    groupFromSection(initialSection),
  )

  const navGroups = useMemo(() => {
    if (customFieldDefs.length === 0) return PROFILE_GROUPS
    return [
      ...PROFILE_GROUPS,
      {
        id: 'extra' as const,
        label: 'Extra',
        icon: Puzzle,
        fields: [] as WorkspaceField[],
      },
    ]
  }, [customFieldDefs.length])

  const gapsForGroup = (group: ProfileGroup) => {
    if (!group.gapIds?.length) return 0
    return gaps.filter((gap) => group.gapIds!.includes(gap.id)).length
  }

  useEffect(() => {
    if (focusField || isDirty) setEditing(true)
  }, [focusField, isDirty])

  useEffect(() => {
    if (initialSection) setActiveGroup(groupFromSection(initialSection))
  }, [initialSection])

  useEffect(() => {
    const target =
      focusField != null
        ? `[data-profile-field="${focusField}"]`
        : `#client-profile-section-${activeGroup}`
    const frame = window.requestAnimationFrame(() => {
      const node = rootRef.current?.querySelector(target)
      if (!(node instanceof HTMLElement)) return
      if (focusField) {
        node.scrollIntoView({ block: 'center', behavior: 'smooth' })
        const input = node.querySelector('input, button, textarea')
        if (input instanceof HTMLElement) input.focus()
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [focusField, activeGroup, editing])

  const handleDiscard = () => {
    onDiscard()
    setEditing(false)
  }

  const handleSave = () => {
    if (onSave()) setEditing(false)
  }

  const activeMeta =
    navGroups.find((group) => group.id === activeGroup) ?? navGroups[0]!
  const ActiveIcon = activeMeta.icon
  const activeFields = activeMeta.fields

  return (
    <section
      ref={rootRef}
      className="grid min-h-[22rem] min-w-0 grid-cols-1 gap-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm md:grid-cols-[minmax(12rem,15rem)_minmax(0,1fr)]"
      aria-label="Client profile editor"
    >
      <aside className="flex min-w-0 flex-col border-b border-border bg-[color-mix(in_srgb,var(--color-surface)_70%,var(--color-bg))] md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <p className="m-0 text-xs font-semibold text-muted-foreground">
            Profile
          </p>
          {gaps.length > 0 ? (
            <Badge variant="destructive" className="h-5 px-1.5 text-[0.625rem]">
              {gaps.length}
            </Badge>
          ) : null}
        </div>
        <nav
          className="flex flex-row gap-1 overflow-x-auto p-2 md:flex-col"
          aria-label="Profile sections"
        >
          {navGroups.map((group) => {
            const selected = group.id === activeGroup
            const Icon = group.icon
            const gapCount = gapsForGroup(group)
            return (
              <button
                key={group.id}
                type="button"
                className={cn(
                  'inline-flex min-w-[10rem] max-w-full items-center gap-2 rounded-lg border border-transparent px-2.5 py-2 text-left text-sm transition-colors md:min-w-0',
                  selected
                    ? 'border-primary/25 bg-primary/10 font-semibold text-foreground'
                    : 'hover:bg-muted',
                )}
                aria-current={selected ? 'true' : undefined}
                aria-label={group.label}
                onClick={() => setActiveGroup(group.id)}
              >
                <span
                  className={cn(
                    'inline-flex size-7 shrink-0 items-center justify-center rounded-md',
                    selected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                  aria-hidden
                >
                  <Icon size={14} strokeWidth={2.25} />
                </span>
                <span className="min-w-0 flex-1 truncate">{group.label}</span>
                {gapCount > 0 ? (
                  <Badge
                    variant={selected ? 'secondary' : 'destructive'}
                    className="h-5 shrink-0 px-1.5 text-[0.625rem]"
                  >
                    {gapCount}
                  </Badge>
                ) : null}
              </button>
            )
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
              aria-hidden
            >
              <ActiveIcon size={14} strokeWidth={2.25} />
            </span>
            <h2 className="m-0 truncate text-sm font-semibold">
              {activeMeta.label}
            </h2>
          </div>
          {editing ? null : (
            <Button
              variant="outline"
              className="h-8 rounded-lg px-3 text-xs"
              onClick={() => setEditing(true)}
            >
              <Pencil data-icon="inline-start" />
              Edit
            </Button>
          )}
        </div>

        <div className="min-w-0 flex-1 bg-[color-mix(in_srgb,var(--color-bg)_35%,transparent)] p-3 sm:p-4">
          <SectionPanel
            groupId={activeGroup}
            fields={activeFields}
            draft={draft}
            savedDraft={savedDraft}
            gaps={gaps}
            editing={editing}
            subAgentOptions={subAgentOptions}
            customFieldDefs={customFieldDefs}
            showError={showError}
            fieldError={fieldError}
            customFieldError={customFieldError}
            blur={blur}
            onChange={onChange}
            onCustomChange={onCustomChange}
            onOpenDocuments={onOpenDocuments}
          />
        </div>

        {editing ? (
          <div className="sticky bottom-0 z-[2] flex items-center gap-2 border-t border-border bg-card/95 px-3 py-2 backdrop-blur-sm sm:px-4">
            <Button
              variant="outline"
              className="h-8 rounded-lg text-xs"
              onClick={handleDiscard}
            >
              {isDirty ? 'Discard Changes' : 'Cancel'}
            </Button>
            <Button
              className="h-8 rounded-lg text-xs"
              onClick={handleSave}
              disabled={!isDirty}
            >
              <Check size={14} strokeWidth={2.25} aria-hidden />
              Save
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
