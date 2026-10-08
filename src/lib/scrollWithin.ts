/**
 * Scroll an element into view without moving the app shell / window.
 * Page content scrolls in `.pd-app-scroll` (below the transparent top bar);
 * bare `scrollIntoView({ block: 'center' })` can shove that pane (or the
 * document) and break the gradient shell layout.
 */

function isScrollable(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element)
  const overflowY = style.overflowY
  if (overflowY !== 'auto' && overflowY !== 'scroll' && overflowY !== 'overlay') {
    return false
  }
  return element.scrollHeight > element.clientHeight + 1
}

function nearestScrollContainer(element: HTMLElement): HTMLElement | null {
  const preferred =
    element.closest('.pd-app-scroll') ??
    element.closest('.pd-app-content-card')
  if (preferred instanceof HTMLElement && isScrollable(preferred)) {
    return preferred
  }

  let current: HTMLElement | null = element.parentElement
  while (current && current !== document.body) {
    if (isScrollable(current)) return current
    current = current.parentElement
  }
  return null
}

export function scrollWithinContainer(
  element: HTMLElement,
  options?: { behavior?: ScrollBehavior; margin?: number },
): void {
  const behavior = options?.behavior ?? 'smooth'
  const margin = options?.margin ?? 16
  const container = nearestScrollContainer(element)

  if (!container) {
    // No nested scroller — leave the shell alone.
    return
  }

  const containerRect = container.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  const topLimit = containerRect.top + margin
  const bottomLimit = containerRect.bottom - margin

  if (elementRect.top >= topLimit && elementRect.bottom <= bottomLimit) {
    return
  }

  const deltaTop = elementRect.top - topLimit
  const deltaBottom = elementRect.bottom - bottomLimit
  const delta =
    elementRect.top < topLimit
      ? deltaTop
      : elementRect.bottom > bottomLimit
        ? deltaBottom
        : 0

  if (delta === 0) return

  container.scrollBy({ top: delta, behavior })
}

export function flashAndReveal(
  elementId: string,
  options?: { behavior?: ScrollBehavior; margin?: number },
): void {
  const element = document.getElementById(elementId)
  if (!element) return
  scrollWithinContainer(element, options)
}
