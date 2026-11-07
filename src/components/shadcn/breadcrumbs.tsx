import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/shadcn/breadcrumb'

export type BreadcrumbItemData = {
  label: string
  href?: string
}

/** Alias for layout imports. */
export type BreadcrumbItem = BreadcrumbItemData

export type BreadcrumbsProps = {
  items: BreadcrumbItemData[]
  className?: string
}

/** App breadcrumb trail (top bar). Keeps `pd-breadcrumbs*` classes for shell CSS. */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (!items.length) return null

  return (
    <Breadcrumb
      className={cn('pd-breadcrumbs', className)}
      aria-label="Breadcrumb"
    >
      <BreadcrumbList className="pd-breadcrumbs__list gap-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <Fragment key={`${item.label}-${index}`}>
              {index > 0 ? (
                <BreadcrumbSeparator className="pd-breadcrumbs__sep" />
              ) : null}
              <BreadcrumbItem className="pd-breadcrumbs__item">
                {isLast || !item.href ? (
                  <BreadcrumbPage
                    className="pd-breadcrumbs__current"
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild className="pd-breadcrumbs__link">
                    <Link to={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
