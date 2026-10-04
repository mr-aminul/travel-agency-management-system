import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BookOpen,
  Building2,
  Info,
  Monitor,
  Moon,
  MousePointerClick,
  Palette,
  PanelLeftOpen,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import '@/styles/layout-settings.css'
import { Avatar, Button, Input, Textarea } from '@/components/ui'
import { JOURNEY_SPINE, PRODUCT_GLOSSARY } from '@/lib/glossary'
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
  type AgencyProfile,
} from '@/lib/agencyProfile'
import { APP_VERSION_LABEL } from '@/lib/appVersion'
import {
  applySidebarMode,
  type SidebarExpandMode,
} from '@/lib/sidebarPrefs'
import { useSidebarPrefs } from '@/layout/useSidebarPrefs'

type SettingsSectionId = 'business' | 'appearance' | 'glossary' | 'about'

const SETTINGS_SECTIONS: {
  id: SettingsSectionId
  label: string
  description: string
  icon: LucideIcon
}[] = [
    {
      id: 'business',
      label: 'Business profile',
      description: 'Agency name and contact details',
      icon: Building2,
    },
    {
      id: 'appearance',
      label: 'Appearance',
      description: 'Theme, dark mode, and sidebar',
      icon: Palette,
    },
    {
      id: 'glossary',
      label: 'How OneTrack works',
      description: 'Client, case, and progress language',
      icon: BookOpen,
    },
    {
      id: 'about',
      label: 'About',
      description: 'Version and app info',
      icon: Info,
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
    value === 'appearance' ||
    value === 'glossary' ||
    value === 'about'
  )
}

export default function SettingsPage() {
  const [searchParams] = useSearchParams()
  const sectionParam = searchParams.get('section')
  const [activeSection, setActiveSection] = useState<SettingsSectionId>(() =>
    isSettingsSectionId(sectionParam) ? sectionParam : 'business',
  )
  const [themeMode, setThemeMode] = useState(readThemeMode)
  const [customColor, setCustomColor] = useState(readCustomThemeColor)
  const [appearance, setAppearance] = useState(readAppearance)
  const { mode: sidebarMode } = useSidebarPrefs()
  const tenantId = getActiveTenantId()
  const [agencyDraft, setAgencyDraft] = useState(() =>
    readAgencyProfile(tenantId),
  )
  const [agencyStatus, setAgencyStatus] = useState<string | null>(null)
  const [agencyError, setAgencyError] = useState<string | null>(null)
  const [isPictureBusy, setIsPictureBusy] = useState(false)
  const pictureInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setAgencyDraft(readAgencyProfile(tenantId))
  }, [tenantId])

  const currentSection =
    SETTINGS_SECTIONS.find((section) => section.id === activeSection) ??
    SETTINGS_SECTIONS[0]

  useEffect(() => {
    if (isSettingsSectionId(sectionParam)) {
      setActiveSection(sectionParam)
    }
  }, [sectionParam])

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
    const saved = saveAgencyProfile(agencyDraft, tenantId)
    setAgencyDraft(saved)
    setAgencyError(null)
    setAgencyStatus('Business profile saved.')
  }

  const handlePictureChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setIsPictureBusy(true)
    setAgencyError(null)
    try {
      const dataUrl = await fileToProfilePictureDataUrl(file)
      updateAgencyField('profilePicture', dataUrl)
    } catch (error) {
      setAgencyError(
        error instanceof Error ? error.message : 'Could not use that image.',
      )
    } finally {
      setIsPictureBusy(false)
    }
  }

  return (
    <div className="pd-page pd-settings" aria-label="Settings">
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
              onClick={() => setActiveSection(section.id)}
            >
              <span className="pd-settings-nav__icon" aria-hidden>
                <Icon size={16} strokeWidth={2} />
              </span>
              <span className="pd-settings-nav__copy">
                <span className="pd-settings-nav__label">{section.label}</span>
                <span className="pd-settings-nav__desc">
                  {section.description}
                </span>
              </span>
            </button>
          )
        })}
      </nav>

      <div className="pd-settings-panel">
        <header className="pd-settings-panel__header">
          <h2 className="pd-settings-panel__title">{currentSection.label}</h2>
          <p className="pd-settings-panel__hint">
            {currentSection.id === 'business'
              ? 'Your business name replaces OneTrack in the sidebar title, with “powered by OneTrack” underneath.'
              : currentSection.id === 'appearance'
                ? 'Customize how the app looks, including theme color, dark mode, and sidebar behavior.'
                : currentSection.description}
          </p>
        </header>

        <div className="pd-settings-panel__body">
          {activeSection === 'business' ? (
            <form className="pd-settings-form" onSubmit={handleAgencySave}>
              <div className="pd-settings-avatar-row">
                <Avatar
                  name={agencyDraft.businessName || DEFAULT_BRAND_NAME}
                  src={agencyDraft.profilePicture}
                  size="lg"
                  alt="Business profile picture"
                />
                <div className="pd-settings-avatar-actions">
                  <input
                    ref={pictureInputRef}
                    type="file"
                    accept="image/*"
                    className="pd-settings-avatar-input"
                    onChange={handlePictureChange}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={isPictureBusy}
                    onClick={() => pictureInputRef.current?.click()}
                  >
                    {agencyDraft.profilePicture
                      ? 'Change photo'
                      : 'Upload photo'}
                  </Button>
                  {agencyDraft.profilePicture ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateAgencyField('profilePicture', null)
                      }
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="pd-settings-form__fields">
                <Input
                  label="Business name"
                  name="businessName"
                  autoComplete="organization"
                  placeholder="Your travel agency name"
                  value={agencyDraft.businessName}
                  onChange={(e) =>
                    updateAgencyField('businessName', e.target.value)
                  }
                  hint="Leave blank to keep OneTrack as the sidebar title."
                />
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
                <div className="pd-settings-row__copy">
                  <span className="pd-settings-row__label">Sidebar expand</span>
                  <span className="pd-settings-row__hint">
                    How the desktop sidebar opens and closes.
                  </span>
                </div>
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

          {activeSection === 'glossary' ? (
            <div className="pd-settings-stack">
              <div className="pd-settings-row pd-settings-row--align-start">
                <div className="pd-settings-row__copy">
                  <span className="pd-settings-row__label">Journey spine</span>
                  <span className="pd-settings-row__hint">{JOURNEY_SPINE}</span>
                </div>
              </div>
              {PRODUCT_GLOSSARY.map((entry) => (
                <div
                  key={entry.term}
                  className="pd-settings-row pd-settings-row--align-start"
                >
                  <div className="pd-settings-row__copy">
                    <span className="pd-settings-row__label">{entry.term}</span>
                    <span className="pd-settings-row__hint">{entry.meaning}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {activeSection === 'about' ? (
            <div className="pd-settings-stack">
              <div className="pd-settings-row">
                <span className="pd-settings-row__label">Version</span>
                <span className="pd-settings-version" title="Select to copy">
                  {APP_VERSION_LABEL}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
