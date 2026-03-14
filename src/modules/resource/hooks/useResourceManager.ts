'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Resource } from '@/modules/core/types/omni-flow'
import { useResourceStore } from '../store/useResourceStore'

export function useResourceManager() {
  const { resources, setResources, setLoading, setError } = useResourceStore()
  const [isSyncing, setIsSyncing] = useState(false)
  const supabase = createClient()

  // 1. 获取商户所有资源 (人/空间/设备)
  const fetchResources = useCallback(async (merchantId: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('fx_staff') 
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      // 映射数据库新字段到核心模型
      const mappedResources = (data || []).map(item => ({
        ...item,
        resource_type: item.resource_type || 'human',
        industry_metadata: item.industry_metadata || {},
        commission_contract: item.commission_contract || { base_rate: item.commission_rate || 0.1 }
      }))
      
      setResources(mappedResources)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [setResources, setLoading, setError])

  // 2. 添加资源
  const addResource = async (resource: Partial<Resource>) => {
    setIsSyncing(true)
    try {
      const insertData = {
        ...resource,
        resource_type: resource.resource_type || 'human',
        industry_metadata: resource.industry_metadata || {},
        commission_contract: resource.commission_contract || { base_rate: resource.commission_rate || 0.1 }
      }

      const { data, error } = await supabase
        .from('fx_staff')
        .insert([insertData])
        .select()

      if (error) throw error
      if (data) {
        setResources([...resources, data[0]])
      }
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    } finally {
      setIsSyncing(false)
    }
  }

  // 3. 更新资源 (状态、颜色、元数据)
  const updateResource = async (id: string, updates: Partial<Resource>) => {
    setIsSyncing(true)
    try {
      // 准备更新数据，确保新字段能够正确写入
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('fx_staff')
        .update(updateData)
        .eq('id', id)

      if (error) throw error
      setResources(resources.map(r => r.id === id ? { ...r, ...updates } : r))
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    } finally {
      setIsSyncing(false)
    }
  }

  return {
    resources,
    isSyncing,
    fetchResources,
    addResource,
    updateResource
  }
}
