'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { 
  format, 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear,
  addDays, 
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addYears,
  subYears,
  isWithinInterval,
  parseISO
} from 'date-fns'
import { createClient } from '@/utils/supabase/client'

import { 
  ViewType, 
  FIXED_STAFF_NAMES,
  SERVICE_CATEGORIES,
  I18N 
} from '@/utils/calendar-constants'

interface PerformanceReportProps {
  isOpen: boolean
  onClose: () => void
  lang?: 'zh' | 'it'
}

type TimeRange = 'day' | 'week' | 'month' | 'year'

interface StaffStats {
  name: string
  amount: number
  count: number
}

export default function PerformanceReport({ isOpen, onClose, lang = 'zh' }: PerformanceReportProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'members'>('overview')
  const [timeRange, setTimeRange] = useState<TimeRange>('day')
  const [baseDate, setBaseDate] = useState(new Date())
  const [events, setEvents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [staffMembers, setStaffMembers] = useState<any[]>([])

  // Load staff from localStorage
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('staff_members')
      if (saved) {
        try {
          setStaffMembers(JSON.parse(saved))
        } catch (e) {
          console.error('Failed to parse staff_members from localStorage', e)
        }
      }
    }
  }, [isOpen])

  // Navigation Logic
  const handleNavigate = (direction: 'prev' | 'next') => {
    const fn = direction === 'prev' ? {
      day: subDays,
      week: subWeeks,
      month: subMonths,
      year: subYears
    } : {
      day: addDays,
      week: addWeeks,
      month: addMonths,
      year: addYears
    }
    
    setBaseDate(prev => fn[timeRange](prev, 1))
  }

  // Get date range based on selection and baseDate
  const getDateRange = (range: TimeRange, date: Date) => {
    switch (range) {
      case 'day':
        return { start: startOfDay(date), end: endOfDay(date) }
      case 'week':
        return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) }
      case 'month':
        return { start: startOfMonth(date), end: endOfMonth(date) }
      case 'year':
        return { start: startOfYear(date), end: endOfYear(date) }
      default:
        return { start: startOfDay(date), end: endOfDay(date) }
    }
  }

  const supabase = createClient()

  // Fetch events for the selected range
  useEffect(() => {
    if (!isOpen) return

    const fetchEvents = async () => {
      setIsLoading(true)
      try {
        const { start, end } = getDateRange(timeRange, baseDate)
        
        const { data, error } = await supabase
          .from('fx_events')
          .select('*')
          .gte('服务日期', format(start, 'yyyy-MM-dd'))
          .lte('服务日期', format(end, 'yyyy-MM-dd'))
        
        if (error) throw error
        setEvents(data || [])
      } catch (err) {
        console.error('Error fetching stats:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [isOpen, supabase, timeRange, baseDate])

  // Filter and aggregate data based on fetched events
  const stats = useMemo(() => {
    const currentStaffNames = staffMembers.map(s => s.name)
    // Always include original staff for backward compatibility with fixed columns
    const allStaffNames = Array.from(new Set([...FIXED_STAFF_NAMES, ...currentStaffNames]))
    
    const staffData: Record<string, { amount: number, count: number }> = {}

    // Initialize with all staff to ensure they are at least considered
    allStaffNames.forEach(name => {
      staffData[name] = { amount: 0, count: 0 }
    })

    // Build project prices for estimation
    const projectPrices: Record<string, number> = {}
    SERVICE_CATEGORIES.forEach(cat => {
      cat.items.forEach(item => {
        projectPrices[item.name] = item.price
      })
    })

    events.forEach(e => {
      let eventHasAnyAmount = false

      // 0. NEW PERFECT BILLING LOGIC: Priority 1 - billing_details.staff
      if (e.billing_details?.staff) {
        Object.entries(e.billing_details.staff).forEach(([name, amount]) => {
          const numAmount = Number(amount) || 0
          if (numAmount > 0) {
            if (!staffData[name]) {
              staffData[name] = { amount: 0, count: 0 }
            }
            staffData[name].amount += numAmount
            staffData[name].count += 1
            eventHasAnyAmount = true
          }
        })
      }

      if (eventHasAnyAmount) return; // Skip legacy if new fields found

      // 1. Check fixed columns or dynamic columns matching staff names (Realized)
      allStaffNames.forEach(name => {
        const amount = Number(e[`金额_${name}`]) || 0
        if (amount > 0) {
          staffData[name].amount += amount
          staffData[name].count += 1
          eventHasAnyAmount = true
        }
      })

      // 2. Check notes for dynamic staff amounts [NAME_AMT:100] or [NAME_AMT:100_IDX:0] (Realized)
      const noteContent = e["备注"] || ""
      const amtMatches = Array.from(noteContent.matchAll(/\[([^\]]+)_AMT:(\d+)(?:_IDX:\d+)?\]/g))
      amtMatches.forEach((match: any) => {
        const name = match[1]
        const amount = Number(match[2]) || 0
        if (amount > 0) {
          if (!staffData[name]) {
            staffData[name] = { amount: 0, count: 0 }
          }
          staffData[name].amount += amount
          staffData[name].count += 1
          eventHasAnyAmount = true
        }
      })

      // 3. If no realized amount yet, count as "Booked" for the main staff or assigned staff
      if (!eventHasAnyAmount) {
        // Find main staff from 备注: 技师:STAFF_ID
        const mainStaffIdMatch = noteContent.match(/技师:([^,\]\s]+)/)
        const mainStaffId = mainStaffIdMatch ? mainStaffIdMatch[1] : null
        const mainStaff = staffMembers.find(s => s.id === mainStaffId)

        if (mainStaff) {
          const projects = (e.服务项目 || "").split(',').map((s: string) => s.trim()).filter(Boolean)
          let estimatedTotal = 0
          projects.forEach((p: string) => {
            estimatedTotal += projectPrices[p] || 0
          })

          if (estimatedTotal > 0) {
            staffData[mainStaff.name].amount += estimatedTotal
            staffData[mainStaff.name].count += 1
          }
        }
      }
    })

    // Convert to array and filter out those with 0 amount (unless we need mock data)
    let staffStats: StaffStats[] = Object.entries(staffData).map(([name, data]) => ({
      name,
      amount: data.amount,
      count: data.count
    }))

    // Add mock data if there's no real data for preview
    const totalRealAmount = staffStats.reduce((sum, s) => sum + s.amount, 0)
    if (totalRealAmount === 0 && events.length === 0) {
      const mockData = [
        { name: FIXED_STAFF_NAMES[1] || 'SARA', amount: 1560, count: 12 },
        { name: FIXED_STAFF_NAMES[0] || 'FANG', amount: 1250, count: 8 },
        { name: FIXED_STAFF_NAMES[4] || 'FEDE', amount: 1120, count: 9 },
        { name: FIXED_STAFF_NAMES[3] || 'ALEXA', amount: 980, count: 6 },
        { name: FIXED_STAFF_NAMES[2] || 'DAN', amount: 740, count: 5 }
      ]
      staffStats = mockData
    } else {
      // Only show staff who actually have performance
      staffStats = staffStats.filter(s => s.amount > 0)
    }

    const sortedStats = [...staffStats].sort((a, b) => b.amount - a.amount)
    const totalAmount = staffStats.reduce((sum, s) => sum + s.amount, 0)

    return { staffStats, sortedStats, totalAmount }
  }, [events])

  const projectStats = useMemo(() => {
    const counts: Record<string, number> = {}
    events.forEach(e => {
      const project = e.服务项目 || (lang === 'zh' ? '未知' : 'Sconosciuto')
      counts[project] = (counts[project] || 0) + 1
    })

    let result = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Show top 10 as requested

    // Mock data for preview if empty
    if (result.length === 0 && events.length === 0) {
      const mockProjects = [
        { name: lang === 'zh' ? '基础美甲' : 'Manicure Base', count: 45 },
        { name: lang === 'zh' ? '法式美甲' : 'French Manicure', count: 32 },
        { name: lang === 'zh' ? '甲油胶' : 'Smalto Semipermanente', count: 28 },
        { name: lang === 'zh' ? '延长甲' : 'Ricostruzione Unghie', count: 15 },
        { name: lang === 'zh' ? '手部护理' : 'Trattamento Mani', count: 12 }
      ]
      result = mockProjects
    }

    return result
  }, [events, lang])

  const staffFlow = useMemo(() => {
    const flow: Record<string, any[]> = {}
    
    // Use both current staff and historical fixed staff names
    const currentStaffNames = staffMembers.map(s => s.name)
    const allStaffNames = Array.from(new Set([...FIXED_STAFF_NAMES, ...currentStaffNames]))

    // Build a map of project prices for quick lookup
    const projectPrices: Record<string, number> = {}
    SERVICE_CATEGORIES.forEach(cat => {
      cat.items.forEach(item => {
        projectPrices[item.name] = item.price
      })
    })

    allStaffNames.forEach(name => {
      const amountKey = `金额_${name}`
      const staff = staffMembers.find(s => s.name === name)
      const staffId = staff?.id
      
      flow[name] = events
        .filter(e => {
          // 1. Check staff-specific column (already checked out)
          const amount = Number(e[amountKey]) || 0
          if (amount > 0) return true
          
          // 2. Check notes for dynamic amount [NAME_AMT:100] (already checked out)
          if (e["备注"]?.includes(`[${name}_AMT:`)) return true
          
          // 3. Check for explicit staff binding (even if not checked out)
          if (staffId) {
            // Check [ITEM_STAFF:staffId] pattern
            if (e["备注"]?.includes(`_STAFF:${staffId}]`)) return true
            // Check [STAFF_SEQ:...,staffId,...] pattern
            const seqMatch = e["备注"]?.match(/\[STAFF_SEQ:([^\]]+)\]/)
            if (seqMatch && seqMatch[1].split(',').includes(staffId)) return true
            // 4. Check for Main Staff binding in 备注: 技师:staffId
            if (e["备注"]?.includes(`技师:${staffId}`)) return true
          }
          
          return false
        })
        .sort((a, b) => {
          const dateCompare = b.服务日期.localeCompare(a.服务日期)
          if (dateCompare !== 0) return dateCompare
          return b.开始时间.localeCompare(a.开始时间)
        })
        .slice(0, 15) // Show a bit more for flow
        .map(e => {
          let amount = Number(e[amountKey]) || 0
          
          // If no direct amount, try to find in notes [NAME_AMT:XX]
          if (amount === 0) {
            const noteMatch = e["备注"]?.match(new RegExp(`\\[${name}_AMT:(\\d+)\\]`))
            if (noteMatch) {
              amount = Number(noteMatch[1])
            }
          }

          // If still no amount, it means it's not checked out yet.
          // Try to find projects specifically assigned to this staff.
          let projectDisplay = e.服务项目
          if (amount === 0 && staffId) {
            const projects = e.服务项目.split(',').map((s: string) => s.trim()).filter(Boolean)
            const assignedProjects: string[] = []
            let totalEstimatedAmount = 0

            // Check individual item bindings
            projects.forEach((proj: string, idx: number) => {
              const isAssigned = e["备注"]?.includes(`[${proj}_STAFF:${staffId}]`) || 
                                 (() => {
                                   const seqMatch = e["备注"]?.match(/\[STAFF_SEQ:([^\]]+)\]/)
                                   if (!seqMatch) return false
                                   const seq = seqMatch[1].split(',')
                                   return seq[idx] === staffId
                                 })() ||
                                 // Check if it's the main staff and NO specific item bindings exist for other staff
                                 (e["备注"]?.includes(`技师:${staffId}`) && !e["备注"]?.includes(`_STAFF:`))
              
              if (isAssigned) {
                assignedProjects.push(proj)
                totalEstimatedAmount += projectPrices[proj] || 0
              }
            })

            if (assignedProjects.length > 0) {
              projectDisplay = assignedProjects.join(', ')
              amount = totalEstimatedAmount
            }
          }
          
          return {
            time: e.开始时间,
            project: projectDisplay,
            amount: amount
          }
        })
    })
    return flow
  }, [events, staffMembers])

  const memberStats = useMemo(() => {
    const members: Record<string, { spend: number, visits: number }> = {}
    const staffPrefs: Record<string, number> = {}
    const projectPrefs: Record<string, number> = {}

    const currentStaffNames = staffMembers.map(s => s.name)
    const allStaffNames = Array.from(new Set([...FIXED_STAFF_NAMES, ...currentStaffNames]))
    
    // Build project prices for estimation
    const projectPrices: Record<string, number> = {}
    SERVICE_CATEGORIES.forEach(cat => {
      cat.items.forEach(item => {
        projectPrices[item.name] = item.price
      })
    })

    events.forEach(e => {
      const memberInfo = e.会员信息 || (lang === 'zh' ? '散客' : 'Anonimo')
      const project = e.服务项目 || (lang === 'zh' ? '未知' : 'Sconosciuto')
      
      let eventTotal = 0
      let eventHasAnyAmount = false
      
      // 1. Check columns for all staff names (Realized)
      allStaffNames.forEach(name => {
        const amt = Number(e[`金额_${name}`]) || 0
        if (amt > 0) {
          eventTotal += amt
          staffPrefs[name] = (staffPrefs[name] || 0) + 1
          eventHasAnyAmount = true
        }
      })

      // 2. Check notes for dynamic staff amounts [NAME_AMT:100] or [NAME_AMT:100_IDX:0] (Realized)
      const noteContent = e["备注"] || ""
      const amtMatches = Array.from(noteContent.matchAll(/\[([^\]]+)_AMT:(\d+)(?:_IDX:\d+)?\]/g))
      amtMatches.forEach((match: any) => {
        const name = match[1]
        const amount = Number(match[2]) || 0
        if (amount > 0) {
          if (!members[memberInfo]) {
            members[memberInfo] = { spend: 0, visits: 0 }
          }
          members[memberInfo].spend += amount
          staffPrefs[name] = (staffPrefs[name] || 0) + 1
          eventHasAnyAmount = true
        }
      })

      // 3. If no realized amount yet, estimate for "Booked" status
      if (!eventHasAnyAmount) {
        // Use project prices to estimate
        const projects = (e.服务项目 || "").split(',').map((s: string) => s.trim()).filter(Boolean)
        let estimatedTotal = 0
        projects.forEach((p: string) => {
          estimatedTotal += projectPrices[p] || 0
        })
        eventTotal = estimatedTotal

        // Attribute to main staff for prefs
        const mainStaffIdMatch = noteContent.match(/技师:([^,\]\s]+)/)
        const mainStaffId = mainStaffIdMatch ? mainStaffIdMatch[1] : null
        const mainStaff = staffMembers.find(s => s.id === mainStaffId)
        if (mainStaff) {
          staffPrefs[mainStaff.name] = (staffPrefs[mainStaff.name] || 0) + 1
        }
      }

      if (!members[memberInfo]) {
        members[memberInfo] = { spend: 0, visits: 0 }
      }
      members[memberInfo].spend += eventTotal
      members[memberInfo].visits += 1
      projectPrefs[project] = (projectPrefs[project] || 0) + 1
    })

    const walkInLabel = lang === 'zh' ? '散客' : 'Anonimo'
    
    const getRanking = (type: 'spend' | 'visits') => {
      const allEntries = Object.entries(members).map(([name, data]) => ({
        name,
        value: type === 'spend' ? data.spend : data.visits
      }))

      // 1. Separate members and walk-ins
      // Members: anything that doesn't include the walk-in label
      const memberEntries = allEntries.filter(e => !e.name.includes(walkInLabel))
      // Walk-ins: anything that includes the walk-in label
      const walkInEntries = allEntries.filter(e => e.name.includes(walkInLabel))

      // 2. Sort members descending and take top 9
      const sortedMembers = memberEntries.sort((a, b) => b.value - a.value).slice(0, 9)

      // 3. Sum all walk-ins into one "散客" entry
      const totalWalkInValue = walkInEntries.reduce((sum, e) => sum + e.value, 0)
      
      const finalRanking = [...sortedMembers]
      
      // 4. Always add walk-in entry at the end if it has data or exists
      if (totalWalkInValue > 0 || walkInEntries.length > 0) {
        finalRanking.push({ name: walkInLabel, value: totalWalkInValue })
      }
      
      return finalRanking.slice(0, 10)
    }

    let spendRanking = getRanking('spend')
    let visitRanking = getRanking('visits')

    // Mock data for preview if empty
    if (spendRanking.length === 0 && events.length === 0) {
      spendRanking = [
        { name: '(0001) 会员A', value: 580 },
        { name: '(0002) 会员B', value: 420 },
        { name: '(0003) 会员C', value: 350 },
        { name: walkInLabel, value: 2100 }
      ]
      visitRanking = [
        { name: '(0001) 会员A', value: 5 },
        { name: '(0002) 会员B', value: 3 },
        { name: walkInLabel, value: 42 }
      ]
    }

    const projectRanking = Object.entries(projectPrefs)
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    const staffRanking = Object.entries(staffPrefs)
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    return { spendRanking, visitRanking, projectRanking, staffRanking }
  }, [events, lang])

  if (!isOpen) return null

  const tabs = [
    { id: 'overview', label: lang === 'zh' ? '经营数据' : 'Panoramica' },
    { id: 'members', label: lang === 'zh' ? '消费分析' : 'Membri' }
  ]

  const timeOptions: { id: TimeRange; label: string }[] = [
    { id: 'day', label: lang === 'zh' ? '日' : 'D' },
    { id: 'week', label: lang === 'zh' ? '周' : 'S' },
    { id: 'month', label: lang === 'zh' ? '月' : 'M' },
    { id: 'year', label: lang === 'zh' ? '年' : 'A' }
  ]

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
    >
      {/* Background Overlay - Slight darkening for depth (Removed to match Calendar modal) */}

      {/* Main Container - Floating Glassmorphism (More transparent) */}
      <div 
        className={cn(
          "relative w-full h-full max-w-[95%] max-h-[90%] overflow-hidden",
          "bg-white/[0.03] backdrop-blur-sm border border-white/30 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] ring-1 ring-white/10",
          "flex flex-col"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Tabs & Navigation */}
        <div className="relative flex items-center justify-between px-8 py-6 border-b border-white/5">
          {/* Left: Tabs */}
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "text-lg font-black tracking-widest relative pb-2",
                  activeTab === tab.id 
                    ? "text-white" 
                    : "text-white/40 hover:text-white/60"
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Center: Floating Date Display (Image 2 style with animation) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none overflow-hidden py-2">
            {(() => {
              const { start, end } = getDateRange(timeRange, baseDate)
              const dateStr = timeRange === 'day' ? format(start, 'yyyy-MM-dd') :
                              timeRange === 'year' ? format(start, 'yyyy') :
                              `${format(start, 'MM-dd')} ~ ${format(end, 'MM-dd')}`
              
              return (
                  <span 
                    key={dateStr}
                    className={cn(
                      "block text-3xl font-black italic tracking-[0.2em] uppercase",
                      "bg-gradient-to-r from-white/10 via-white/80 to-white/10 bg-[length:200%_auto] bg-clip-text text-transparent",
                      "drop-shadow-[0_4px_12px_rgba(255,255,255,0.15)]"
                    )}
                  >
                    {dateStr}
                  </span>
              )
            })()}
          </div>
          
          {/* Right: Navigation Cluster */}
          <div className="flex items-center space-x-4">
            {/* Date Range Navigator */}
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => handleNavigate('prev')}
                className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/10">
                {timeOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setTimeRange(option.id)
                      setBaseDate(new Date())
                    }}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-bold",
                      timeRange === option.id 
                        ? "bg-white text-black shadow-lg shadow-white/10" 
                        : "text-white/40 hover:text-white/60"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => handleNavigate('next')}
                className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'overview' ? (
            <div className="flex flex-col space-y-8">
              {/* Top Section: Staff Performance (More transparent) */}
              <div className="bg-white/[0.01] rounded-3xl border border-white/[0.05] p-8 relative group flex items-stretch">
                {/* 1. Left: Vertical Title (Single column, upright text) */}
                <div className="w-10 flex flex-col items-center justify-center border-r border-white/10 pr-4 shrink-0 space-y-1">
                  {(lang === 'zh' ? '员工业绩排行' : 'STAFF').split('').map((char, i) => (
                    <span key={i} className="text-[11px] font-black text-white/50 leading-tight uppercase drop-shadow-sm">
                      {char}
                    </span>
                  ))}
                </div>

                {/* 2. Middle: Horizontal Bars Cluster (Compact and centered) */}
                <div className="flex-1 px-10 flex flex-col justify-center space-y-3 py-1 overflow-y-auto custom-scrollbar max-h-[300px]">
                  {stats.sortedStats.map((staff, idx) => {
                    const maxAmount = Math.max(...stats.sortedStats.map(s => s.amount), 1)
                    const percentage = (staff.amount / maxAmount) * 100
                    
                    return (
                      <div key={staff.name} className="flex items-center space-x-4 group/item">
                        <div className="w-12 text-[10px] font-black text-white/60 group-hover/item:text-white shrink-0 drop-shadow-sm">
                          {staff.name}
                        </div>
                        <div className="flex-1 h-3.5 bg-white/10 rounded-full relative overflow-hidden border border-white/5">
                          {/* Progress Bar with Gradient */}
                          <div 
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-500 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                            style={{ width: `${percentage}%` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                          </div>
                          
                          {/* Amount Display */}
                          <div className="absolute inset-y-0 right-3 flex items-center">
                            <span className="text-[10px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                              €{staff.amount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 3. Right: Grand Total (Always visible layout) */}
                <div className="w-44 flex flex-col items-center justify-center border-l border-white/10 pl-8 shrink-0">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2 drop-shadow-sm">
                    {lang === 'zh' ? '总计业绩' : 'Totale Lordo'}
                  </span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-lg font-black text-white/90 font-mono">€</span>
                    <span className="text-5xl font-black text-white font-mono tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                      {stats.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Section (Three-column layout consistent with top) */}
              <div className="flex-1 flex space-x-8 min-h-0">
                {/* Left: Project Ranking (More transparent) */}
                <div className="w-1/3 bg-white/[0.01] rounded-3xl border border-white/[0.05] p-6 flex items-stretch group">
                  {/* Vertical Title Sidebar */}
                  <div className="w-8 flex flex-col items-center justify-start border-r border-white/10 pr-4 shrink-0 space-y-1 pt-1">
                    {(lang === 'zh' ? '热门项目排行' : 'PROJECTS').split('').map((char, i) => (
                      <span key={i} className="text-[10px] font-black text-white/50 leading-tight uppercase drop-shadow-sm">
                        {char}
                      </span>
                    ))}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 flex flex-col pl-6 -mt-1.5 min-h-0">
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 pt-0 pb-6 max-h-[400px]">
                      {projectStats.map((item, i) => {
                        const maxCount = Math.max(...projectStats.map(p => p.count), 1)
                        const width = (item.count / maxCount) * 100
                        
                        return (
                          <div key={i} className="flex flex-col space-y-1.5 group/item">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-white/80 group-hover/item:text-white truncate pr-2 drop-shadow-sm">
                                {item.name}
                              </span>
                              <span className="text-white font-black">
                                {item.count}{lang === 'zh' ? '次' : 'v'}
                              </span>
                            </div>
                            <div className="h-1 bg-white/10 rounded-full overflow-hidden border border-white/5">
                              <div 
                                className="h-full bg-gradient-to-r from-indigo-600 to-purple-400 rounded-full shadow-[0_0_5px_rgba(129,140,248,0.2)]"
                                style={{ width: `${width}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Right: Real-time Flow (More transparent) */}
                <div className="flex-1 bg-white/[0.01] rounded-3xl border border-white/[0.05] p-6 flex items-stretch group">
                  {/* Vertical Title Sidebar */}
                  <div className="w-8 flex flex-col items-center justify-center border-r border-white/10 pr-4 shrink-0 space-y-1">
                    {(lang === 'zh' ? '实时服务流水' : 'FLOW').split('').map((char, i) => (
                      <span key={i} className="text-[10px] font-black text-white/50 leading-tight uppercase drop-shadow-sm">
                        {char}
                      </span>
                    ))}
                  </div>

                  {/* Content (Dynamic columns) */}
                  <div className="flex-1 flex flex-col min-h-0 pl-6">
                    <div 
                      className="flex-1 grid gap-4 min-h-0"
                      style={{ 
                        gridTemplateColumns: `repeat(${stats.staffStats.length}, minmax(0, 1fr))` 
                      }}
                    >
                      {stats.staffStats.map(s => {
                        const name = s.name
                        return (
                          <div key={name} className="flex flex-col min-w-0">
                            <div className="h-10 flex flex-col justify-end pb-1 -mt-6">
                              <div className="text-[10px] font-black text-white/40 text-center uppercase tracking-tighter drop-shadow-sm">
                                {name}
                              </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 pt-1 max-h-[400px]">
                              {staffFlow[name]?.map((item, i) => (
                                <div key={i} className="bg-white/10 rounded-lg p-2 border border-white/10 hover:bg-white/20 shadow-sm">
                                  <div className="text-[8px] font-bold text-white/40 mb-1">
                                    {item.time}
                                  </div>
                                  <div className="text-[9px] font-black text-white/90 truncate drop-shadow-sm flex items-center justify-between gap-2">
                                    <span className="truncate">{item.project}</span>
                                    <span className="text-white font-black shrink-0">€{item.amount}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-8">
              {/* Member Rankings (Img 4 style) */}
                {[
                  { title: lang === 'zh' ? '消费排行' : 'Spesa', data: memberStats.spendRanking, unit: '€', isSpecial: true },
                  { title: lang === 'zh' ? '到店频次' : 'Visite', data: memberStats.visitRanking, unit: '次', isSpecial: true },
                  { title: lang === 'zh' ? '技师人气' : 'Staff', data: memberStats.staffRanking, unit: '次', isSpecial: true }
                ].map((section, idx) => (
                  <div key={idx} className="bg-white/[0.01] rounded-3xl border border-white/[0.05] p-6 flex flex-col group">
                    <h4 className="text-xs font-black text-white/40 mb-6 uppercase tracking-[0.2em] px-2 text-center">
                      {section.title}
                    </h4>
                  
                  <div className="px-2 relative flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[400px] pr-2">
                      {section.isSpecial ? (
                      /* Special Style: Label outside, Value inside, with separator line */
                      <div className="relative flex flex-col space-y-4 min-h-full">
                        {/* Vertical Separator Line */}
                        <div className="absolute left-10 top-0 bottom-0 w-[1px] bg-white/10" />
                        
                        {section.data.map((item, i) => {
                           const maxValue = Math.max(...section.data.map(d => d.value), 1)
                           const percentage = (item.value / maxValue) * 100
                           
                           const displayId = item.name.match(/\((.*?)\)/)?.[1] || item.name;
                           
                           return (
                             <div key={i} className="flex items-center space-x-3 group/item relative">
                               <div className="w-10 text-[10px] font-black text-white/50 group-hover/item:text-white shrink-0 drop-shadow-sm text-right pr-4">
                                 {displayId}
                               </div>
                               <div className="flex-1 flex items-center space-x-2">
                                 <div className="flex-1 h-1.5 relative bg-white/5 rounded-full overflow-hidden">
                                   <div 
                                     className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-cyan-400 shadow-lg shadow-blue-500/10 rounded-full"
                                     style={{ width: `${percentage}%` }}
                                   />
                                 </div>
                                 <span className="text-[10px] font-black text-white/80 whitespace-nowrap min-w-[40px]">
                                   {section.unit === '€' ? '€' : ''}{item.value.toLocaleString()}{section.unit !== '€' ? section.unit : ''}
                                 </span>
                               </div>
                             </div>
                           )
                         })}
                      </div>
                    ) : (
                      /* Standard Style for Project/Staff */
                      <div className="space-y-4">
                        {section.data.map((item, i) => {
                          const maxValue = Math.max(...section.data.map(d => d.value), 1)
                          const width = (item.value / maxValue) * 100
                          
                          return (
                            <div key={i} className="flex flex-col space-y-1.5 group/item">
                              <div className="flex justify-between text-[10px] font-bold">
                                <span className="text-white/60 group-hover/item:text-white truncate pr-2">
                                  {item.name}
                                </span>
                                <span className="text-white font-black">
                                  {section.unit === '€' ? `€${item.value.toLocaleString()}` : `${item.value}${section.unit}`}
                                </span>
                              </div>
                              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                                  style={{ width: `${width}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 6s infinite linear;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  )
}
