import React, { useEffect, useMemo } from 'react'
import { 
  format
} from 'date-fns'
import { 
  Calendar as CalendarIcon, 
  ChevronDown,
  Sparkles,
  TrendingUp,
  CloudSun,
  ShieldCheck,
  Zap,
  Heart,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  useMemberData
} from '../hooks'
import { useAISelfPlay } from '@/modules/booking/hooks/useAISelfPlay'
import { 
  I18N, 
  getStaffColorClass 
} from '@/utils/calendar-constants'
import BillingContent from './BillingContent'
import { ServiceSelectionView } from './ServiceSelectionView'
import { MemberDetailView } from './MemberDetailView'
import { KeypadOverlay } from './KeypadOverlay'
import { StaffSelectionView } from './StaffSelectionView'
import { TimeSelectionClock } from '@/modules/core/components/TimeSelectionClock'
import { DatePickerView } from './DatePickerView'
import { DurationPickerView } from './DurationPickerView'
import { MemberSearchResults } from './MemberSearchResults'
import { ColoredServiceTitle } from '@/modules/core/components/ColoredServiceTitle'
import { StatusBadge } from '@/modules/core/components/StatusBadge'
import { TimeDisplayBox } from '@/modules/core/components/TimeDisplayBox'
import { ModalContainer, ModalHeader, LabeledContainer, ModalInput, ModalSelectBox } from '@/modules/core/components/ModalElements'

import { addMinutes } from 'date-fns'

import { CalendarEvent, Member, StaffMember } from '@/utils/calendar-constants'
import { GlobalPassport, IndustryType } from '@/modules/core/types/omni-flow'
import { LIQUID_UI_CONFIGS } from '@/modules/core/config/liquid-ui-config'

interface EventModalProps {
  lang: 'zh' | 'it'
  mode: 'admin' | 'customer'
  isModalOpen: boolean
  isCalendarLocked: boolean
  editingEvent: CalendarEvent | null
  newTitle: string
  setNewTitle: (title: string) => void
  memberInfo: string
  setMemberInfo: (info: string) => void
  selectedMember: Member | null
  setSelectedMember: React.Dispatch<React.SetStateAction<Member | null>>
  globalPassport: GlobalPassport | null
  setGlobalPassport: React.Dispatch<React.SetStateAction<GlobalPassport | null>>
  memberName: string
  setMemberName: (name: string) => void
  memberId: string
  memberNote: string
  setMemberNote: (note: string) => void
  isNewMember: boolean
  today: Date
  showServiceSelection: boolean
  setShowServiceSelection: (show: boolean) => void
  showMemberDetail: boolean
  setShowMemberDetail: (show: boolean) => void
  showCheckoutPreview: boolean
  setShowCheckoutPreview: (show: boolean) => void
  isDatePickerOpen: boolean
  setIsDatePickerOpen: (open: boolean) => void
  isDurationPickerOpen: boolean
  setIsDurationPickerOpen: (open: boolean) => void
  selectedDate: Date | null
  setSelectedDate: (date: Date | null) => void
  selectedEndDate: Date | null
  setSelectedEndDate: (date: Date | null) => void
  duration: number
  setDuration: (duration: number) => void
  selectedStaffId: string
  selectedStaffIds: string[]
  itemStaffMap: Record<string, string>
  staffMembers: StaffMember[]
  memberSearchQuery: string
  setMemberSearchQuery: (query: string) => void
  showTimeSelection: boolean
  setShowTimeSelection: (show: boolean) => void
  timeSelectionType: 'start' | 'end'
  showCustomKeypad: boolean
  setShowCustomKeypad: (show: boolean) => void
  keypadTargetKey: { key: string; staffId?: string; basePrice?: number; name?: string } | null
  setKeypadTargetKey: (key: { key: string; staffId?: string; basePrice?: number; name?: string } | null) => void
  mergedTotalPrice: number
  atomicSplits: {
    merchant: number;
    staff: number;
    platform: number;
  }
  mergedEvents: any[]
  allDatabaseEvents: CalendarEvent[]
  involvedStaffIds: string[]
  staffAmounts: Record<string, string>
  setStaffAmounts: (val: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
  customItemPrices: Record<string, string>
  setCustomItemPrices: (val: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
  manualTotalAmount: string | null
  setManualTotalAmount: (val: string | null | ((prev: string | null) => string | null)) => void
  editingPriceItemKey: string | null
  setEditingPriceItemKey: (key: string | null) => void
  clickedStaffId: string
  isDesignatedMode: boolean
  resourceLoadFactors: Record<string, number>
  aiSchedulingInsights: string[]
  predictedOccupancy: Record<string, number>
  setIsDesignatedMode: (mode: boolean) => void
  setItemStaffMap: (map: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
  setSelectedStaffId: (id: string) => void
  setSelectedStaffIds: (ids: string[]) => void
  onToggleService: (service: string) => void
  switchTimeSelection: (type: 'start' | 'end') => void
  gestureTime: { h: number | null; m: number | null; p: 'AM' | 'PM' }
  setGestureTime: (time: { h: number | null; m: number | null; p: 'AM' | 'PM' } | ((prev: { h: number | null; m: number | null; p: 'AM' | 'PM' }) => { h: number | null; m: number | null; p: 'AM' | 'PM' })) => void
  activeHour: number | null
  gestureRef: React.RefObject<any> | null
  isSubmitting: boolean
  handleSubmit: (
    e?: React.FormEvent | React.MouseEvent, 
    forcedMode?: 'normal' | 'sequential' | 'parallel', 
    isCheckout?: boolean,
    aiDynamicPriceFactor?: number,
    aiStrategyId?: string
  ) => Promise<void>
  handleSelectMember: (member: Member) => void
  handleNewMember: (query: string) => void
  generateMemberId: (category: 'young' | 'middle' | 'senior' | 'male' | 'noshow') => void
  getRecommendedSlots: (date: Date, staffId: string, events: any[]) => string[]
  industryType?: IndustryType
}

export const EventModal: React.FC<EventModalProps> = ({ 
  lang, 
  mode,
  isModalOpen,
  isCalendarLocked,
  editingEvent,
  newTitle, setNewTitle,
  memberInfo, setMemberInfo,
  selectedMember, setSelectedMember,
  globalPassport, setGlobalPassport,
  memberName, setMemberName,
  memberId,
  memberNote, setMemberNote,
  isNewMember,
  today,
  showServiceSelection, setShowServiceSelection,
  showMemberDetail, setShowMemberDetail,
  showCheckoutPreview, setShowCheckoutPreview,
  isDatePickerOpen, setIsDatePickerOpen,
  isDurationPickerOpen, setIsDurationPickerOpen,
  selectedDate, setSelectedDate,
  selectedEndDate, setSelectedEndDate,
  duration, setDuration,
  selectedStaffId, 
  selectedStaffIds, 
  itemStaffMap, 
  staffMembers,
  memberSearchQuery, setMemberSearchQuery,
  showTimeSelection, setShowTimeSelection, 
  timeSelectionType, 
  showCustomKeypad, setShowCustomKeypad,
  keypadTargetKey, setKeypadTargetKey,
  mergedTotalPrice, atomicSplits, mergedEvents, allDatabaseEvents, involvedStaffIds,
  staffAmounts, setStaffAmounts,
  customItemPrices, setCustomItemPrices,
  manualTotalAmount, setManualTotalAmount,
  editingPriceItemKey, setEditingPriceItemKey,
  clickedStaffId,
  isDesignatedMode, setIsDesignatedMode,
  resourceLoadFactors,
  aiSchedulingInsights,
  predictedOccupancy,
  setItemStaffMap,
  setSelectedStaffId,
  setSelectedStaffIds,
  onToggleService,
  switchTimeSelection, gestureTime, setGestureTime, activeHour, gestureRef,
  isSubmitting,
  handleSubmit,
  handleSelectMember,
  handleNewMember,
  generateMemberId,
  getRecommendedSlots,
  industryType = 'beauty'
}) => {
  const config = LIQUID_UI_CONFIGS[industryType] || LIQUID_UI_CONFIGS.generic;
  const { allMembers, filteredMembers } = useMemberData({ 
    allDatabaseEvents, 
    staffMembers, 
    memberSearchQuery 
  })

  // --- AI 自我博弈调度引擎 (Evolution Gene: AI Self-Play) ---
  const { negotiatePricing, isNegotiating } = useAISelfPlay()
  const [negotiationResult, setNegotiationResult] = React.useState<any>(null)

  // 监听资源与服务变更，触发博弈
  React.useEffect(() => {
    const triggerNegotiation = async () => {
      const staff = staffMembers.find(s => s.id === selectedStaffId)
      if (!staff || mergedEvents.length === 0) return

      const load = resourceLoadFactors[selectedStaffId] || 0
      const service = { 
        name: mergedEvents.map(e => e.title).join(', '),
        base_price: mergedTotalPrice 
      } as any

      const result = await negotiatePricing(staff as any, service, load)
      setNegotiationResult(result)
    }

    if (isModalOpen) triggerNegotiation()
  }, [selectedStaffId, mergedEvents.length, isModalOpen, negotiatePricing, resourceLoadFactors, mergedTotalPrice])

  // --- AI 经理引擎：预测性调度建议 (微步 24.1: 集成全局 AI 洞察) ---
  const aiSuggestion = useMemo(() => {
    // 1. 优先使用博弈结果
    if (negotiationResult) {
      return {
        type: negotiationResult.final_price_factor > 1.1 ? 'warning' : 
              negotiationResult.final_price_factor < 0.95 ? 'success' : 'info',
        title: 'AI 双代理博弈达成共识',
        content: `博弈结果：建议系数 ${negotiationResult.final_price_factor.toFixed(2)}。员工满意度 ${(negotiationResult.staff_satisfaction * 100).toFixed(0)}%，商户满意度 ${(negotiationResult.merchant_satisfaction * 100).toFixed(0)}%。`,
        factor: negotiationResult.final_price_factor,
        currentStaffLoad: resourceLoadFactors[selectedStaffId] || 0,
        predictedStaffLoad: predictedOccupancy[selectedStaffId] || 0,
        strategyId: negotiationResult.final_price_factor > 1 ? 'ST_PEAK_SURGE' : 'ST_OFFPEAK_PROMO',
        log: negotiationResult.negotiation_log
      }
    }
    return null
  }, [negotiationResult, resourceLoadFactors, selectedStaffId, predictedOccupancy])

  // 4. 获取 AI 推荐时段 (微步 25.1)
  const recommendedSlots = useMemo(() => {
    if (!selectedDate || !selectedStaffId || !getRecommendedSlots) return [];
    return getRecommendedSlots(selectedDate, selectedStaffId, allDatabaseEvents);
  }, [selectedDate, selectedStaffId, allDatabaseEvents, getRecommendedSlots]);
  
  if (!isModalOpen || (mode === 'admin' && isCalendarLocked) || !selectedDate || !selectedEndDate) return null

  return (
    <ModalContainer>
      <form onSubmit={(e) => handleSubmit(e, undefined, undefined, aiSuggestion?.factor, aiSuggestion?.strategyId)} className="flex flex-col">
        <div className={cn(
          "grid items-start transition-all duration-300",
          (showCheckoutPreview && !showCustomKeypad) ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
        )}>
          {/* Left Column - Core Info */}
          {(!showCheckoutPreview || showCustomKeypad) && (
            <div className="p-6 pb-0 space-y-2">
              <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                {/* Title Section - Centered */}
                <ModalHeader title={industryType === 'beauty' ? 'RAPALLO' : config.viewName[lang]}>
                  {editingEvent && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {/* AI 运筹引擎：动态调价标识 */}
                      {editingEvent.dynamic_price_factor && editingEvent.dynamic_price_factor !== 1 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 animate-pulse">
                          <TrendingUp className="w-3 h-3 text-amber-500" />
                          <span className="text-[10px] font-black text-amber-500 uppercase">
                            {editingEvent.dynamic_price_factor > 1 ? '+' : ''}{(Math.round((editingEvent.dynamic_price_factor - 1) * 100))}%
                          </span>
                        </div>
                      )}
                      <StatusBadge 
                        status={editingEvent.status || (editingEvent.notes?.includes('COMPLETED') ? 'completed' : 'confirmed')} 
                        lang={lang} 
                      />
                    </div>
                  )}
                </ModalHeader>

                {/* 全球服务护照：无感偏好引擎 */}
                {globalPassport && (
                  <div className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between px-3 py-2 bg-indigo-500/10 border-b border-indigo-500/10">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Global Service Passport</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400 fill-current animate-pulse" />
                        <span className="text-[9px] font-bold text-amber-500/80">已同步全球画像</span>
                      </div>
                    </div>
                    
                    <div className="p-3 grid grid-cols-2 gap-3">
                      {/* 核心偏好 */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-rose-400" />
                          <span className="text-[9px] font-bold text-zinc-400 uppercase">服务偏好</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {globalPassport.preferences?.allergies && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-[9px] font-medium text-rose-400">
                              ⚠️ 过敏: {globalPassport.preferences.allergies}
                            </span>
                          )}
                          {globalPassport.preferences?.favorite_services?.map((s: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-[9px] font-medium text-indigo-300">
                              ★ {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 消费行为 */}
                      <div className="space-y-1.5 border-l border-white/5 pl-3">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                          <span className="text-[9px] font-bold text-zinc-400 uppercase">价值画像</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-zinc-500">全球积分</span>
                            <span className="text-[10px] font-black text-emerald-400">{globalPassport.loyalty_points || 0}</span>
                          </div>
                          {globalPassport.preferences?.avg_spend && (
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-zinc-500">平均消费</span>
                              <span className="text-[10px] font-black text-white">¥{globalPassport.preferences.avg_spend}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* AI 建议备注 */}
                    {globalPassport.preferences?.ai_note && (
                      <div className="px-3 py-2 bg-black/20 border-t border-white/5 flex items-start gap-2">
                        <AlertCircle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-[9px] text-zinc-400 italic leading-tight">
                          AI 提醒：{globalPassport.preferences.ai_note}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* AI 运筹引擎：预测性调度建议 (顶级 AI 经理能力) */}
                {aiSuggestion && (
                  <>
                    <div className={cn(
                      "mb-4 space-y-2 p-3 rounded-2xl border transition-all duration-500",
                      aiSuggestion.type === 'warning' ? "bg-rose-500/10 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]" :
                      aiSuggestion.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]" :
                      aiSuggestion.type === 'info' ? "bg-blue-500/10 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]" :
                      "bg-white/5 border-white/10"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className={cn(
                            "w-3.5 h-3.5",
                            aiSuggestion.type === 'warning' ? "text-rose-400" :
                            aiSuggestion.type === 'success' ? "text-emerald-400" :
                            aiSuggestion.type === 'info' ? "text-blue-400" :
                            "text-purple-400"
                          )} />
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                            {I18N[lang].aiInsights} • {aiSuggestion.title}
                          </span>
                        </div>
                        {aiSuggestion.factor !== 1 && (
                          <div className={cn(
                            "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter",
                            aiSuggestion.factor > 1 ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
                          )}>
                            <TrendingUp className="w-2.5 h-2.5" />
                            {aiSuggestion.factor > 1 ? '+' : ''}{Math.round((aiSuggestion.factor - 1) * 100)}% 动态调价
                          </div>
                        )}
                      </div>
                      
                      <p className="text-[10px] text-zinc-300 font-medium leading-relaxed italic">
                        “{aiSuggestion.content}”
                      </p>

                      {/* 博弈详情日志 (Evolution Gene: Self-Play Visualization) */}
                      {aiSuggestion.log && (
                        <div className="mt-3 space-y-1.5 border-t border-white/5 pt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">博弈思维链 (Self-Play Log)</span>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                <span className="text-[7px] text-zinc-500">Staff Agent</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span className="text-[7px] text-zinc-500">Merchant Agent</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1 max-h-[60px] overflow-y-auto pr-1 custom-scrollbar">
                            {aiSuggestion.log.map((entry: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-2">
                                <div className={cn(
                                  "w-1 h-1 rounded-full mt-1 shrink-0",
                                  entry.includes('Staff') ? "bg-indigo-500" : 
                                  entry.includes('Merchant') ? "bg-amber-500" : "bg-zinc-600"
                                )} />
                                <p className="text-[8px] text-zinc-400 font-medium leading-tight">
                                  {entry}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-1 opacity-60">
                        <div className="flex items-center gap-1">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            aiSuggestion.currentStaffLoad > 0.8 ? "bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]" : "bg-emerald-500"
                          )} />
                          <span className="text-[9px] font-bold text-zinc-500 uppercase">
                            当前负荷: {(aiSuggestion.currentStaffLoad * 100).toFixed(0)}%
                          </span>
                        </div>
                        {aiSuggestion.predictedStaffLoad > 0 && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className={cn(
                              "w-3 h-3",
                              aiSuggestion.predictedStaffLoad > aiSuggestion.currentStaffLoad ? "text-rose-400" : "text-emerald-400"
                            )} />
                            <span className="text-[9px] font-bold text-zinc-500 uppercase">
                              预测趋势: {(aiSuggestion.predictedStaffLoad * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 资源冲突预警可视化 (微步 24.1) */}
                    {aiSuggestion.currentStaffLoad > 1.0 && (
                      <div className="mb-4 flex items-center gap-3 p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 animate-pulse">
                        <AlertCircle className="w-5 h-5 text-rose-500" />
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-rose-500 uppercase tracking-tighter">RESOURCE CONFLICT DETECTED</span>
                          <span className="text-[9px] text-rose-400/80 font-bold leading-tight">所选技师当前处于超负荷状态，AI 建议调整预约时间或更换技师。</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                {/* Row 2: Service & Member */}
                <div className="grid grid-cols-2 gap-3">
                  <LabeledContainer label="服务内容">
                    <ModalInput 
                      inputMode="none"
                      placeholder="输入服务项目..."
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onFocus={() => {
                        if (!showCheckoutPreview) {
                          setShowServiceSelection(true)
                          setShowMemberDetail(false)
                          setShowTimeSelection(false)
                        }
                      }}
                      required
                      overlay={
                        <ColoredServiceTitle 
                          title={newTitle}
                          items={newTitle.split(/(\s*,\s*)/).map((part, idx, array) => {
                            const trimmed = part.trim();
                            const isSeparator = part.includes(',');
                            if (isSeparator || !trimmed) return { text: part, colorClass: 'text-white/40' };
                            
                            // 计算当前是第几个非分隔符项目
                            const itemIdx = array.slice(0, idx).filter(p => p.trim() && !p.includes(',')).length;
                            const itemKey = `${editingEvent?.id || 'new'}-${trimmed}-${itemIdx}`;
                            const staffId = itemStaffMap[itemKey] || itemStaffMap[trimmed] || 
                                           (selectedStaffIds.length > 1 
                                             ? (selectedStaffIds[itemIdx] || selectedStaffIds[selectedStaffIds.length - 1]) 
                                             : selectedStaffId);
                            
                            return { 
                              text: part, 
                              colorClass: getStaffColorClass(staffId, staffMembers, 'text') 
                            };
                          })}
                        />
                      }
                    />
                  </LabeledContainer>
                  
                  <LabeledContainer label="客户信息" className="relative">
                    <ModalInput 
                      inputMode="none"
                      placeholder="姓名/卡号/电话"
                      value={memberInfo}
                      onChange={(e) => {
                        setMemberInfo(e.target.value)
                        setMemberSearchQuery(e.target.value)
                      }}
                      onFocus={() => {
                        setShowServiceSelection(false)
                        if (selectedMember) setShowMemberDetail(true)
                        setShowCheckoutPreview(false)
                        setShowTimeSelection(false)
                      }}
                    />
                    {/* Search Results Dropdown */}
                    <MemberSearchResults 
                      filteredMembers={filteredMembers}
                      memberSearchQuery={memberSearchQuery}
                      handleSelectMember={handleSelectMember}
                      handleNewMember={handleNewMember}
                    />
                  </LabeledContainer>
                </div>

                {/* Row 3: Date & Start Time */}
                <div className="grid grid-cols-2 gap-3">
                  <LabeledContainer label={I18N[lang].serviceDate} className="relative">
                    <ModalSelectBox 
                      onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                      value={selectedDate ? format(selectedDate, 'yyyy/MM/dd') : ''}
                      icon={<CalendarIcon className="w-4 h-4 text-white/60" />}
                    />
                    {/* Custom Date Picker Popup */}
                    {isDatePickerOpen && (
                      <DatePickerView 
                        selectedDate={selectedDate}
                        duration={duration}
                        onDateSelect={(newDate) => {
                          setSelectedDate(newDate);
                          setSelectedEndDate(addMinutes(newDate, duration));
                        }}
                        onClose={() => setIsDatePickerOpen(false)}
                      />
                    )}
                  </LabeledContainer>
                  
                  <TimeDisplayBox 
                    label={I18N[lang].startTime}
                    date={selectedDate}
                    isActive={showTimeSelection && timeSelectionType === 'start'}
                    hourSuffix={I18N[lang].hourSuffix}
                    minuteSuffix={I18N[lang].minuteSuffix}
                    onClick={() => switchTimeSelection('start')}
                  />
                </div>

                {/* AI 推荐时段 (微步 25.1) */}
                {recommendedSlots.length > 0 && (
                  <div className="mb-4 p-3 rounded-2xl bg-sky-500/5 border border-sky-500/10">
                    <div className="flex items-center gap-1.5 mb-2.5 px-1">
                      <Sparkles className="w-3 h-3 text-sky-400" />
                      <span className="text-[9px] font-black text-sky-400/80 uppercase tracking-widest">AI 经理推荐时段</span>
                    </div>
                    <div className="flex gap-2">
                      {recommendedSlots.map((slot: string) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => {
                            const [hours, minutes] = slot.split(':').map(Number);
                            const newDate = new Date(selectedDate);
                            newDate.setHours(hours, minutes, 0, 0);
                            setSelectedDate(newDate);
                            setSelectedEndDate(addMinutes(newDate, duration));
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 hover:border-sky-500/40 transition-all group relative overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-tr from-sky-400/0 to-sky-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="text-[11px] font-black text-sky-400 group-hover:scale-110 transition-transform relative z-10">
                            {slot}
                          </div>
                          <div className="text-[6px] font-bold text-sky-400/50 uppercase mt-0.5 relative z-10">
                            Optimal
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Row 4: Duration & End Time */}
                <div className="grid grid-cols-2 gap-3">
                  <LabeledContainer label={I18N[lang].duration} className="relative">
                    <ModalSelectBox 
                      onClick={() => setIsDurationPickerOpen(!isDurationPickerOpen)}
                      value={`${duration} ${I18N[lang].minutesSuffix}`}
                      icon={<ChevronDown className={cn("w-3.5 h-3.5 text-white/60 transition-transform", isDurationPickerOpen && "rotate-180")} />}
                    />
                    {/* Duration Picker Popover */}
                    {isDurationPickerOpen && (
                      <DurationPickerView 
                        lang={lang} 
                        duration={duration}
                        selectedDate={selectedDate}
                        onDurationSelect={(m) => {
                          setDuration(m);
                          if (selectedDate) setSelectedEndDate(addMinutes(new Date(selectedDate), m));
                        }}
                        onClose={() => setIsDurationPickerOpen(false)}
                      />
                    )}
                  </LabeledContainer>
                  
                  <TimeDisplayBox 
                    label={I18N[lang].endTime}
                    date={selectedEndDate}
                    isActive={showTimeSelection && timeSelectionType === 'end'}
                    hourSuffix={I18N[lang].hourSuffix}
                    minuteSuffix={I18N[lang].minuteSuffix}
                    onClick={() => switchTimeSelection('end')}
                  />
                </div>

                {/* Staff Section */}
                <StaffSelectionView 
                  staffMembers={staffMembers}
                  selectedStaffId={selectedStaffId}
                  setSelectedStaffId={setSelectedStaffId}
                  selectedStaffIds={selectedStaffIds}
                  setSelectedStaffIds={setSelectedStaffIds}
                  isDesignatedMode={isDesignatedMode}
                  setIsDesignatedMode={setIsDesignatedMode}
                  itemStaffMap={itemStaffMap}
                  setItemStaffMap={setItemStaffMap}
                  newTitle={newTitle}
                  industryType={industryType}
                  lang={lang}
                />
              </div>
            </div>
          )}

            {/* Right Column - Sub-views */}
            <div className={cn(
              "p-6 pb-0 space-y-2 bg-transparent min-h-[240px] overflow-visible transition-all duration-300",
              (showCheckoutPreview && !showCustomKeypad) && "max-w-2xl mx-auto w-full"
            )}>
              {showCheckoutPreview ? (
                <BillingContent 
                  staffMembers={staffMembers}
                  itemStaffMap={itemStaffMap}
                  staffAmounts={staffAmounts}
                  customItemPrices={customItemPrices}
                  editingPriceItemKey={editingPriceItemKey}
                  showCustomKeypad={showCustomKeypad}
                  manualTotalAmount={manualTotalAmount}
                  showCheckoutPreview={showCheckoutPreview}
                  setShowCheckoutPreview={setShowCheckoutPreview}
                  setEditingPriceItemKey={setEditingPriceItemKey}
                  setCustomItemPrices={setCustomItemPrices}
                  setStaffAmounts={setStaffAmounts}
                  setManualTotalAmount={setManualTotalAmount}
                  setKeypadTargetKey={setKeypadTargetKey}
                  setShowCustomKeypad={setShowCustomKeypad}
                  clickedStaffId={clickedStaffId}
                  mergedEvents={mergedEvents}
                  mergedTotalPrice={mergedTotalPrice}
                  atomicSplits={atomicSplits}
                  involvedStaffIds={involvedStaffIds}
                  resourceLoadFactors={resourceLoadFactors}
                  aiSchedulingInsights={aiSchedulingInsights}
                  predictedOccupancy={predictedOccupancy}
                />
              ) : showMemberDetail ? (
                <MemberDetailView 
                  lang={lang}
                  selectedMember={selectedMember}
                  setSelectedMember={setSelectedMember}
                  memberName={memberName}
                  setMemberName={setMemberName}
                  memberId={memberId}
                  memberNote={memberNote}
                  setMemberNote={setMemberNote}
                  isNewMember={isNewMember}
                  today={today}
                  onGenerateMemberId={(tagId: string) => generateMemberId(tagId as any)}
                  globalPassport={globalPassport}
                  onSyncPassport={() => {
                    if (selectedMember?.phone) {
                      handleSelectMember(selectedMember);
                    }
                  }}
                />
              ) : showTimeSelection ? (
                <TimeSelectionClock 
                  time={gestureTime}
                  onTimeChange={(newTime) => {
                    setGestureTime((prev) => ({ ...prev, ...newTime } as any))
                  }}
                  activeHour={activeHour}
                  containerRef={gestureRef as any}
                />
              ) : (
                <ServiceSelectionView 
                  newTitle={newTitle}
                  itemStaffMap={itemStaffMap}
                  selectedStaffId={selectedStaffId}
                  staffMembers={staffMembers}
                  editingEvent={editingEvent}
                  onToggleService={onToggleService}
                  industryType={industryType}
                />
              ) }
            </div>
          </div>
        </form>

        {showCustomKeypad && (
          <KeypadOverlay 
            keypadTargetKey={keypadTargetKey}
            manualTotalAmount={manualTotalAmount}
            setManualTotalAmount={setManualTotalAmount}
            staffAmounts={staffAmounts}
            setStaffAmounts={setStaffAmounts}
            customItemPrices={customItemPrices}
            setCustomItemPrices={setCustomItemPrices}
            staffMembers={staffMembers}
            setShowCustomKeypad={setShowCustomKeypad}
          />
        )}
    </ModalContainer>
  )
}
