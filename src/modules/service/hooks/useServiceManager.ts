'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Service } from '@/modules/core/types/omni-flow'
import { useServiceStore } from '../store/useServiceStore'

export function useServiceManager() {
  const { services, setServices, setLoading, setError } = useServiceStore()
  const [isSyncing, setIsSyncing] = useState(false)
  const supabase = createClient()

  // 1. 获取商户所有服务项目
  const fetchServices = useCallback(async (merchantId: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('fx_services')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('category', { ascending: true })

      if (error) throw error
      setServices(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [setServices, setLoading, setError])

  // 2. 添加服务项目
  const addService = async (service: Partial<Service>) => {
    setIsSyncing(true)
    try {
      const { data, error } = await supabase
        .from('fx_services')
        .insert([service])
        .select()

      if (error) throw error
      if (data) {
        setServices([...services, data[0]])
      }
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    } finally {
      setIsSyncing(false)
    }
  }

  // 3. 更新服务项目
  const updateService = async (id: string, updates: Partial<Service>) => {
    setIsSyncing(true)
    try {
      const { error } = await supabase
        .from('fx_services')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      setServices(services.map(s => s.id === id ? { ...s, ...updates } : s))
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    } finally {
      setIsSyncing(false)
    }
  }

  return {
    services,
    isSyncing,
    fetchServices,
    addService,
    updateService
  }
}
