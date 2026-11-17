declare module 'jsdom' {
  export type DOMWindow = Window &
    typeof globalThis & {
      close(): void
    }

  export class JSDOM {
    constructor(
      html?: string,
      options?: {
        url?: string
        runScripts?: 'dangerously' | 'outside-only'
        pretendToBeVisual?: boolean
        beforeParse?: (window: DOMWindow) => void
      },
    )
    readonly window: DOMWindow
  }
}
