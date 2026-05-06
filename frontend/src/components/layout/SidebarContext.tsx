'use client'
import { createContext, useContext, useEffect, useState } from 'react'

interface SidebarCtx {
  open: boolean
  isMobile: boolean
  setOpen: (v: boolean) => void
  toggle: () => void
}

const SidebarContext = createContext<SidebarCtx>({
  open: false,
  isMobile: false,
  setOpen: () => {},
  toggle: () => {},
})

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => {
      const mob = window.innerWidth < 768
      setIsMobile(mob)
      // Al pasar a desktop, asegurar que el drawer esté cerrado (sidebar fijo)
      if (!mob) setOpen(false)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Bloquear scroll del body cuando el drawer mobile está abierto
  useEffect(() => {
    if (!isMobile) return
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open, isMobile])

  return (
    <SidebarContext.Provider value={{ open, isMobile, setOpen, toggle: () => setOpen(!open) }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => useContext(SidebarContext)
