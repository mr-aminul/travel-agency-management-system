const ATTR = 'data-kb-nav'

function isNavKey(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey) return false
  return (
    event.key === 'Tab' ||
    event.key === 'Home' ||
    event.key === 'End' ||
    event.key.startsWith('Arrow')
  )
}

/** Show :focus-visible rings only while moving with the keyboard. */
export function initKeyboardFocus() {
  const root = document.documentElement
  const hideRings = () => root.removeAttribute(ATTR)
  const showRings = (event: KeyboardEvent) => {
    if (isNavKey(event)) root.setAttribute(ATTR, '')
  }

  window.addEventListener('pointerdown', hideRings, true)
  window.addEventListener('keydown', showRings, true)
}
