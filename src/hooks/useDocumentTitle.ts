import { useEffect } from 'react'

/**
 * Set the document title reactively.
 * Cleans up to null title on unmount (optional).
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title
    return () => {
      document.title = ''
    }
  }, [title])
}