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
    <div className="fixed bottom-0 left-0 right-0 z-[150] bg-transparent pointer-events-none">
      <div className="max-w-md mx-auto flex items-center justify-around py-3 px-2 relative pointer-events-auto">
        {finalNavItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 group relative px-6"
            >
              {isActive && (
                <>
                  {/* 选中态指示光 - 增强发光以补偿全透明背景 */}
                  <div className="absolute -top-[13px] left-1/2 -translate-x-1/2 w-10 h-[2.5px] bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,1)] z-20" />
                  <div className="absolute -top-[13px] left-1/2 -translate-x-1/2 w-20 h-10 bg-cyan-400/20 blur-2xl rounded-full pointer-events-none" />
                </>
              )}
              
              <Icon 
                size={22} 
                className={cn(
                  "transition-all duration-300 relative z-10",
                  isActive 
                    ? "text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]" 
                    : "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-cyan-300"
                )} 
              />
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative z-10",
                isActive
                  ? "text-cyan-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                  : "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-cyan-300"
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
