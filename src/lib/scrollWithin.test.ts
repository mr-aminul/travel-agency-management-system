import { afterEach, describe, expect, it, vi } from 'vitest'
import { scrollWithinContainer } from '@/lib/scrollWithin'

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('scrollWithinContainer', () => {
  it('scrolls only the nearest overflow container, never the window', () => {
    const scroll = document.createElement('div')
    scroll.className = 'pd-app-scroll'
    Object.defineProperty(scroll, 'scrollHeight', { value: 2000 })
    Object.defineProperty(scroll, 'clientHeight', { value: 400 })
    scroll.getBoundingClientRect = () =>
      ({
        top: 80,
        bottom: 480,
        left: 0,
        right: 800,
        width: 800,
        height: 400,
        x: 0,
        y: 80,
        toJSON: () => ({}),
      }) as DOMRect

    const target = document.createElement('div')
    target.id = 'case-pipeline'
    target.getBoundingClientRect = () =>
      ({
        top: 900,
        bottom: 1100,
        left: 0,
        right: 400,
        width: 400,
        height: 200,
        x: 0,
        y: 900,
        toJSON: () => ({}),
      }) as DOMRect

    scroll.appendChild(target)
    document.body.appendChild(scroll)

    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
      if (element === scroll) {
        return { overflowY: 'auto' } as CSSStyleDeclaration
      }
      return { overflowY: 'visible' } as CSSStyleDeclaration
    })

    const scrollBy = vi.fn()
    scroll.scrollBy = scrollBy as unknown as typeof scroll.scrollBy
    const windowScrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})

    scrollWithinContainer(target, { behavior: 'auto', margin: 16 })

    expect(scrollBy).toHaveBeenCalledTimes(1)
    expect(scrollBy.mock.calls[0][0]).toMatchObject({
      top: expect.any(Number),
      behavior: 'auto',
    })
    expect(windowScrollBy).not.toHaveBeenCalled()
  })

  it('does nothing when the target is already in view', () => {
    const scroll = document.createElement('div')
    scroll.className = 'pd-app-scroll'
    Object.defineProperty(scroll, 'scrollHeight', { value: 2000 })
    Object.defineProperty(scroll, 'clientHeight', { value: 400 })
    scroll.getBoundingClientRect = () =>
      ({
        top: 80,
        bottom: 480,
        left: 0,
        right: 800,
        width: 800,
        height: 400,
        x: 0,
        y: 80,
        toJSON: () => ({}),
      }) as DOMRect

    const target = document.createElement('div')
    target.getBoundingClientRect = () =>
      ({
        top: 120,
        bottom: 220,
        left: 0,
        right: 400,
        width: 400,
        height: 100,
        x: 0,
        y: 120,
        toJSON: () => ({}),
      }) as DOMRect

    scroll.appendChild(target)
    document.body.appendChild(scroll)

    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
      if (element === scroll) {
        return { overflowY: 'auto' } as CSSStyleDeclaration
      }
      return { overflowY: 'visible' } as CSSStyleDeclaration
    })

    const scrollBy = vi.fn()
    scroll.scrollBy = scrollBy as unknown as typeof scroll.scrollBy

    scrollWithinContainer(target, { behavior: 'auto' })

    expect(scrollBy).not.toHaveBeenCalled()
  })
})
