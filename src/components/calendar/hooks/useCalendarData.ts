import { useCallback, useEffect } from 'react'
import { 
  format, 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfYear, 
  endOfYear, 
  startOfMonth, 
  endOfMonth,
  subDays
} from 'date-fns'
import { useCalendarStore } from '../store/useCalendarStore'
import { createClient } from '@/utils/supabase/client'
import { CalendarEvent } from '@/utils/calendar-constants'

export function useCalendarData() {
  const { 
    currentDate, 
    viewType, 
    setEvents, 
    setAllDatabaseEvents,
    staffMembers,
    setResourceLoadFactors,
    setAiSchedulingInsights,
    setPredictedOccupancy,
    batchUpdatePassportCache,
    setStaffMembers
  } = useCalendarStore()
  
  const supabase = createClient()

  const fetchResources = useCallback(async () => {
    const { data, error } = await supabase
      .from('fx_staff')
      .select('*')
      .eq('status', 'active')
      .order('sort_order', { ascending: true })

    if (!error && data) {
      const mappedStaff = data.map((s: any) => ({
        id: s.id,
        merchant_id: s.merchant_id || 'default',
        name: s.name,
        role: s.role || 'Therapist',
        avatar: s.avatar_url || '',
        color: s.color || 'bg-sky-400',
        bgColor: s.bg_color || 'bg-sky-400/10',
        commission_rate: s.commission_rate || 0.3
      }))
      setStaffMembers(mappedStaff)
    }
  }, [supabase, setStaffMembers])

  const calculateLoadFactors = useCallback((events: any[]) => {
    const factors: Record<string, number> = {}
    const TOTAL_WORKING_MINUTES = 720 // 12h * 60m (9:00 - 21:00)
    
    staffMembers.forEach(staff => {
      // 过滤出该员工参与的事件 (支持多种识别方式)
      const staffEvents = events.filter(event => {
        // 1. 检查 billing_details
        if (event.billing_details?.items) {
          return event.billing_details.items.some((item: any) => item.staffId === staff.id)
        }
        
        // 2. 优先检查 context_snapshot
        const snapshot = event.context_snapshot || {}
        if (snapshot.item_staff_map) {
          return Object.values(snapshot.item_staff_map as Record<string, string>).some(sId => sId === staff.id)
        }
        if (snapshot.selected_staff_id === staff.id) return true

        // 3. 检查 金额_NAME 字段 (向后兼容)
        const amountKey = `金额_${staff.name}`
        if (event[amountKey] && Number(event[amountKey]) > 0) {
          return true
        }

        return false
      })

      const totalMinutes = staffEvents.reduce((acc, event) => acc + (Number(event.duration) || 0), 0)
      // 计算负载率，保留两位小数
      factors[staff.id] = Math.min(Number((totalMinutes / TOTAL_WORKING_MINUTES).toFixed(2)), 1.5) // 允许适当超额负载，上限 1.5
    })

    return factors
  }, [staffMembers])

  // AI 调度洞察优化逻辑 (微步 23.1: 增强预测算法)
  const generateAiInsights = useCallback((loadFactors: Record<string, number>, events: any[]) => {
    const insights: string[] = []
    const predicted: Record<string, number> = {}
    const now = new Date()
    const isWeekend = now.getDay() === 0 || now.getDay() === 6
    const hour = now.getHours()
    
    // 1. 计算全局趋势因子 (基于时间段和周末)
    let trendMultiplier = 1.0
    if (hour >= 13 && hour <= 15) trendMultiplier = 1.25 // 午后高峰
    if (hour >= 18 && hour <= 20) trendMultiplier = 1.4 // 晚间高峰
    if (isWeekend) trendMultiplier *= 1.15 // 周末加成

    Object.entries(loadFactors).forEach(([staffId, factor]) => {
      const staff = staffMembers.find(s => s.id === staffId)
      
      // 2. 预测计算：结合当前负载、趋势因子和微量随机扰动
      const randomNoise = (Math.random() - 0.4) * 0.1 // -0.04 到 +0.06
      const predictedFactor = Math.min(Number((factor * trendMultiplier + randomNoise).toFixed(2)), 1.5)
      predicted[staffId] = Math.max(0, predictedFactor)
      
      // 3. 生成基于数据的洞察
      if (factor > 0.9) {
        insights.push(`🔥 负载预警: ${staff?.name || '技师'} 接近满负荷，建议暂时关闭在线预约。`)
      } else if (predictedFactor > 1.1 && factor <= 0.9) {
        insights.push(`📈 趋势预测: ${staff?.name || '技师'} 接下来 2 小时需求将激增，建议预留工位。`)
      }
      
      if (factor < 0.15 && predictedFactor < 0.3) {
        insights.push(`💡 资源优化: ${staff?.name || '技师'} 处于低负荷期，可安排技能培训或设备维护。`)
      }
    })

    // 4. 跨资源调度洞察
    const highLoadStaff = Object.entries(loadFactors).filter(([_, f]) => f > 0.8)
    const lowLoadStaff = Object.entries(loadFactors).filter(([_, f]) => f < 0.3)
    
    if (highLoadStaff.length > 0 && lowLoadStaff.length > 0) {
      const busyNames = highLoadStaff.map(([id]) => staffMembers.find(s => s.id === id)?.name).join('、')
      const freeNames = lowLoadStaff.map(([id]) => staffMembers.find(s => s.id === id)?.name).join('、')
      insights.push(`🔄 智能调度: 检测到负载不均，建议将 ${busyNames} 的待分配需求引导至 ${freeNames}。`)
    }
    
    return { insights, predicted }
  }, [staffMembers])

  // 基于 AI 预测的预约时间推荐 (微步 24.2)
  const getRecommendedSlots = useCallback((date: Date, staffId: string, events: any[]) => {
    const slots: string[] = []
    const dayEvents = events.filter(e => e.service_date === format(date, 'yyyy-MM-dd'))
    
    // 简单的推荐逻辑：避开已有预约，优先推荐低负荷时段 (9:00 - 20:00)
    const workingHours = [9, 10, 11, 14, 15, 16, 17, 18, 19]
    const occupiedHours = dayEvents.map(e => {
      const time = e.start_time || '00:00'
      return parseInt(time.split(':')[0])
    })

    workingHours.forEach(h => {
      if (!occupiedHours.includes(h) && slots.length < 3) {
        slots.push(`${h.toString().padStart(2, '0')}:00`)
      }
    })

    return slots
  }, [])

  const fetchEvents = useCallback(async () => {
    let start, end
    
    if (viewType === 'day') {
      start = startOfDay(currentDate)
      end = endOfDay(currentDate)
    } else if (viewType === 'week') {
      start = startOfWeek(currentDate, { weekStartsOn: 1 })
      end = endOfWeek(currentDate, { weekStartsOn: 1 })
    } else if (viewType === 'year') {
      start = startOfYear(currentDate)
      end = endOfYear(currentDate)
    } else {
      const monthStart = startOfMonth(currentDate)
      start = startOfWeek(monthStart, { weekStartsOn: 1 })
      end = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 })
    }
    
    const { data, error } = await supabase
      .from('fx_events')
      .select('*')
      .gte('service_date', format(start, 'yyyy-MM-dd'))
      .lte('service_date', format(end, 'yyyy-MM-dd'))
      .not('status', 'eq', 'deleted')

    if (!error && data) {
      const mappedEvents = data as CalendarEvent[];
      setEvents(mappedEvents)
      
      // 实时计算负载率 (微步 20.1: AI 调度准备)
      const loadFactors = calculateLoadFactors(mappedEvents)
      setResourceLoadFactors(loadFactors)

      // 生成 AI 调度洞察 (微步 23.1: 增强预测算法)
      const { insights, predicted } = generateAiInsights(loadFactors, mappedEvents)
      setAiSchedulingInsights(insights)
      setPredictedOccupancy(predicted)

      // 实时同步今日会员的全球通行证 (微步 28.2: 触发式同步)
      const phoneNumbers = new Set<string>();
      mappedEvents.forEach(event => {
        // 原子化字段提取手机号
        if (event.customer_phone) {
          const phone = event.customer_phone.match(/\d{8,15}/);
          if (phone) phoneNumbers.add(phone[0]);
        }
      });

      if (phoneNumbers.size > 0) {
        const phoneList = Array.from(phoneNumbers);
        supabase
          .from('fx_global_passports')
          .select('*')
          .in('phone_number', phoneList)
          .then(({ data: passports, error: passportError }) => {
            if (!passportError && passports) {
              const cache: Record<string, any> = {};
              passports.forEach(p => {
                cache[p.phone_number] = p;
              });
              batchUpdatePassportCache(cache);
            }
          });
      }
    }
  }, [currentDate, viewType, supabase, setEvents, calculateLoadFactors, setResourceLoadFactors, generateAiInsights, setAiSchedulingInsights, setPredictedOccupancy, batchUpdatePassportCache])

  const fetchAllEventsForLibrary = useCallback(async () => {
    // Get last 30 days to cover all bases for library and recents
    const thirtyDaysAgo = subDays(new Date(), 30);
    const { data, error } = await supabase
      .from('fx_events')
      .select('*')
      .gte('service_date', format(thirtyDaysAgo, 'yyyy-MM-dd'))

    if (!error && data) {
      const mappedEvents = data as CalendarEvent[];
      setAllDatabaseEvents(mappedEvents);
    }
  }, [supabase, setAllDatabaseEvents]);

  useEffect(() => {
    // 首次加载时获取资源和数据
    fetchResources()
    fetchEvents()
  }, [fetchResources, fetchEvents])

  return { fetchEvents, fetchAllEventsForLibrary, getRecommendedSlots, fetchResources }
}
