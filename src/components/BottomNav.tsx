'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function BottomNav() {
  const pathname = usePathname()

  // Don't show bottom nav on admin pages or if we're not in the portal/shop area
  const isAdminPage = pathname?.startsWith('/admin')
  if (isAdminPage) return null

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl border-t border-zinc-100 pb-safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-[64px] transition-all duration-300",
                isActive ? "text-amber-500 scale-110" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <div className={cn(
                "p-1 rounded-xl transition-colors",
                isActive ? "bg-amber-50" : "bg-transparent"
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
