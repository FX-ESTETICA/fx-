'use client'

import { useCallback, useEffect, useState } from 'react'
import { validateLicense, createClient } from '@/utils/supabase/client'
import { APP_VERSION } from '@/utils/calendar-constants'
import { useCalendarStore } from '../store/useCalendarStore'

export function useCalendarAuth() {
  const supabase = createClient()
  const { 
    isMounted, 
    setIsAuthorized, 
    setIsCalendarLocked, 
    setIsVersionOutdated,
    isCalendarLocked,
    isVersionOutdated
  } = useCalendarStore()

  const [lockPassword, setLockPassword] = useState("")
  const [unlockError, setUnlockError] = useState(false)

  const checkVersion = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'min_app_version')
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') return true
        console.error('Version check failed:', error)
        return true
      }

      const minVersion = data?.value
      if (minVersion && APP_VERSION < minVersion) {
        setIsVersionOutdated(true)
        return false
      }
      return true
    } catch (e) {
      console.error('Version check error:', e)
      return true
    }
  }, [supabase, setIsVersionOutdated])

  const checkAuth = useCallback(async () => {
    const authorized = await validateLicense()
    setIsAuthorized(authorized)
  }, [setIsAuthorized])

  useEffect(() => {
    if (!isMounted) return
    checkAuth()

    const unlockTime = localStorage.getItem('calendar_unlock_time')
    if (unlockTime) {
      const now = Date.now()
      const diff = now - parseInt(unlockTime, 10)
      if (diff < 24 * 60 * 60 * 1000) {
        setIsCalendarLocked(false)
      } else {
        localStorage.removeItem('calendar_unlock_time')
      }
    }
  }, [isMounted, checkAuth, setIsCalendarLocked])

  const handleUnlock = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const isVersionOk = await checkVersion()
    if (!isVersionOk) return

    if (lockPassword === "0428") {
      setIsCalendarLocked(false)
      setUnlockError(false)
      setLockPassword("")
      localStorage.setItem('calendar_unlock_time', Date.now().toString())
    } else {
      setUnlockError(true)
      setTimeout(() => setUnlockError(false), 2000)
    }
  }

  const handleSupabaseError = useCallback((error: { message?: string; code?: string; status?: number } | any, context: string) => {
    console.error(`Supabase error (${context}):`, error)
    const isRLSError = error.message?.toLowerCase().includes('row-level security') || 
                      error.message?.toLowerCase().includes('policy') ||
                      error.code === '42501' ||
                      error.status === 403

    if (isRLSError) {
      setIsVersionOutdated(true)
      setIsCalendarLocked(true)
      return
    }
    alert(`${context}失败: ${error.message}`)
  }, [setIsVersionOutdated, setIsCalendarLocked])

  return {
    isCalendarLocked,
    lockPassword,
    unlockError,
    setUnlockError,
    isVersionOutdated,
    setLockPassword,
    handleUnlock,
    handleSupabaseError,
    checkVersion
  }
}
