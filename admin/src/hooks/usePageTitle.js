import { useEffect } from 'react'
export function usePageTitle(title) {
  useEffect(() => { document.title = title + ' | Bigi_Hub Admin' }, [title])
}
