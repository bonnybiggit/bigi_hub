import { useState } from 'react'
import { AdminUIContext } from './AdminUIContext.js'
export default function AdminUIProvider({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return <AdminUIContext.Provider value={{ menuOpen, setMenuOpen }}>{children}</AdminUIContext.Provider>
}
