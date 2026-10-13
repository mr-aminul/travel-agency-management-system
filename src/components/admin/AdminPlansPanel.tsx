import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import {
  adminCreatePlan,
  adminDeletePlan,
  adminListPlans,
  adminUpdatePlan,
  type AdminPlanInput,
} from '@/lib/billing/billingApi'
import { formatBdt, formatStorageBytes } from '@/lib/billing/format'
import { authApiConfigured } from '@/lib/billing/platformFlag'
import {
  PLAN_CATALOG,
  planBadge,
  planHighlights,
  planIsHighlighted,
} from '@/lib/billing/planCatalog'
import { cx } from '@/lib/cx'
import { MODULE_GROUPS } from '@/lib/modules'
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  Input,
  Select,
  SideDrawer,
  Switch,
  Textarea,
} from '@/components/ui'
import type { PlanTemplate } from '@/types/billing'
import type { ModuleId } from '@/types/tenant'
import '@/styles/layout-billing.css'

const MB = 1024 ** 2
const GB = 1024 ** 3
const TRIAL_PLAN_ID = 'growth'

type StorageUnit = 'MB' | 'GB'
type EditorMode = 'create' | 'edit'

type PlanDraft = {
  id: string
  name: string
  description: string
  priceBdt: string
  interval: 'month' | 'year'
  sortOrder: number
  userLimit: string
  subAgentLimit: string
  storageValue: string
  storageUnit: StorageUnit
  smsLimit: string
  smsOverageBdt: string
  isPublic: boolean
  isActive: boolean
  isTest: boolean
  isHighlighted: boolean
  badge: string
  ctaLabel: string
  marketingBullets: string
  modules: ModuleId[]
}

const defaultModules: ModuleId[] = MODULE_GROUPS.flatMap((group) =>
  group.id === 'hr' || group.id === 'subAgents'
    ? []
    : group.modules.map((m) => m.id),
)

function storageFromBytes(bytes: number): {
  storageValue: string
  storageUnit: StorageUnit
} {
  if (Number.isFinite(bytes) && bytes > 0 && bytes < GB) {
    return {
      storageUnit: 'MB',
      storageValue: String(Math.round(bytes / MB)),
    }
  }
  const gb = Number.isFinite(bytes) ? bytes / GB : 0
  return {
    storageUnit: 'GB',
    storageValue: String(Math.round(gb * 100) / 100),
  }
}

function bytesFromStorage(value: string, unit: StorageUnit): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) {
    throw new Error('Storage must be 0 or more.')
  }
  return Math.round(n * (unit === 'MB' ? MB : GB))
}

function emptyDraft(seedModules: ModuleId[], nextSort: number): PlanDraft {
  return {
    id: '',
    name: '',
    description: '',
    priceBdt: '0',
    interval: 'month',
    sortOrder: nextSort,
    userLimit: '5',
    subAgentLimit: '0',
    storageValue: '10',
    storageUnit: 'GB',
    smsLimit: '300',
    smsOverageBdt: '0.5',
    isPublic: true,
    isActive: true,
    isTest: false,
    isHighlighted: false,
    badge: '',
    ctaLabel: '',
    marketingBullets: '',
    modules: seedModules,
  }
}

function draftFromPlan(plan: PlanTemplate): PlanDraft {
  const storage = storageFromBytes(plan.storageLimitBytes)
  const bullets = Array.isArray(plan.features?.marketingBullets)
    ? plan.features.marketingBullets.map(String).join('\n')
    : ''
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description ?? '',
    priceBdt: String(plan.priceBdt),
    interval: plan.interval === 'year' ? 'year' : 'month',
    sortOrder: plan.sortOrder,
    userLimit: String(plan.userLimit),
    subAgentLimit: String(plan.subAgentLimit),
    storageValue: storage.storageValue,
    storageUnit: storage.storageUnit,
    smsLimit: String(plan.smsLimit),
    smsOverageBdt: String(plan.smsOverageBdt),
    isPublic: plan.isPublic !== false,
    isActive: plan.isActive !== false,
    isTest: Boolean(plan.features?.isTest) || plan.id === 'test',
    isHighlighted: planIsHighlighted(plan),
    badge: planBadge(plan) ?? '',
    ctaLabel:
      typeof plan.features?.ctaLabel === 'string' ? plan.features.ctaLabel : '',
    marketingBullets: bullets,
    modules: (plan.modules ?? []) as ModuleId[],
  }
}

function slugifyPlanId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

function parseNonNeg(raw: string, label: string): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${label} must be 0 or more.`)
  }
  return n
}

function draftToPayload(draft: PlanDraft): AdminPlanInput {
  const name = draft.name.trim()
  if (!name) throw new Error('Name is required.')
  const marketingBullets = draft.marketingBullets
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return {
    name,
    description: draft.description,
    priceBdt: Math.round(parseNonNeg(draft.priceBdt, 'Amount')),
    currency: 'BDT',
    interval: draft.interval,
    userLimit: Math.round(parseNonNeg(draft.userLimit, 'User limit')),
    subAgentLimit: Math.round(
      parseNonNeg(draft.subAgentLimit, 'Sub agent limit'),
    ),
    storageLimitBytes: bytesFromStorage(draft.storageValue, draft.storageUnit),
    smsLimit: Math.round(parseNonNeg(draft.smsLimit, 'SMS limit')),
    smsOverageBdt: parseNonNeg(draft.smsOverageBdt, 'SMS overage'),
    sortOrder: draft.sortOrder,
    isPublic: draft.isPublic,
    isActive: draft.isActive,
    modules: draft.modules,
    features: {
      label: name,
      isTest: draft.isTest,
      isHighlighted: draft.isHighlighted,
      badge: draft.badge.trim(),
      ctaLabel: draft.ctaLabel.trim(),
      marketingBullets,
    },
  }
}

function convertStorageValue(
  value: string,
  from: StorageUnit,
  to: StorageUnit,
): string {
  if (from === to) return value
  try {
    const bytes = bytesFromStorage(value, from)
    if (to === 'MB') return String(Math.round(bytes / MB))
    return String(Math.round((bytes / GB) * 100) / 100)
  } catch {
    return value
  }
}

export function AdminPlansPanel() {
  const formId = useId()
  const [plans, setPlans] = useState<PlanTemplate[]>(PLAN_CATALOG)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<EditorMode>('create')
  const [draft, setDraft] = useState<PlanDraft>(() =>
    emptyDraft(defaultModules, 100),
  )
  const [idTouched, setIdTouched] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PlanTemplate | null>(null)

  const apiReady = authApiConfigured()

  const reload = useCallback(async () => {
    if (!apiReady) {
      setPlans(PLAN_CATALOG)
      return
    }
    setError(null)
    try {
      const { plans: next } = await adminListPlans()
      setPlans(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load plans.')
    }
  }, [apiReady])

  useEffect(() => {
    void reload()
  }, [reload])

  const sortedPlans = useMemo(
    () =>
      [...plans].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      ),
    [plans],
  )

  const openCreate = () => {
    const nextSort =
      sortedPlans.reduce((max, plan) => Math.max(max, plan.sortOrder), 0) + 10
    setEditorMode('create')
    setDraft(emptyDraft(defaultModules, nextSort))
    setIdTouched(false)
    setError(null)
    setStatus(null)
    setEditorOpen(true)
  }

  const openEdit = (plan: PlanTemplate) => {
    setEditorMode('edit')
    setDraft(draftFromPlan(plan))
    setIdTouched(true)
    setError(null)
    setStatus(null)
    setEditorOpen(true)
  }

  const closeEditor = () => {
    if (saving) return
    setEditorOpen(false)
  }

  const patchDraft = <K extends keyof PlanDraft>(key: K, value: PlanDraft[K]) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'name' && editorMode === 'create' && !idTouched) {
        next.id = slugifyPlanId(String(value))
      }
      return next
    })
  }

  const toggleModule = (moduleId: ModuleId, enabled: boolean) => {
    setDraft((prev) => {
      const set = new Set(prev.modules)
      if (enabled) set.add(moduleId)
      else set.delete(moduleId)
      return { ...prev, modules: [...set] }
    })
  }

  const changeStorageUnit = (nextUnit: StorageUnit) => {
    setDraft((prev) => {
      if (prev.storageUnit === nextUnit) return prev
      return {
        ...prev,
        storageUnit: nextUnit,
        storageValue: convertStorageValue(
          prev.storageValue,
          prev.storageUnit,
          nextUnit,
        ),
      }
    })
  }

  const savePlan = async () => {
    if (!apiReady) {
      setError('Connect the platform API to manage plans.')
      return
    }
    setSaving(true)
    setError(null)
    setStatus(null)
    try {
      const payload = draftToPayload(draft)
      if (editorMode === 'create') {
        const id = slugifyPlanId(draft.id || draft.name)
        if (!id || !/^[a-z][a-z0-9_-]{1,63}$/.test(id)) {
          throw new Error(
            'Plan id must start with a letter and use a-z, 0-9, _ or -.',
          )
        }
        await adminCreatePlan({ ...payload, id })
        setStatus(`Created ${payload.name}.`)
      } else {
        await adminUpdatePlan(draft.id, payload)
        setStatus(`Saved ${payload.name}.`)
      }
      setEditorOpen(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save plan.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (plan: PlanTemplate) => {
    if (!apiReady) return
    setBusyId(plan.id)
    setError(null)
    setStatus(null)
    try {
      const next = !(plan.isActive !== false)
      await adminUpdatePlan(plan.id, { isActive: next })
      setStatus(next ? `Published ${plan.name}.` : `Hidden ${plan.name}.`)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update plan.')
    } finally {
      setBusyId(null)
    }
  }

  const movePlan = async (plan: PlanTemplate, direction: -1 | 1) => {
    if (!apiReady) return
    const index = sortedPlans.findIndex((item) => item.id === plan.id)
    const neighbor = sortedPlans[index + direction]
    if (!neighbor) return
    setBusyId(plan.id)
    setError(null)
    try {
      await Promise.all([
        adminUpdatePlan(plan.id, { sortOrder: neighbor.sortOrder }),
        adminUpdatePlan(neighbor.id, { sortOrder: plan.sortOrder }),
      ])
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reorder plans.')
    } finally {
      setBusyId(null)
    }
  }

  const confirmDelete = async () => {
    const plan = pendingDelete
    setPendingDelete(null)
    if (!plan || !apiReady) return
    setBusyId(plan.id)
    setError(null)
    setStatus(null)
    try {
      if (plan.isActive !== false) {
        await adminDeletePlan(plan.id, false)
        setStatus(`Hidden ${plan.name}.`)
      } else {
        await adminDeletePlan(plan.id, true)
        setStatus(`Deleted ${plan.name}.`)
      }
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete plan.')
    } finally {
      setBusyId(null)
    }
  }

  const anyBusy = busyId != null || saving

  return (
    <section className="pd-admin__panel" aria-label="Subscription plans">
      <div className="pd-admin__panel-toolbar">
        <h2 className="pd-admin__panel-title">Subscription plans</h2>
        <Button size="sm" disabled={!apiReady || anyBusy} onClick={openCreate}>
          <Plus size={16} strokeWidth={2.2} aria-hidden />
          New plan
        </Button>
      </div>

      {!apiReady ? (
        <p className="pd-admin__quiet">Connect the platform API to manage plans.</p>
      ) : null}

      {error ? (
        <p
          className="pd-settings-form__status pd-settings-form__status--error"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="pd-settings-form__status" role="status">
          {status}
        </p>
      ) : null}

      {sortedPlans.length === 0 ? (
        <p className="pd-admin__quiet">No plans yet.</p>
      ) : (
        <ul className="pd-billing-admin__catalog">
          {sortedPlans.map((plan, index) => {
            const live = plan.isActive !== false
            const highlighted = planIsHighlighted(plan)
            const isTest =
              plan.id === 'test' || Boolean(plan.features?.isTest)
            const badge = planBadge(plan)
            const intervalLabel = plan.interval === 'year' ? 'year' : 'month'
            return (
              <li key={plan.id}>
                <article
                  className={cx(
                    'pd-billing__plan',
                    'pd-billing-admin__card',
                    highlighted && 'is-featured',
                    !live && 'is-hidden',
                  )}
                >
                  <div className="pd-billing-admin__card-top">
                    <div className="pd-billing__plan-head">
                      <h3 className="pd-billing__plan-title">
                        {plan.name}
                        {highlighted ? (
                          <Sparkles
                            className="pd-billing-admin__spark"
                            size={14}
                            strokeWidth={2.2}
                            aria-label="Highlighted"
                          />
                        ) : null}
                      </h3>
                      <p className="pd-billing__plan-price">
                        {formatBdt(plan.priceBdt)} <span>/ {intervalLabel}</span>
                      </p>
                    </div>
                    <Badge variant={live ? 'completed' : 'neutral'}>
                      {live ? 'Live' : 'Hidden'}
                    </Badge>
                  </div>

                  {plan.description ? (
                    <p className="pd-billing__plan-desc">{plan.description}</p>
                  ) : null}

                  <ul className="pd-billing__plan-list">
                    {planHighlights(plan)
                      .slice(0, 4)
                      .map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                  </ul>

                  <div className="pd-billing-admin__card-meta">
                    <span>
                      {plan.userLimit} users · {plan.subAgentLimit} sub agents ·{' '}
                      {formatStorageBytes(plan.storageLimitBytes, 0)} ·{' '}
                      {plan.smsLimit.toLocaleString('en-BD')} SMS
                    </span>
                    <div className="pd-billing-admin__badges">
                      {badge ? <Badge variant="completed">{badge}</Badge> : null}
                      {isTest ? <Badge variant="pending">Test</Badge> : null}
                      {plan.isPublic === false ? (
                        <Badge variant="neutral">Private</Badge>
                      ) : null}
                      <span className="pd-billing-admin__plan-id">{plan.id}</span>
                    </div>
                  </div>

                  <div className="pd-billing-admin__card-actions">
                    <div className="pd-billing-admin__card-reorder">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Move ${plan.name} up`}
                        disabled={!apiReady || anyBusy || index === 0}
                        onClick={() => void movePlan(plan, -1)}
                      >
                        <ArrowUp size={16} strokeWidth={2.1} aria-hidden />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Move ${plan.name} down`}
                        disabled={
                          !apiReady ||
                          anyBusy ||
                          index === sortedPlans.length - 1
                        }
                        onClick={() => void movePlan(plan, 1)}
                      >
                        <ArrowDown size={16} strokeWidth={2.1} aria-hidden />
                      </Button>
                    </div>
                    <div className="pd-billing-admin__card-tools">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!apiReady || anyBusy}
                        onClick={() => void toggleActive(plan)}
                      >
                        {live ? 'Hide' : 'Publish'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Edit ${plan.name}`}
                        disabled={!apiReady || anyBusy}
                        onClick={() => openEdit(plan)}
                      >
                        <Pencil size={16} strokeWidth={2.1} aria-hidden />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Delete ${plan.name}`}
                        disabled={
                          !apiReady ||
                          anyBusy ||
                          (plan.id === TRIAL_PLAN_ID && !live)
                        }
                        onClick={() => setPendingDelete(plan)}
                      >
                        <Trash2 size={16} strokeWidth={2.1} aria-hidden />
                      </Button>
                    </div>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}

      <SideDrawer
        open={editorOpen}
        onClose={closeEditor}
        title={editorMode === 'create' ? 'New plan' : 'Edit plan'}
        footer={
          <>
            <Button variant="secondary" onClick={closeEditor} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={saving || !apiReady}>
              {saving
                ? 'Saving…'
                : editorMode === 'create'
                  ? 'Create plan'
                  : 'Save plan'}
            </Button>
          </>
        }
      >
        <form
          id={formId}
          className="pd-admin__form-stack"
          onSubmit={(event) => {
            event.preventDefault()
            void savePlan()
          }}
          noValidate
        >
          <Input
            label="Name"
            required
            value={draft.name}
            onChange={(e) => patchDraft('name', e.target.value)}
          />
          {editorMode === 'create' ? (
            <Input
              label="Plan id"
              required
              value={draft.id}
              onChange={(e) => {
                setIdTouched(true)
                patchDraft('id', slugifyPlanId(e.target.value))
              }}
              hint="Used in APIs and invoices. Cannot change later."
            />
          ) : (
            <Input label="Plan id" value={draft.id} readOnly disabled />
          )}
          <Textarea
            label="Tagline"
            rows={2}
            value={draft.description}
            onChange={(e) => patchDraft('description', e.target.value)}
          />

          <div className="pd-admin__form-grid">
            <Input
              label="Badge"
              value={draft.badge}
              onChange={(e) => patchDraft('badge', e.target.value)}
              placeholder="Popular"
            />
            <Input
              label="CTA label"
              value={draft.ctaLabel}
              onChange={(e) => patchDraft('ctaLabel', e.target.value)}
              placeholder="Choose plan"
            />
          </div>

          <Textarea
            label="Marketing bullets"
            rows={4}
            value={draft.marketingBullets}
            onChange={(e) => patchDraft('marketingBullets', e.target.value)}
            hint="One per line. Leave blank to auto-generate from limits."
          />

          <div className="pd-admin__form-grid">
            <Input
              label="Amount (BDT)"
              type="number"
              min={0}
              step={1}
              required
              value={draft.priceBdt}
              onChange={(e) => patchDraft('priceBdt', e.target.value)}
            />
            <Select
              label="Billing interval"
              value={draft.interval}
              options={[
                { value: 'month', label: 'Monthly' },
                { value: 'year', label: 'Yearly' },
              ]}
              onChange={(e) =>
                patchDraft(
                  'interval',
                  e.target.value === 'year' ? 'year' : 'month',
                )
              }
            />
          </div>

          <div className="pd-admin__form-grid">
            <Input
              label="Users"
              type="number"
              min={0}
              step={1}
              required
              value={draft.userLimit}
              onChange={(e) => patchDraft('userLimit', e.target.value)}
            />
            <Input
              label="Sub agents"
              type="number"
              min={0}
              step={1}
              required
              value={draft.subAgentLimit}
              onChange={(e) => patchDraft('subAgentLimit', e.target.value)}
            />
            <div className="pd-billing-admin__storage-field">
              <Input
                label="Storage"
                type="number"
                min={0}
                step={draft.storageUnit === 'GB' ? 0.1 : 1}
                required
                value={draft.storageValue}
                onChange={(e) => patchDraft('storageValue', e.target.value)}
              />
              <Select
                label="Unit"
                value={draft.storageUnit}
                options={[
                  { value: 'GB', label: 'GB' },
                  { value: 'MB', label: 'MB' },
                ]}
                onChange={(e) =>
                  changeStorageUnit(e.target.value === 'MB' ? 'MB' : 'GB')
                }
              />
            </div>
            <Input
              label="SMS / month"
              type="number"
              min={0}
              step={1}
              required
              value={draft.smsLimit}
              onChange={(e) => patchDraft('smsLimit', e.target.value)}
            />
            <Input
              label="SMS overage (BDT)"
              type="number"
              min={0}
              step={0.01}
              value={draft.smsOverageBdt}
              onChange={(e) => patchDraft('smsOverageBdt', e.target.value)}
            />
          </div>

          <div className="pd-billing-admin__switches">
            <Switch
              label="Live in catalog"
              checked={draft.isActive}
              onChange={(e) => patchDraft('isActive', e.target.checked)}
            />
            <Switch
              label="Public on agency checkout"
              checked={draft.isPublic}
              onChange={(e) => patchDraft('isPublic', e.target.checked)}
            />
            <Switch
              label="Highlighted"
              checked={draft.isHighlighted}
              onChange={(e) => patchDraft('isHighlighted', e.target.checked)}
            />
            <Switch
              label="Test plan"
              checked={draft.isTest}
              onChange={(e) => patchDraft('isTest', e.target.checked)}
            />
          </div>

          <div className="pd-admin__modules" aria-label="Included modules">
            {MODULE_GROUPS.map((group) => (
              <section
                key={group.id}
                className="pd-admin__module-group"
                aria-label={group.label}
              >
                <h3 className="pd-admin__module-group-title">{group.label}</h3>
                <ul className="pd-admin__module-list pd-admin__module-list--grid">
                  {group.modules.map((module) => (
                    <li key={module.id} className="pd-billing-admin__module-item">
                      <Checkbox
                        label={module.label}
                        checked={draft.modules.includes(module.id)}
                        onChange={(e) =>
                          toggleModule(module.id, e.target.checked)
                        }
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </form>
      </SideDrawer>

      <ConfirmDialog
        open={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
        title={
          pendingDelete?.isActive === false
            ? `Delete ${pendingDelete.name}?`
            : `Hide ${pendingDelete?.name ?? 'plan'}?`
        }
        description={
          pendingDelete?.isActive === false
            ? 'Permanently removes this plan from the catalog. Agencies already on these limits keep them. Fails if any agency still references it.'
            : 'Hides this plan from checkout. Agencies already on it keep their limits. Delete again after hiding to remove it permanently.'
        }
        confirmLabel={
          pendingDelete?.isActive === false ? 'Delete' : 'Hide'
        }
        confirmVariant="danger"
      />
    </section>
  )
}
