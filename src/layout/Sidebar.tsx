import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react'
import { Tooltip } from '@/components/ui'
import type { NavItem, BrandConfig } from './types'
import { applySidebarExpanded } from '@/lib/sidebarPrefs'
import { useSidebarPrefs } from './useSidebarPrefs'

const NAV_ICON_SIZE = 17
const NAV_ICON_STROKE = 1.75
const CHEVRON_SIZE = 14
const SIDEBAR_WIDTH_COLLAPSED = '4rem'
const SIDEBAR_WIDTH_EXPANDED = '15.5rem'
const HOVER_CLOSE_DELAY_MS = 140

interface SidebarProps {
  navItems: NavItem[]
  brand: BrandConfig
  isMobile?: boolean
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

function isGroupPath(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`)
}

function navLinkClass(collapsed: boolean, isActive: boolean, isChild = false) {
  return [
    'pd-sidebar-nav__link',
    isChild && 'pd-sidebar-nav__link--child',
    collapsed && 'pd-sidebar-nav__link--collapsed',
    isActive && 'is-active',
  ]
    .filter(Boolean)
    .join(' ')
}

function NavItemLink({
  item,
  collapsed,
  onNavigate,
  isChild = false,
}: {
  item: NavItem
  collapsed: boolean
  onNavigate: () => void
  isChild?: boolean
}) {
  const { icon: Icon, label, path, end } = item

  const link = (
    <NavLink
      to={path}
      end={end ?? path === '/'}
      className={({ isActive }) => navLinkClass(collapsed, isActive, isChild)}
      aria-label={collapsed ? label : undefined}
      onClick={(e) => {
        e.stopPropagation()
        onNavigate()
      }}
    >
      {Icon ? (
        <span className="pd-sidebar-nav__icon" aria-hidden="true">
          <Icon size={NAV_ICON_SIZE} strokeWidth={NAV_ICON_STROKE} />
        </span>
      ) : null}
      <span className="pd-sidebar-nav__label" aria-hidden={collapsed}>
        {label}
      </span>
    </NavLink>
  )

  if (!collapsed) return link

  return (
    <Tooltip content={label} side="right" className="pd-sidebar-nav__tooltip">
      {link}
    </Tooltip>
  )
}

function NavItemGroup({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  onNavigate: () => void
}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const children = item.children ?? []
  const groupActive = isGroupPath(pathname, item.path)
  const [userCollapsed, setUserCollapsed] = useState(false)
  const groupOpen = groupActive && !userCollapsed
  const Icon = item.icon
  const firstChildPath = children[0]?.path ?? item.path

  useEffect(() => {
    if (!groupActive) setUserCollapsed(false)
  }, [groupActive])

  if (collapsed) {
    const link = (
      <NavLink
        to={firstChildPath}
        className={() => navLinkClass(true, groupActive)}
        aria-label={item.label}
        onClick={(e) => {
          e.stopPropagation()
          onNavigate()
        }}
      >
        {Icon ? (
          <span className="pd-sidebar-nav__icon" aria-hidden="true">
            <Icon size={NAV_ICON_SIZE} strokeWidth={NAV_ICON_STROKE} />
          </span>
        ) : null}
        <span className="pd-sidebar-nav__label" aria-hidden>
          {item.label}
        </span>
      </NavLink>
    )

    return (
      <Tooltip content={item.label} side="right" className="pd-sidebar-nav__tooltip">
        {link}
      </Tooltip>
    )
  }

  return (
    <div className="pd-sidebar-nav__group">
      <NavLink
        to={item.path}
        className={[
          'pd-sidebar-nav__group-link',
          groupActive && 'is-active',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-expanded={groupOpen}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (groupOpen) {
            setUserCollapsed(true)
            return
          }
          setUserCollapsed(false)
          navigate(item.path)
          onNavigate()
        }}
      >
        {Icon ? (
          <span className="pd-sidebar-nav__icon" aria-hidden="true">
            <Icon size={NAV_ICON_SIZE} strokeWidth={NAV_ICON_STROKE} />
          </span>
        ) : null}
        <span className="pd-sidebar-nav__label">{item.label}</span>
        <ChevronDown
          size={CHEVRON_SIZE}
          strokeWidth={NAV_ICON_STROKE}
          className={[
            'pd-sidebar-nav__chevron',
            groupOpen ? 'is-open' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
        />
      </NavLink>
      <div
        className={[
          'pd-sidebar-nav__children',
          groupOpen && 'is-open',
        ]
          .filter(Boolean)
          .join(' ')}
        inert={groupOpen ? undefined : true}
      >
        <div className="pd-sidebar-nav__children-inner">
          {children.map((child) => (
            <NavItemLink
              key={child.path}
              item={child}
              collapsed={false}
              onNavigate={onNavigate}
              isChild
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function Sidebar({
  navItems,
  brand,
  isMobile = false,
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const navigate = useNavigate()
  const { mode, expanded } = useSidebarPrefs()
  const [hovered, setHovered] = useState(false)
  const hoverCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isManual = mode === 'manual'
  const collapsed = isMobile
    ? false
    : isManual
      ? !expanded
      : !hovered
  const { name, subtitle, icon: BrandIcon, logoUrl } = brand
  const spaceIndex = name.indexOf(' ')
  const nameFirst = spaceIndex === -1 ? name : name.slice(0, spaceIndex)
  const nameRest = spaceIndex === -1 ? '' : name.slice(spaceIndex + 1)

  const clearHoverClose = () => {
    if (hoverCloseRef.current) {
      clearTimeout(hoverCloseRef.current)
      hoverCloseRef.current = null
    }
  }

  useEffect(() => () => clearHoverClose(), [])

  useEffect(() => {
    if (isManual) {
      clearHoverClose()
      setHovered(false)
    }
  }, [isManual])

  const closeMobile = () => {
    if (isMobile) onMobileClose?.()
  }

  const toggleExpanded = () => {
    applySidebarExpanded(collapsed)
  }

  const inner = (
    <>
      <div
        className="pd-sidebar-brand"
        onClick={(e) => {
          e.stopPropagation()
          navigate('/')
          closeMobile()
        }}
      >
        <div className="pd-app-logo pd-app-logo--sm">
          {logoUrl ? (
            <img src={logoUrl} alt="" />
          ) : (
            <BrandIcon size={18} strokeWidth={2.5} />
          )}
        </div>
        <div
          className={`pd-sidebar-brand__text${collapsed ? ' is-collapsed' : ''}`}
          aria-hidden={collapsed}
        >
          <div className="pd-sidebar-brand__name">
            {nameFirst}
            {nameRest ? (
              <>
                <br />
                {nameRest}
              </>
            ) : null}
          </div>
          {subtitle && (
            <div className="pd-sidebar-brand__subtitle">{subtitle}</div>
          )}
        </div>
        {isMobile && (
          <button
            type="button"
            className="pd-sidebar-btn pd-sidebar-brand__close"
            aria-label="Close menu"
            onClick={(e) => {
              e.stopPropagation()
              closeMobile()
            }}
          >
            <X size={NAV_ICON_SIZE} strokeWidth={NAV_ICON_STROKE} />
          </button>
        )}
      </div>

      <div className="pd-sidebar-body">
        <div className="pd-sidebar-divider" />
        <nav className="pd-sidebar-nav">
          {navItems.map((item) =>
            item.children?.length ? (
              <NavItemGroup
                key={item.path}
                item={item}
                collapsed={collapsed}
                onNavigate={closeMobile}
              />
            ) : (
              <NavItemLink
                key={item.path}
                item={item}
                collapsed={collapsed}
                onNavigate={closeMobile}
              />
            ),
          )}
        </nav>

        {!isMobile && isManual && (
          <div
            className={[
              'pd-sidebar-footer',
              collapsed && 'pd-sidebar-footer--collapsed',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <button
              type="button"
              className="pd-sidebar-btn pd-sidebar-footer__toggle"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={(e) => {
                e.stopPropagation()
                toggleExpanded()
              }}
            >
              {collapsed ? (
                <PanelLeftOpen
                  size={NAV_ICON_SIZE}
                  strokeWidth={NAV_ICON_STROKE}
                  aria-hidden="true"
                />
              ) : (
                <PanelLeftClose
                  size={NAV_ICON_SIZE}
                  strokeWidth={NAV_ICON_STROKE}
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        )}
      </div>
    </>
  )

  if (isMobile) {
    return (
      <>
        <div
          className={`pd-app-sidebar__backdrop${isMobileOpen ? ' is-open' : ''}`}
          onClick={onMobileClose}
        />
        <aside
          className={`pd-app-sidebar pd-app-sidebar--mobile${isMobileOpen ? ' is-open' : ''}`}
          style={{ width: SIDEBAR_WIDTH_EXPANDED }}
        >
          <div className="pd-app-sidebar__inner">{inner}</div>
        </aside>
      </>
    )
  }

  return (
    <aside
      className={`pd-app-sidebar${collapsed ? ' pd-app-sidebar--collapsed' : ''}`}
      style={{
        width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
      }}
      onMouseEnter={
        isManual
          ? undefined
          : () => {
            clearHoverClose()
            setHovered(true)
          }
      }
      onMouseLeave={
        isManual
          ? undefined
          : () => {
            clearHoverClose()
            hoverCloseRef.current = setTimeout(
              () => setHovered(false),
              HOVER_CLOSE_DELAY_MS,
            )
          }
      }
    >
      <div className="pd-app-sidebar__inner">{inner}</div>
    </aside>
  )
}
