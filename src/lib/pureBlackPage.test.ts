import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'
import { afterEach, describe, expect, it, vi } from 'vitest'

const storageKey = 'gleamory:pure-black:background'
const html = await readFile(resolve(process.cwd(), 'public/pure-black/index.html'), 'utf8')
type BrowserWindow = Window & typeof globalThis

const openWindows: JSDOM[] = []

function createPage(options: { storedColor?: string; storageBlocked?: boolean } = {}) {
  const dom = new JSDOM(html, {
    url: 'https://gleamory.test/pure-black/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window: BrowserWindow) {
      if (options.storageBlocked) {
        Object.defineProperty(window, 'localStorage', {
          configurable: true,
          get() {
            throw new window.DOMException('Blocked', 'SecurityError')
          },
        })
      } else if (options.storedColor) {
        window.localStorage.setItem(storageKey, options.storedColor)
      }
    },
  })
  openWindows.push(dom)
  return dom
}

function openPicker(window: BrowserWindow, x = 40, y = 50) {
  const page = window.document.querySelector<HTMLElement>('#page')!
  const event = new window.MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  })
  page.dispatchEvent(event)
  return { event, page, panel: window.document.querySelector<HTMLElement>('#color-picker-panel')! }
}

function stubFullscreen(window: BrowserWindow, page: HTMLElement) {
  let activeElement: Element | null = null
  const requestFullscreen = vi.fn(() => {
    activeElement = page
    window.document.dispatchEvent(new window.Event('fullscreenchange'))
    return Promise.resolve()
  })
  Object.defineProperty(window.document, 'requestFullscreen', {
    configurable: true,
    value: requestFullscreen,
  })
  Object.defineProperty(page, 'requestFullscreen', {
    configurable: true,
    value: requestFullscreen,
  })
  Object.defineProperty(window.document, 'fullscreenElement', {
    configurable: true,
    get: () => activeElement,
  })
  Object.defineProperty(window.HTMLElement.prototype, 'requestFullscreen', {
    configurable: true,
    value: requestFullscreen,
  })
  Object.defineProperty(window.document, 'exitFullscreen', {
    configurable: true,
    value: vi.fn(() => {
      activeElement = null
      window.document.dispatchEvent(new window.Event('fullscreenchange'))
      return Promise.resolve()
    }),
  })
  return requestFullscreen
}

describe('pure-black standalone page', () => {
  afterEach(() => {
    for (const dom of openWindows.splice(0)) dom.window.close()
  })

  it('starts black when no stored preference exists', () => {
    const { window } = createPage()
    expect(
      window
        .getComputedStyle(window.document.documentElement)
        .getPropertyValue('--background-color')
        .trim(),
    ).toBe('#000000')
  })

  it('restores a valid stored color and removes an invalid value', () => {
    const valid = createPage({ storedColor: '#1a2b3c' })
    expect(valid.window.document.documentElement.style.getPropertyValue('--background-color')).toBe(
      '#1A2B3C',
    )
    const invalid = createPage({ storedColor: 'rgba(1,2,3,0.5)' })
    expect(
      invalid.window
        .getComputedStyle(invalid.window.document.documentElement)
        .getPropertyValue('--background-color')
        .trim(),
    ).toBe('#000000')
    expect(invalid.window.localStorage.getItem(storageKey)).toBeNull()
  })

  it('keeps color changes working when storage is blocked', () => {
    const { window } = createPage({ storageBlocked: true })
    const input = window.document.querySelector('#background-color-input') as HTMLInputElement
    input.value = '#123456'
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
    expect(window.document.documentElement.style.getPropertyValue('--background-color')).toBe(
      '#123456',
    )
  })

  it('opens from the context menu, prevents the native menu, and clamps to the viewport', () => {
    const { window } = createPage()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 200 })
    const panel = window.document.querySelector<HTMLElement>('#color-picker-panel')!
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 180,
      bottom: 100,
      left: 0,
      width: 180,
      height: 100,
      toJSON: () => ({}),
    })
    const { event } = openPicker(window, 310, 190)
    expect(event.defaultPrevented).toBe(true)
    expect(panel.hidden).toBe(false)
    expect(panel.style.left).toBe('132px')
    expect(panel.style.top).toBe('92px')
    expect(window.document.activeElement?.id).toBe('background-color-input')
  })

  it('syncs the native picker and valid HEX input, and ignores invalid HEX values', () => {
    const { window } = createPage()
    openPicker(window)
    const colorInput = window.document.querySelector('#background-color-input') as HTMLInputElement
    const hexInput = window.document.querySelector('#background-hex-input') as HTMLInputElement
    colorInput.value = '#ff0000'
    colorInput.dispatchEvent(new window.Event('input', { bubbles: true }))
    expect(window.document.documentElement.style.getPropertyValue('--background-color')).toBe(
      '#FF0000',
    )
    expect(hexInput.value).toBe('#FF0000')
    expect(window.localStorage.getItem(storageKey)).toBe('#FF0000')
    hexInput.value = '#12'
    hexInput.dispatchEvent(new window.Event('input', { bubbles: true }))
    expect(window.document.documentElement.style.getPropertyValue('--background-color')).toBe(
      '#FF0000',
    )
    expect(hexInput.getAttribute('aria-invalid')).toBe('true')
    hexInput.value = '#aBcDeF'
    hexInput.dispatchEvent(new window.Event('input', { bubbles: true }))
    expect(window.document.documentElement.style.getPropertyValue('--background-color')).toBe(
      '#ABCDEF',
    )
    expect(colorInput.value).toBe('#abcdef')
  })

  it('restores black and removes the saved preference', () => {
    const { window } = createPage({ storedColor: '#abcdef' })
    openPicker(window)
    window.document
      .querySelector('#reset-background')!
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
    expect(window.document.documentElement.style.getPropertyValue('--background-color')).toBe(
      '#000000',
    )
    expect(window.localStorage.getItem(storageKey)).toBeNull()
  })

  it('keeps panel clicks separate from fullscreen and closes on outside click or Escape', () => {
    const { window } = createPage()
    const requestFullscreen = stubFullscreen(
      window,
      window.document.querySelector<HTMLElement>('#page')!,
    )
    const { page, panel } = openPicker(window)
    window.document
      .querySelector('#reset-background')!
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
    expect(requestFullscreen).not.toHaveBeenCalled()
    expect(panel.hidden).toBe(false)
    page.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
    expect(panel.hidden).toBe(true)
    expect(requestFullscreen).not.toHaveBeenCalled()
    page.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
    expect(requestFullscreen).toHaveBeenCalledTimes(1)
    expect(window.document.fullscreenElement).toBe(page)
    openPicker(window)
    const escape = new window.KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
    window.document.activeElement!.dispatchEvent(escape)
    expect(escape.defaultPrevented).toBe(false)
    expect(panel.hidden).toBe(true)
  })

  it('preserves F fullscreen toggling while letting the HEX field receive the key', () => {
    const { window } = createPage()
    const requestFullscreen = stubFullscreen(
      window,
      window.document.querySelector<HTMLElement>('#page')!,
    )
    openPicker(window)
    const hexInput = window.document.querySelector<HTMLInputElement>('#background-hex-input')!
    const inputShortcut = new window.KeyboardEvent('keydown', {
      key: 'f',
      bubbles: true,
      cancelable: true,
    })
    hexInput.dispatchEvent(inputShortcut)
    expect(inputShortcut.defaultPrevented).toBe(false)
    expect(requestFullscreen).not.toHaveBeenCalled()
    const page = window.document.querySelector<HTMLElement>('#page')!
    const pageShortcut = new window.KeyboardEvent('keydown', {
      key: 'f',
      bubbles: true,
      cancelable: true,
    })
    page.dispatchEvent(pageShortcut)
    expect(pageShortcut.defaultPrevented).toBe(true)
    expect(requestFullscreen).toHaveBeenCalledTimes(1)
  })
})
