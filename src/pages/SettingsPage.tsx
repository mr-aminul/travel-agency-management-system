import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, ConfirmDialog, Input, Textarea } from '@/components/ui'
import {
  Briefcase,
  Building2,
  Contact,
  Monitor,
  Moon,
  MousePointerClick,
  Palette,
  PanelLeftOpen,
  ShieldCheck,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import '@/styles/layout-clients.css'
import '@/styles/layout-settings.css'
import { ProfilePhotoField } from '@/components/ProfilePhotoField'
import { SettingsInfo } from '@/components/settings/SettingsInfo'
import { ServiceCatalogEditor } from '@/components/settings/ServiceCatalogEditor'
import { ClientProfileFieldsSection } from '@/components/settings/ClientProfileFieldsSection'
import { getActiveTenantId } from '@/lib/authApi'
import {
  applyAppearance,
  applyThemeColor,
  applyThemeMode,
  DEFAULT_THEME_COLOR,
  readAppearance,
  readCustomThemeColor,
  readThemeMode,
  type AppearanceMode,
} from '@/lib/brand'
import {
  DEFAULT_BRAND_NAME,
  fileToProfilePictureDataUrl,
  readAgencyProfile,
  saveAgencyProfile,
  withBusinessNameFallback,
  type AgencyProfile,
} from '@/lib/agencyProfile'
import { updateTenantName } from '@/lib/tenantsStore'
import { useActiveTenant } from '@/lib/useActiveTenant'
import { validateRequiredName } from '@/lib/fieldValidation'
import {
  applySidebarMode,
  type SidebarExpandMode,
} from '@/lib/sidebarPrefs'
import { useSidebarPrefs } from '@/layout/useSidebarPrefs'
import { ServicesSettingsSection } from '@/components/settings/ServicesSettingsSection'
import { UserAccessSection } from '@/components/settings/UserAccessSection'
import {
  settingsSectionPath,
  type SettingsSectionParam,
} from '@/lib/workPaths'

type SettingsSectionId = SettingsSectionParam

const SETTINGS_SECTIONS: {
  id: SettingsSectionId
  label: string
  info?: string
  icon: LucideIcon
}[] = [
    {
      id: 'business',
      label: 'Business profile',
      info: 'Business name is your agency name — shown in the sidebar, invoices, and documents. Contact details and logo are optional.',
      icon: Building2,
    },
    {
      id: 'clientFields',
      label: 'Client fields',
      info: 'Standard client profiles keep identity and passport. Add extra fields this agency needs, such as profession or preferred country. They appear on the client profile and new-client form.',
      icon: Contact,
    },
    {
      id: 'services',
      label: 'Service catalog',
      info: 'These are the lines you sell. Open one to set the status journey and documents. New files pick up the checklist you save. Add a country when that destination needs a different journey or documents.',
      icon: Briefcase,
    },
    {
      id: 'userAccess',
      label: 'User-wise Access Management',
      info: 'Agency logins list down the left; pages run across as columns. Owners and managers can add users and set None, View, or Edit. Access is enforced in the app.',
      icon: ShieldCheck,
    },
    {
      id: 'appearance',
      label: 'Appearance',
      info: 'Choose light, dark, or match the system. Theme color tints the app. Auto expands the sidebar on hover; Click uses the button at the bottom of the sidebar.',
      icon: Palette,
    },
  ]

const SIDEBAR_MODE_OPTIONS: {
  value: SidebarExpandMode
  label: string
  title: string
  icon: typeof PanelLeftOpen
}[] = [
    {
      value: 'auto',
      label: 'Auto',
      title: 'Sidebar expands when you hover, and collapses when you leave.',
      icon: PanelLeftOpen,
    },
    {
      value: 'manual',
      label: 'Click',
      title:
        'Use the button at the bottom of the sidebar to expand or collapse.',
      icon: MousePointerClick,
    },
  ]

const APPEARANCE_OPTIONS: {
  value: AppearanceMode
  label: string
  icon: typeof Sun
}[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

function formatHex(hex: string): string {
  return hex.toUpperCase()
}

function isSettingsSectionId(value: string | null): value is SettingsSectionId {
  return (
    value === 'business' ||
    value === 'clientFields' ||
    value === 'services' ||
    value === 'userAccess' ||
    value === 'appearance'
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { serviceKey } = useParams()
  const [searchParams] = useSearchParams()
  const sectionParam = searchParams.get('section')
  const isEditor = Boolean(serviceKey)
  const activeSection: SettingsSectionId = isEditor
    ? 'services'
    : isSettingsSectionId(sectionParam)
      ? sectionParam
      : 'business'
  const [themeMode, setThemeMode] = useState(readThemeMode)
  const [customColor, setCustomColor] = useState(readCustomThemeColor)
  const [appearance, setAppearance] = useState(readAppearance)
  const { mode: sidebarMode } = useSidebarPrefs()
  const tenantId = getActiveTenantId()
  const tenant = useActiveTenant()
  const [agencyDraft, setAgencyDraft] = useState(() =>
    withBusinessNameFallback(readAgencyProfile(tenantId), tenant.name),
  )
  const [agencyStatus, setAgencyStatus] = useState<string | null>(null)
  const [agencyError, setAgencyError] = useState<string | null>(null)
  const [editorDirty, setEditorDirty] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => {
    setAgencyDraft(
      withBusinessNameFallback(readAgencyProfile(tenantId), tenant.name),
    )
  }, [tenantId, tenant.name])

  const currentSection =
    SETTINGS_SECTIONS.find((section) => section.id === activeSection) ??
    SETTINGS_SECTIONS[0]

  const goToHref = (href: string) => {
    navigate(href)
  }

  const requestHref = (href: string) => {
    if (isEditor && editorDirty) {
      setPendingHref(href)
      return
    }
    goToHref(href)
  }

  const selectSection = (id: SettingsSectionId) => {
    requestHref(settingsSectionPath(id))
  }

  useEffect(() => {
    if (!agencyStatus) return
    const timer = window.setTimeout(() => setAgencyStatus(null), 2500)
    return () => window.clearTimeout(timer)
  }, [agencyStatus])

  const updateAgencyField = <K extends keyof AgencyProfile>(
    key: K,
    value: AgencyProfile[K],
  ) => {
    setAgencyDraft((current) => ({ ...current, [key]: value }))
    setAgencyError(null)
  }

  const handleAgencySave = (event: FormEvent) => {
    event.preventDefault()
    const nameError = validateRequiredName(
      agencyDraft.businessName,
      'Business name',
    )
    if (nameError) {
      setAgencyError(nameError)
      return
    }
    try {
      // tenant.name is the single org display name; profile mirrors it.
      updateTenantName(tenantId, agencyDraft.businessName)
      const saved = saveAgencyProfile(
        {
          ...agencyDraft,
          businessName: agencyDraft.businessName.trim(),
        },
        tenantId,
      )
      setAgencyDraft(saved)
      setAgencyError(null)
      setAgencyStatus('Business profile saved.')
    } catch (error) {
      setAgencyError(
        error instanceof Error ? error.message : 'Could not save profile.',
      )
    }
  }

  return (
    <div className="pd-settings" aria-label="Settings">
      <nav className="pd-settings-nav" aria-label="Settings sections">
        {SETTINGS_SECTIONS.map((section) => {
          const Icon = section.icon
          const selected = section.id === activeSection
          return (
            <button
              key={section.id}
              type="button"
              className={`pd-settings-nav__item${selected ? ' is-selected' : ''}`}
              aria-current={selected ? 'page' : undefined}
              onClick={() => selectSection(section.id)}
            >
              <span className="pd-settings-nav__icon" aria-hidden>
                <Icon size={16} strokeWidth={2} />
              </span>
              <span className="pd-settings-nav__label">{section.label}</span>
            </button>
          )
        })}
      </nav>

      <section className="pd-settings-panel" aria-labelledby="settings-panel-title">
        {isEditor ||
        activeSection === 'services' ||
        activeSection === 'clientFields' ||
        activeSection === 'userAccess' ? null : (
          <header className="pd-settings-panel__header">
            <h2 id="settings-panel-title" className="pd-settings-panel__title">
              {currentSection.label}
            </h2>
            {currentSection.info ? (
              <SettingsInfo
                title={currentSection.label}
                body={currentSection.info}
              />
            ) : null}
          </header>
        )}

        <div className="pd-settings-panel__body">
          {activeSection === 'business' ? (
            <form className="pd-settings-form" onSubmit={handleAgencySave}>
              <div className="pd-settings-form__fields">
                <ProfilePhotoField
                  name={agencyDraft.businessName || DEFAULT_BRAND_NAME}
                  fallbackName={DEFAULT_BRAND_NAME}
                  value={agencyDraft.profilePicture ?? undefined}
                  encodeFile={fileToProfilePictureDataUrl}
                  onChange={(photoUrl) =>
                    updateAgencyField('profilePicture', photoUrl ?? null)
                  }
                >
                  <Input
                    label="Business name"
                    name="businessName"
                    autoComplete="organization"
                    placeholder="Your travel agency name"
                    value={agencyDraft.businessName}
                    onChange={(e) =>
                      updateAgencyField('businessName', e.target.value)
                    }
                  />
                </ProfilePhotoField>
                <Textarea
                  label="Address"
                  name="address"
                  autoComplete="street-address"
                  placeholder="Office address"
                  rows={3}
                  value={agencyDraft.address}
                  onChange={(e) =>
                    updateAgencyField('address', e.target.value)
                  }
                />
                <div className="pd-settings-form__grid">
                  <Input
                    label="Mobile number"
                    name="mobile"
                    type="tel"
                    autoComplete="tel"
                    placeholder="e.g. 01700 000000"
                    value={agencyDraft.mobile}
                    onChange={(e) =>
                      updateAgencyField('mobile', e.target.value)
                    }
                  />
                  <Input
                    label="Website"
                    name="website"
                    type="url"
                    autoComplete="url"
                    placeholder="https://"
                    value={agencyDraft.website}
                    onChange={(e) =>
                      updateAgencyField('website', e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="pd-settings-form__footer">
                <p
                  className={[
                    'pd-settings-form__status',
                    agencyError && 'pd-settings-form__status--error',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  role={agencyError ? 'alert' : undefined}
                >
                  {agencyError ?? agencyStatus ?? ''}
                </p>
                <Button type="submit" size="sm">
                  Save profile
                </Button>
              </div>
            </form>
          ) : null}

          {activeSection === 'clientFields' ? (
            <ClientProfileFieldsSection
              title={currentSection.label}
              info={currentSection.info ?? ''}
            />
          ) : null}

          {activeSection === 'services' ? (
            isEditor && serviceKey ? (
              <ServiceCatalogEditor
                key={serviceKey}
                serviceKey={serviceKey}
                onDirtyChange={setEditorDirty}
              />
            ) : (
              <ServicesSettingsSection
                title={currentSection.label}
                info={currentSection.info ?? ''}
              />
            )
          ) : null}

          {activeSection === 'userAccess' ? (
            <UserAccessSection
              title={currentSection.label}
              info={currentSection.info ?? ''}
            />
          ) : null}

          {activeSection === 'appearance' ? (
            <div className="pd-settings-stack">
              <div className="pd-settings-row">
                <span className="pd-settings-row__label">Dark mode</span>
                <div
                  className="pd-appearance-toggle"
                  role="radiogroup"
                  aria-label="Dark mode"
                >
                  {APPEARANCE_OPTIONS.map((option) => {
                    const selected = appearance === option.value
                    const Icon = option.icon
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`pd-appearance-toggle__option${selected ? ' is-selected' : ''}`}
                        title={option.label}
                        aria-label={option.label}
                        onClick={() =>
                          setAppearance(applyAppearance(option.value))
                        }
                      >
                        <Icon size={15} strokeWidth={2.25} aria-hidden />
                        <span>{option.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="pd-settings-row pd-settings-row--align-start">
                <span className="pd-settings-row__label">Theme color</span>
                <div
                  className="pd-theme-mode"
                  role="radiogroup"
                  aria-label="Theme color"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={themeMode === 'default'}
                    className={`pd-theme-mode__option${themeMode === 'default' ? ' is-selected' : ''}`}
                    title={`Default ${formatHex(DEFAULT_THEME_COLOR)}`}
                    aria-label={`Default ${formatHex(DEFAULT_THEME_COLOR)}`}
                    onClick={() => setThemeMode(applyThemeMode('default'))}
                  >
                    <span
                      className="pd-theme-mode__swatch"
                      style={{ background: DEFAULT_THEME_COLOR }}
                      aria-hidden
                    />
                    <span className="pd-theme-mode__label">Default</span>
                  </button>

                  <label
                    role="radio"
                    tabIndex={0}
                    aria-checked={themeMode === 'custom'}
                    aria-label={`Custom ${formatHex(customColor)}`}
                    title={`Custom ${formatHex(customColor)}`}
                    className={`pd-theme-mode__option pd-theme-mode__option--custom${themeMode === 'custom' ? ' is-selected' : ''}`}
                    onClick={() => setThemeMode(applyThemeMode('custom'))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setThemeMode(applyThemeMode('custom'))
                        e.currentTarget.querySelector('input')?.click()
                      }
                    }}
                  >
                    <span
                      className="pd-theme-mode__swatch"
                      style={{ background: customColor }}
                      aria-hidden
                    />
                    <span className="pd-theme-mode__label">Custom</span>
                    <input
                      type="color"
                      className="pd-theme-swatch__input"
                      value={customColor}
                      onChange={(e) => {
                        const next = applyThemeColor(e.target.value)
                        if (next) {
                          setCustomColor(next)
                          setThemeMode('custom')
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="pd-settings-row">
                <span className="pd-settings-row__label">Sidebar expand</span>
                <div
                  className="pd-appearance-toggle"
                  role="radiogroup"
                  aria-label="Sidebar expand mode"
                >
                  {SIDEBAR_MODE_OPTIONS.map((option) => {
                    const selected = sidebarMode === option.value
                    const Icon = option.icon
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`pd-appearance-toggle__option${selected ? ' is-selected' : ''}`}
                        title={option.title}
                        aria-label={option.title}
                        onClick={() => applySidebarMode(option.value)}
                      >
                        <Icon size={15} strokeWidth={2.25} aria-hidden />
                        <span>{option.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
      <ConfirmDialog
        open={pendingHref != null}
        onClose={() => setPendingHref(null)}
        onConfirm={() => {
          const href = pendingHref
          setPendingHref(null)
          setEditorDirty(false)
          if (href) goToHref(href)
        }}
        title="Discard unsaved changes?"
        description="The checklist or name you were editing has not been saved."
        confirmLabel="Discard"
        confirmVariant="danger"
      />
    </div>
  )
}
