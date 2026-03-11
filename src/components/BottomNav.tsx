'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, User, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function BottomNav() {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<'user' | 'merchant'>('user')

  // In a real app, this would come from a global state or auth hook
  useEffect(() => {
    // Check local storage or cookie for role (for demo)
    const savedRole = localStorage.getItem('demo_user_role') as 'user' | 'merchant'
    if (savedRole) setUserRole(savedRole)
    
    // Listen for custom event to update role in real-time for the demo
    const handleRoleChange = () => {
      const newRole = localStorage.getItem('demo_user_role') as 'user' | 'merchant'
      if (newRole) setUserRole(newRole)
    }
    window.addEventListener('storage', handleRoleChange)
    return () => window.removeEventListener('storage', handleRoleChange)
  }, [])

  // Don't show bottom nav on admin pages or if we're not in the portal/shop area
  const isAdminPage = pathname?.startsWith('/admin')
  const isAuthPage = pathname?.startsWith('/auth')
  const isOnboardingPage = pathname?.startsWith('/merchant/onboarding')
  
  if (isAdminPage || isAuthPage || isOnboardingPage) return null

  const navItems = [
    {
      label: '首页',
      href: '/',
      icon: Home,
    },
    {
      label: '发现',
      href: '/explore',
      icon: Compass,
    },
    {
      label: '我的',
      href: '/me',
      icon: User,
    },
  ]

  // If merchant, optionally add/replace an item
  const finalNavItems = [...navItems]
  if (userRole === 'merchant') {
    // Insert "Dashboard" for merchants
    finalNavItems.splice(2, 0, {
      label: '工作台',
      href: '/admin',
      icon: LayoutGrid,
    })
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl border-t border-zinc-100 pb-safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {finalNavItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-[64px] transition-all duration-300",
                isActive ? (userRole === 'merchant' && item.label === '工作台' ? "text-emerald-500 scale-110" : "text-amber-500 scale-110") : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <div className={cn(
                "p-1 rounded-xl transition-colors",
                isActive ? (userRole === 'merchant' && item.label === '工作台' ? "bg-emerald-50" : "bg-amber-50") : "bg-transparent"
              )}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[10px] font-bold tracking-wider transition-opacity",
                isActive ? "opacity-100" : "opacity-80"
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
