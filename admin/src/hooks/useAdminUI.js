import { useContext } from 'react'
import { AdminUIContext } from '../context/AdminUIContext.js'
export function useAdminUI() {
  const context = useContext(AdminUIContext)
  if (!context) throw new Error('useAdminUI requires AdminUIProvider')
  return context
}
