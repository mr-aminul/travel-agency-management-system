import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import {
  Briefcase,
  Check,
  MapPinned,
  Pencil,
  Phone,
  Sparkles,
  UserRound,
  Users,
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
import { Card, CardContent } from '@/components/shadcn/card'
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
}

type ProfileGroupId = ClientProfileSectionId

type ProfileGroup = {
  id: ProfileGroupId
  label: string
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  fields: WorkspaceField[]
  gapIds?: Array<ClientInfoGap['id']>
}

const PROFILE_GROUPS: ProfileGroup[] = [
  {
    id: 'identity',
    label: 'Personal',
    icon: UserRound,
    fields: [
      { key: 'name', label: 'Full Name', required: true },
      { key: 'banglaName', label: 'Bangla Name' },
      { key: 'dateOfBirth', label: 'Date of Birth', kind: 'date' },
      { key: 'gender', label: 'Gender', kind: 'gender' },
      { key: 'nationality', label: 'Nationality' },
      { key: 'placeOfBirth', label: 'Place of Birth' },
      { key: 'bloodGroup', label: 'Blood Group', kind: 'blood' },
    ],
  },
  {
    id: 'contact',
    label: 'Contact',
    icon: Phone,
    gapIds: ['email', 'address'],
    fields: [
      { key: 'phone', label: 'Mobile Number', kind: 'tel', required: true },
      { key: 'whatsapp', label: 'WhatsApp', kind: 'tel' },
      { key: 'email', label: 'Email', kind: 'email' },
      { key: 'presentAddress', label: 'Present Address', wide: true },
      { key: 'permanentAddress', label: 'Permanent Address', wide: true },
      { key: 'district', label: 'District' },
      { key: 'upazila', label: 'Upazila' },
    ],
  },
  {
    id: 'family',
    label: 'Family',
    icon: Users,
    fields: [
      { key: 'fatherName', label: 'Father Name' },
      { key: 'motherName', label: 'Mother Name' },
      { key: 'maritalStatus', label: 'Marital Status', kind: 'marital' },
      { key: 'spouseName', label: 'Spouse Name' },
    ],
  },
  {
    id: 'work',
    label: 'Work',
    icon: Briefcase,
    fields: [
      { key: 'profession', label: 'Profession' },
      { key: 'education', label: 'Education' },
    ],
  },
]

function groupFromSection(
  section?: ClientProfileSectionId,
): ProfileGroupId {
  if (section && PROFILE_GROUPS.some((group) => group.id === section)) {
    return section
  }
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

type GridColumns = 2 | 3 | 4

/** Addresses share a row. The first wide field starts that row so it does not leave a hole. */
function spanClass(
  wide: boolean | undefined,
  columns: GridColumns,
  startRow = false,
) {
  if (!wide) return undefined
  if (columns === 4) {
    return startRow ? 'sm:col-span-2 sm:col-start-1' : 'sm:col-span-2'
  }
  if (columns === 3) return 'sm:col-span-3'
  return 'sm:col-span-2'
}

function startsWideRow(
  fields: Array<{ wide?: boolean }>,
  index: number,
) {
  const field = fields[index]
  if (!field?.wide) return false
  return !fields[index - 1]?.wide
}

/**
 * Full-width sections: 4 readable columns at rest, 3 while editing.
 */
function columnsForGroup(fieldCount: number, editing: boolean): GridColumns {
  if (fieldCount <= 2) return 2
  if (editing) return 3
  return 4
}

function gridClass(columns: GridColumns, editing: boolean) {
  return cn(
    'm-0 grid grid-cols-1 sm:grid-cols-2',
    columns === 4 && 'lg:grid-cols-4',
    columns === 3 && 'lg:grid-cols-3',
    editing ? 'gap-x-4 gap-y-3' : 'gap-x-6 gap-y-3.5',
  )
}

function SectionIcon({
  icon: Icon,
}: {
  icon: ProfileGroup['icon']
}) {
  return (
    <span
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]"
      aria-hidden
    >
      <Icon size={14} strokeWidth={2.25} />
    </span>
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
        compact
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
        compact
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
        compact
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
        compact
      />
    )
  } else {
    control = (
      <Input
        label={field.label}
        required={field.required}
        compact
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

function valueHref(kind: FieldKind | undefined, raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  if (kind === 'email') return `mailto:${trimmed}`
  if (kind === 'tel') {
    const digits = trimmed.replace(/[^\d+]/g, '')
    return digits ? `tel:${digits}` : undefined
  }
  return undefined
}

function ReadCell({
  fieldKey,
  label,
  value,
  kind,
  wide,
  columns,
  startRow,
  gap,
  subAgentOptions,
}: {
  fieldKey: string
  label: string
  value: string
  kind?: FieldKind
  wide?: boolean
  columns: GridColumns
  startRow?: boolean
  gap?: ClientInfoGap
  subAgentOptions?: { value: string; label: string }[]
}) {
  const display = formatValue(value, kind, subAgentOptions)
  const empty = !display
  const href = empty ? undefined : valueHref(kind, value)

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1',
        gap &&
          'rounded-lg bg-[color-mix(in_srgb,var(--color-danger)_6%,transparent)] px-2 py-1.5 -mx-2',
        spanClass(wide, columns, startRow),
      )}
      data-profile-field={fieldKey}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <dt className="m-0 text-xs font-medium text-muted-foreground">
          {label}
        </dt>
        {gap ? (
          <Badge
            variant="outline"
            className="h-4 shrink-0 border-destructive/30 bg-destructive/10 px-1.5 text-[0.625rem] font-medium text-destructive"
          >
            Needed
          </Badge>
        ) : null}
      </div>
      <dd
        className={cn(
          'm-0 min-w-0 text-sm leading-5',
          empty
            ? 'text-muted-foreground/40'
            : 'font-medium text-foreground',
          !empty &&
            (kind === 'email' || kind === 'tel' ? 'break-all' : 'break-words'),
        )}
      >
        {empty ? (
          '—'
        ) : href ? (
          <a href={href} className="underline-offset-2 hover:underline">
            {display}
          </a>
        ) : (
          display
        )}
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
}) {
  const customForGroup = customFieldDefs.filter(
    (field) => field.section === groupId,
  )
  const totalFields = fields.length + customForGroup.length
  const columns = columnsForGroup(totalFields, editing)
  const layoutClass = gridClass(columns, editing)

  if (!editing) {
    return (
      <dl className={layoutClass} id={`client-profile-section-${groupId}`}>
        {fields.map((field, index) => (
          <ReadCell
            key={field.key}
            fieldKey={field.key}
            label={field.label}
            value={String(draft[field.key] ?? '')}
            kind={field.kind}
            wide={field.wide}
            columns={columns}
            startRow={startsWideRow(fields, index)}
            gap={gapForField(gaps, field.key)}
            subAgentOptions={subAgentOptions}
          />
        ))}
        {customForGroup.map((field) => (
          <ReadCell
            key={field.id}
            fieldKey={`custom:${field.id}`}
            label={field.label}
            value={draft.customFields[field.id] ?? ''}
            columns={columns}
          />
        ))}
      </dl>
    )
  }

  return (
    <div className={layoutClass} id={`client-profile-section-${groupId}`}>
      {fields.map((field, index) => (
        <div
          key={field.key}
          className={cn(
            'min-w-0',
            spanClass(field.wide, columns, startsWideRow(fields, index)),
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
                onChange('gender', value as ClientGender | '')
                return
              }
              onChange(
                field.key,
                value as ClientProfileDraft[typeof field.key],
              )
            }}
          />
        </div>
      ))}
      {customForGroup.map((field) => {
        const key = `custom:${field.id}`
        const dirty =
          (draft.customFields[field.id] ?? '') !==
          (savedDraft.customFields[field.id] ?? '')
        return (
          <div
            key={field.id}
            className={cn(
              'min-w-0',
              dirty &&
              '[&_input]:border-[var(--color-theme-ink)] [&_button]:border-[var(--color-theme-ink)]',
            )}
            data-profile-field={key}
          >
            <ClientCustomFieldControl
              field={field}
              value={draft.customFields[field.id] ?? ''}
              error={showError(key) ? customFieldError(field.id) : undefined}
              onBlur={blur(key)}
              onChange={(value) => onCustomChange(field.id, value)}
            />
          </div>
        )
      })}
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

  const gapsForGroup = (group: ProfileGroup) => {
    if (!group.gapIds?.length) return 0
    return gaps.filter((gap) => group.gapIds!.includes(gap.id)).length
  }

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
  }, [focusField, initialSection, editing])

  const handleDiscard = () => {
    onDiscard()
    setEditing(false)
  }

  const handleSave = () => {
    if (onSave()) setEditing(false)
  }

  return (
    <div
      ref={rootRef}
      className="flex min-w-0 flex-col gap-2"
      aria-label="Client profile editor"
    >
      <Card size="sm" className="gap-0 py-0 shadow-sm ring-border/60">
        <CardContent className="flex flex-col gap-0 p-0">
          {groups.map((group, index) => {
            const gapCount = gapsForGroup(group)
            const isFirst = index === 0
            return (
              <section
                key={group.id}
                className={cn(
                  'px-4 py-3.5 sm:px-5 sm:py-4',
                  index > 0 && 'border-t border-border',
                )}
                aria-label={group.label}
              >
                <header className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <SectionIcon icon={group.icon} />
                    <h3 className="m-0 text-sm font-semibold tracking-tight text-foreground">
                      {group.label}
                    </h3>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {gapCount > 0 ? (
                      <Badge
                        variant="outline"
                        className="h-5 border-destructive/30 bg-destructive/10 px-1.5 tabular-nums text-[0.625rem] text-destructive"
                      >
                        {gapCount} needed
                      </Badge>
                    ) : null}
                    {isFirst && gaps.length > 0 ? (
                      <Badge
                        variant="secondary"
                        className="h-5 tabular-nums text-[0.625rem]"
                      >
                        {gaps.length} missing
                      </Badge>
                    ) : null}
                    {isFirst && !editing ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 rounded-lg px-2.5 text-xs"
                        onClick={() => setEditing(true)}
                      >
                        <Pencil size={13} strokeWidth={2.25} />
                        Edit
                      </Button>
                    ) : null}
                  </div>
                </header>
                <SectionPanel
                  groupId={group.id}
                  fields={group.fields}
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
                />
              </section>
            )
          })}
        </CardContent>
      </Card>

      {editing ? (
        <div className="sticky bottom-0 z-[2] flex items-center justify-end gap-2 rounded-xl border border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur-sm">
          <Button
            variant="outline"
            className="h-8 rounded-lg text-xs"
            onClick={handleDiscard}
          >
            {isDirty ? 'Discard' : 'Cancel'}
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
  )
}
