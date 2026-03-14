'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Booking, BookingStatus } from '@/modules/core/types/omni-flow'
import { useCalendarStore } from '@/components/calendar/store/useCalendarStore'
import { format } from 'date-fns'

export function useBookingManager() {
  const [isSyncing, setIsSyncing] = useState(false)
  const { setEvents, setLoading, setError } = useCalendarStore()
  const supabase = createClient()

  // 1. 获取商户预约数据 (支持日期范围)
  const fetchBookings = useCallback(async (merchantId: string, startDate: Date, endDate: Date) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('fx_events')
        .select('*')
        .eq('merchant_id', merchantId)
        .gte('service_date', format(startDate, 'yyyy-MM-dd'))
        .lte('service_date', format(endDate, 'yyyy-MM-dd'))
        .not('status', 'eq', 'deleted')

      if (error) throw error
      setEvents(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [setEvents, setLoading, setError])

  // 2. 创建预约 (核心原子操作)
  const createBooking = async (booking: Partial<Booking>) => {
    setIsSyncing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const metadata = session?.user?.user_metadata
      
      // 顶级进化：注入 AI 环境感知和动态溢价因子
      const dbEventData: any = {
        ...booking,
        merchant_id: booking.merchant_id || metadata?.mc_id || metadata?.ad_id || metadata?.rp_id,
        merchant_name: booking.merchant_name || metadata?.full_name || metadata?.name || '未知商户',
        status: booking.status || 'pending',
        
        // 新增：AI 环境快照 (后续可接入天气/负荷 API)
        context_snapshot: booking.context_snapshot || {
          created_at: new Date().toISOString(),
          load_factor: 1.0, // 初始负荷因子
          environment: 'normal',
          industry_context: 'beauty', // 原子化行业背景
        },
        
        // 新增：动态调价因子 (默认为 1.0，后续由 AI 引擎根据 load_factor 自动计算)
        dynamic_price_factor: booking.dynamic_price_factor || 1.0,
        
        // 新增：初始化结算锁定状态
        is_settled: false,
        
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('fx_events')
        .insert([dbEventData])
        .select()

      if (error) throw error
      return { success: true, data: data[0] }
    } catch (err: any) {
      return { success: false, error: err.message }
    } finally {
      setIsSyncing(false)
    }
  }

  // 3. 更新预约状态 (确认/完成/取消)
  const updateBookingStatus = async (id: string, status: BookingStatus) => {
    setIsSyncing(true)
    try {
      const { error } = await supabase
        .from('fx_events')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    } finally {
      setIsSyncing(false)
    }
  }

  return {
    isSyncing,
    fetchBookings,
    createBooking,
    updateBookingStatus
  }
}
