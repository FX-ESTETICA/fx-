'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { GlobalPassport } from '@/modules/core/types/omni-flow'

/**
 * 全球服务护照 (Global Service Passport) 核心 Hook
 * 实现跨商户的客户偏好同步、唯一身份识别和信用管理
 */
export function useGlobalPassport() {
  const [isSyncing, setIsSyncing] = useState(false)
  const supabase = createClient()

  /**
   * 1. 根据手机号获取或初始化全球通行证
   * 当客户在任何一家店输入手机号时，系统自动“热启动”其全球画像
   */
  const getOrCreatePassport = async (phoneNumber: string): Promise<{ success: boolean; data?: GlobalPassport; error?: string }> => {
    setIsSyncing(true)
    try {
      // 首先尝试查找
      const { data: existing, error: findError } = await supabase
        .from('fx_global_passports')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single()

      if (existing) {
        return { success: true, data: existing }
      }

      // 如果不存在，则初始化一个新的全球通行证
      const { data: newPassport, error: createError } = await supabase
        .from('fx_global_passports')
        .insert([{ 
          phone_number: phoneNumber,
          preferences: {},
          loyalty_points: 0,
          is_active: true,
          customer_name: '新客户',
          metadata: { source: 'omni-flow-auto-gen' }
        }])
        .select()
        .single()

      if (createError) throw createError
      return { success: true, data: newPassport }
    } catch (err: any) {
      console.error('Passport syncing failed:', err)
      return { success: false, error: err.message }
    } finally {
      setIsSyncing(false)
    }
  }

  /**
   * 3. 根据 ID 获取全球通行证
   */
  const getPassportById = useCallback(async (id: string): Promise<{ success: boolean; data?: GlobalPassport; error?: string }> => {
    setIsSyncing(true)
    try {
      const { data, error } = await supabase
        .from('fx_global_passports')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (err: any) {
      console.error('Fetch passport failed:', err)
      return { success: false, error: err.message }
    } finally {
      setIsSyncing(false)
    }
  }, [supabase])

  /**
   * 4. 更新全球偏好 (跨店生效)
   * 注入“数据确权”基因：通过 RPC 实现原子化 JSONB 合并，彻底根除并发覆盖 (Race Condition)
   */
  const updateGlobalPreferences = async (
    passportId: string, 
    newPreferences: Record<string, any>,
    merchantId: string // 必须显式传入商户 ID 进行确权记录
  ) => {
    setIsSyncing(true)
    try {
      // 降维打击：不再在客户端进行 Read-Modify-Write，而是直接调用原子化 RPC
      const { error } = await supabase.rpc('update_passport_preferences', {
        p_passport_id: passportId,
        p_new_preferences: newPreferences,
        p_merchant_id: merchantId
      })

      if (error) throw error
      return { success: true }
    } catch (err: any) {
      console.error('Update global preferences via RPC failed:', err)
      return { success: false, error: err.message }
    } finally {
      setIsSyncing(false)
    }
  }

  /**
   * 5. 跨店原子化同步逻辑 (Atomic Sync)
   * 将本地备注/历史行为“确权”为全球通用偏好
   */
  const syncLocalToGlobal = async (
    passportId: string, 
    localData: { notes?: string; history?: any[] },
    merchantId: string
  ) => {
    // 启发式分析：从本地备注中提取潜在的全球偏好 (如：对xx过敏, 喜欢xx)
    const preferences: Record<string, any> = {}
    
    if (localData.notes) {
      const keywords = [
        { regex: /过敏[:：]\s*([^,，\s]+)/, key: 'allergies' },
        { regex: /喜欢[:：]\s*([^,，\s]+)/, key: 'interests' },
        { regex: /习惯[:：]\s*([^,，\s]+)/, key: 'habits' },
        { regex: /忌口[:：]\s*([^,，\s]+)/, key: 'dietary' }
      ]

      keywords.forEach(({ regex, key }) => {
        const match = localData.notes?.match(regex)
        if (match && match[1]) {
          preferences[key] = match[1]
        }
      })
    }

    if (Object.keys(preferences).length > 0) {
      return await updateGlobalPreferences(passportId, preferences, merchantId)
    }
    
    return { success: true, message: 'No syncable data found' }
  }

  return {
    isSyncing,
    getOrCreatePassport,
    getPassportById,
    updateGlobalPreferences,
    syncLocalToGlobal
  }
}
