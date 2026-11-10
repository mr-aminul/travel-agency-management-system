import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'
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
import {
  BLOOD_GROUP_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_OPTIONS,
  PROFILE_GAP_FIELD,
  type ClientProfileDraft,
  type ClientProfileSectionId,
} from '@/components/clients/clientProfileDraft'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/shadcn/accordion'
import { Button } from '@/components/shadcn/button'
import { Card, CardContent } from '@/components/shadcn/card'
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
      { key: 'subAgentId', label: 'Sub Agent', kind: 'subAgent' },
      { key: 'presentAddress', label: 'Present Address' },
      { key: 'permanentAddress', label: 'Permanent Address' },
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
      { key: 'skillTrade', label: 'Skill / Trade' },
      { key: 'experience', label: 'Experience' },
      { key: 'previousOverseasExp', label: 'Overseas Experience' },
      { key: 'preferredCountry', label: 'Preferred Country' },
      { key: 'preferredJob', label: 'Preferred Job' },
      { key: 'expectedSalary', label: 'Expected Salary' },
      { key: 'branch', label: 'Branch' },
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

/** Sections staff need most often — stay open by default. */
const PRIMARY_OPEN_IDS: ProfileGroupId[] = ['identity', 'contact']

const cellControlClass =
  'h-auto w-full min-w-0 cursor-text border-0 bg-transparent p-0 text-[0.8125rem] font-medium leading-tight text-foreground shadow-none outline-none ring-0 focus-visible:ring-0 disabled:cursor-default'

function defaultOpenSections(
  groups: ProfileGroup[],
  gaps: ClientInfoGap[],
  initialSection?: ClientProfileSectionId,
  editing = false,
): string[] {
  if (editing) return groups.map((group) => group.id)
  const open = new Set<string>(PRIMARY_OPEN_IDS)
  if (initialSection) open.add(groupFromSection(initialSection))
  for (const group of groups) {
    if (!group.gapIds?.length) continue
    if (gaps.some((gap) => group.gapIds!.includes(gap.id))) {
      open.add(group.id)
    }
  }
  return groups.map((group) => group.id).filter((id) => open.has(id))
}

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
            'h-auto min-h-0 w-full min-w-0 justify-between gap-1.5 rounded-sm border-0 bg-transparent px-0 py-0 text-[0.8125rem] font-medium leading-tight shadow-none outline-none focus-visible:border-0 focus-visible:ring-0 data-[size=sm]:h-auto data-[size=sm]:rounded-sm dark:bg-transparent dark:hover:bg-transparent [&_svg]:size-3.5',
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
        'inline-block min-w-0 text-[0.8125rem] leading-tight',
        empty && 'font-normal text-muted-foreground/70',
        !empty && !gap && 'font-medium text-foreground',
        gap && 'font-medium text-destructive',
        !empty && 'break-words',
      )}
    >
      {empty ? null : display}
    </span>
  )
}

type ReadEntry = {
  key: string
  label: string
  value: string
  kind?: FieldKind
  wide?: boolean
  gap?: ClientInfoGap
  required?: boolean
  workspaceField?: WorkspaceField
  customId?: string
}

const READ_COLUMNS = 3

function chunkReadEntries(
  entries: ReadEntry[],
  columns = READ_COLUMNS,
): ReadEntry[][] {
  const rows: ReadEntry[][] = []
  let index = 0
  while (index < entries.length) {
    const entry = entries[index]!
    if (entry.wide) {
      rows.push([entry])
      index += 1
      continue
    }
    const row: ReadEntry[] = [entry]
    index += 1
    while (row.length < columns && index < entries.length) {
      const next = entries[index]!
      if (next.wide) break
      row.push(next)
      index += 1
    }
    rows.push(row)
  }
  return rows
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
}): ReactNode {
  const customForGroup = customFieldDefs.filter(
    (field) => field.section === groupId,
  )
  const entries: ReadEntry[] = [
    ...fields.map((field) => ({
      key: field.key,
      label: field.label,
      value: String(draft[field.key] ?? ''),
      kind: field.kind,
      wide: field.wide,
      gap: gapForField(gaps, field.key),
      required: field.required,
      workspaceField: field,
    })),
    ...customForGroup.map((field) => ({
      key: `custom:${field.id}`,
      label: field.label,
      value: draft.customFields[field.id] ?? '',
      customId: field.id,
      required: field.required,
    })),
  ]
  const rows = chunkReadEntries(entries)

  return (
    <div
      className="overflow-x-auto border-t border-border bg-[color-mix(in_srgb,var(--color-theme)_5%,white)]"
      id={`client-profile-section-${groupId}`}
    >
      <table className="w-full border-collapse text-left">
        <tbody>
          {rows.map((row) => {
            const full = row.length === 1 && row[0]?.wide
            const emptySlots = full ? 0 : READ_COLUMNS - row.length
            return (
              <tr
                key={row.map((entry) => entry.key).join('-')}
                className="border-b border-border last:border-b-0"
              >
                {row.map((entry, columnIndex) => {
                  const workspaceField =
                    entry.workspaceField ??
                    ({
                      key: 'name',
                      label: entry.label,
                      kind: 'text' as const,
                    } satisfies WorkspaceField)
                  const isCustom = Boolean(entry.customId)
                  const rawError = isCustom
                    ? customFieldError(entry.customId!)
                    : fieldError(entry.key as keyof ClientProfileDraft)
                  // Show format errors once the cell has a value; required-empty
                  // uses missingRequired (and showError after a failed save).
                  const error =
                    rawError &&
                    (showError(entry.key) || Boolean(entry.value.trim()))
                      ? rawError
                      : undefined
                  const dirty = isCustom
                    ? entry.value !==
                      (savedDraft.customFields[entry.customId!] ?? '')
                    : entry.value !==
                      String(
                        savedDraft[entry.key as keyof ClientProfileDraft] ??
                          '',
                      )
                  const missingRequired =
                    Boolean(entry.required) && !entry.value.trim()
                  const showMissing = missingRequired || Boolean(error)

                  return (
                    <Fragment key={entry.key}>
                      <th
                        scope="row"
                        className={cn(
                          'w-0 whitespace-nowrap bg-transparent px-3 py-1.5 text-left align-middle text-xs font-medium text-muted-foreground',
                          columnIndex > 0 && 'border-l border-border/40',
                        )}
                      >
                        {entry.label}
                      </th>
                      <td
                        className={cn(
                          'min-w-[8rem] border-l p-0 align-middle',
                          showMissing
                            ? 'border-l-destructive/50 bg-destructive/15'
                            : 'border-l-border/30 bg-white dark:bg-card',
                          editing &&
                            dirty &&
                            !showMissing &&
                            'bg-[color-mix(in_srgb,var(--color-theme)_6%,white)] dark:bg-[color-mix(in_srgb,var(--color-theme)_10%,var(--color-card))]',
                        )}
                        colSpan={full ? READ_COLUMNS * 2 - 1 : undefined}
                        data-profile-field={entry.key}
                        data-invalid={showMissing ? 'true' : undefined}
                        title={error || undefined}
                      >
                        <div
                          className={cn(
                            'flex min-h-8 items-center px-3 py-1.5',
                            showMissing && 'h-full w-full',
                          )}
                        >
                          {editing ? (
                            isCustom ? (
                              <input
                                aria-label={entry.label}
                                className={cn(
                                  cellControlClass,
                                  showMissing && 'text-destructive',
                                )}
                                value={entry.value}
                                onBlur={blur(entry.key)}
                                onChange={(event) =>
                                  onCustomChange(
                                    entry.customId!,
                                    event.target.value,
                                  )
                                }
                              />
                            ) : (
                              <CellControl
                                field={workspaceField}
                                value={entry.value}
                                error={
                                  error ??
                                  (missingRequired ? 'Required' : undefined)
                                }
                                subAgentOptions={subAgentOptions}
                                onBlur={blur(entry.key)}
                                onChange={(value) => {
                                  if (workspaceField.kind === 'gender') {
                                    onChange(
                                      'gender',
                                      value as ClientGender | '',
                                    )
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
                        </div>
                      </td>
                    </Fragment>
                  )
                })}
                {Array.from({ length: emptySlots }, (_, index) => (
                  <Fragment key={`pad-${index}`}>
                    <th
                      className="w-0 border-l border-border/40 bg-transparent px-3 py-1.5"
                      aria-hidden
                    />
                    <td
                      className="min-w-[8rem] border-l border-border/30 bg-white p-0 dark:bg-card"
                      aria-hidden
                    >
                      <div className="min-h-8 px-3 py-1.5" />
                    </td>
                  </Fragment>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
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

  const [openSections, setOpenSections] = useState<string[]>(() =>
    defaultOpenSections(
      PROFILE_GROUPS,
      gaps,
      initialSection,
      Boolean(focusField) || isDirty,
    ),
  )

  useEffect(() => {
    if (focusField || isDirty) setEditing(true)
  }, [focusField, isDirty])

  const editingRef = useRef(editing)
  useEffect(() => {
    if (editingRef.current === editing) return
    editingRef.current = editing
    setOpenSections(
      defaultOpenSections(groups, gaps, initialSection, editing),
    )
  }, [editing, groups, gaps, initialSection])

  useEffect(() => {
    const target =
      focusField != null
        ? `[data-profile-field="${focusField}"]`
        : initialSection
          ? `#client-profile-section-${groupFromSection(initialSection)}`
          : null
    if (!target) return
    const focusGroup = focusField
      ? groups.find((group) =>
          group.fields.some((field) => field.key === focusField),
        )?.id
      : initialSection
        ? groupFromSection(initialSection)
        : null
    if (focusGroup) {
      setOpenSections((current) =>
        current.includes(focusGroup) ? current : [...current, focusGroup],
      )
    }
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
      const sectionId = invalid.closest('[id^="client-profile-section-"]')?.id
      const groupId = sectionId?.replace('client-profile-section-', '')
      if (groupId) {
        setOpenSections((current) =>
          current.includes(groupId) ? current : [...current, groupId],
        )
      }
      invalid.scrollIntoView({ block: 'center', behavior: 'smooth' })
      const input = invalid.querySelector('input, select, textarea')
      if (input instanceof HTMLElement) input.focus()
    })
  }

  return (
    <div
      ref={rootRef}
      className="flex min-w-0 flex-col gap-2"
      aria-label="Client profile"
    >
      <Card size="sm" className="gap-0 overflow-hidden py-0 shadow-sm ring-border/60">
        <CardContent className="p-0">
          <Accordion
            type="multiple"
            value={openSections}
            onValueChange={setOpenSections}
          >
            {groups.map((group) => {
              const Icon = group.icon
              return (
                <AccordionItem
                  key={group.id}
                  value={group.id}
                  className="border-border"
                >
                  <AccordionTrigger className="rounded-none bg-card px-3.5 py-2.5 text-sm font-semibold tracking-tight transition-colors hover:bg-muted/40 hover:no-underline">
                    <span className="flex min-w-0 flex-1 items-center gap-2.5 pr-2">
                      <span
                        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover/accordion-trigger:text-foreground"
                        aria-hidden
                      >
                        <Icon size={14} strokeWidth={2.25} />
                      </span>
                      <span className="truncate">{group.label}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
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
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </CardContent>
      </Card>

      <div className="flex items-center justify-start gap-2 pt-1">
        {editing ? (
          <>
            <Button
              variant="outline"
              className="h-8 rounded-md bg-white text-xs hover:bg-white dark:bg-card dark:hover:bg-card"
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
