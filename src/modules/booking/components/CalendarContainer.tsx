'use client'

import { useEffect, useRef } from 'react'
import { useCalendarStore } from '@/components/calendar/store/useCalendarStore'
import { 
  useCalendarInit,
  useCalendarData,
  useCalendarAuth, 
  useBillingState,
  useCheckoutInit,
  useTimeSelection,
  useEventOperations,
  useMemberData,
  useGridInteraction,
  useScrollLock,
  useRecycleBin,
  useStaffManagement
} from '@/components/calendar/hooks'
import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

import { 
  I18N,
  ViewType,
  APP_VERSION
} from '@/utils/calendar-constants'
import { IndustryType } from '@/modules/core/types/omni-flow'
import { StaffHeader } from '@/components/calendar/ui/StaffHeader'
import { Grid } from '@/components/calendar/ui/Grid'
import { MonthView } from '@/components/calendar/ui/MonthView'
import { YearView } from '@/components/calendar/ui/YearView'
import { SpatialMapView } from './SpatialMapView'
import { StationMapView } from './StationMapView'
import { NebulaView } from './NebulaView'
import { StrategyReview } from './StrategyReview'
import { LockOverlay } from '@/components/calendar/ui/LockOverlay'
import { RecycleBinModal } from '@/components/calendar/ui/RecycleBinModal'
import { StaffManagerModal } from '@/components/calendar/ui/StaffManagerModal'
import { EventModal } from '@/components/calendar/ui/EventModal'
import { BookingModal } from '@/components/calendar/ui/BookingModal'
import Header from '@/components/calendar/ui/Header'
import { CalendarHeader } from '@/components/calendar/ui/CalendarHeader'

interface CalendarContainerProps {
  initialDate?: Date
  initialView?: ViewType
  onToggleSidebar?: () => void
  onModalToggle?: (isOpen: boolean) => void
  lang?: 'zh' | 'it'
  mode?: 'admin' | 'customer'
  initialService?: string
  industryType?: IndustryType
}

export function CalendarContainer({ 
  initialDate, 
  initialView = 'day', 
  onToggleSidebar, 
  onModalToggle, 
  lang = 'zh',
  mode = 'admin',
  initialService,
  industryType = 'beauty'
}: CalendarContainerProps) {
  
  // --- Zustand Store (Fine-grained Selectors) ---
  const viewType = useCalendarStore(s => s.viewType)
  const setViewType = useCalendarStore(s => s.setViewType)
  const currentDate = useCalendarStore(s => s.currentDate)
  const setCurrentDate = useCalendarStore(s => s.setCurrentDate)
  const isModalOpen = useCalendarStore(s => s.isModalOpen)
  const setIsModalOpen = useCalendarStore(s => s.setIsModalOpen)
  const isBookingModalOpen = useCalendarStore(s => s.isBookingModalOpen)
  const setIsBookingModalOpen = useCalendarStore(s => s.setIsBookingModalOpen)
  const selectedDate = useCalendarStore(s => s.selectedDate)
  const memberName = useCalendarStore(s => s.memberName)
  const setMemberName = useCalendarStore(s => s.setMemberName)
  const memberInfo = useCalendarStore(s => s.memberInfo)
  const setMemberInfo = useCalendarStore(s => s.setMemberInfo)
  const newTitle = useCalendarStore(s => s.newTitle)
  const setNewTitle = useCalendarStore(s => s.setNewTitle)
  const selectedStaffId = useCalendarStore(s => s.selectedStaffId)
  const setSelectedStaffId = useCalendarStore(s => s.setSelectedStaffId)
  const showCheckoutPreview = useCalendarStore(s => s.showCheckoutPreview)
  const showBookingSuccess = useCalendarStore(s => s.showBookingSuccess)
  const isAuthorized = useCalendarStore(s => s.isAuthorized)
  const storeIsCalendarLocked = useCalendarStore(s => s.isCalendarLocked)
  const setIsCalendarLocked = useCalendarStore(s => s.setIsCalendarLocked)
  const showRecycleBin = useCalendarStore(s => s.showRecycleBin)
  const setShowRecycleBin = useCalendarStore(s => s.setShowRecycleBin)
  const navigate = useCalendarStore(s => s.navigate)
  const events = useCalendarStore(s => s.events)
  const allDatabaseEvents = useCalendarStore(s => s.allDatabaseEvents)
  const staffMembers = useCalendarStore(s => s.staffMembers)
  const setStaffMembers = useCalendarStore(s => s.setStaffMembers)
  const isMounted = useCalendarStore(s => s.isMounted)
  const isStaffManagerOpen = useCalendarStore(s => s.isStaffManagerOpen)
  const setIsStaffManagerOpen = useCalendarStore(s => s.setIsStaffManagerOpen)
  const today = useCalendarStore(s => s.today)
  const now = useCalendarStore(s => s.now)
  const hoverTime = useCalendarStore(s => s.hoverTime)
  const setHoverTime = useCalendarStore(s => s.setHoverTime)
  const editingEvent = useCalendarStore(s => s.editingEvent)
  const selectedMember = useCalendarStore(s => s.selectedMember)
  const setSelectedMember = useCalendarStore(s => s.setSelectedMember)
  const memberId = useCalendarStore(s => s.memberId)
  const memberNote = useCalendarStore(s => s.memberNote)
  const setMemberNote = useCalendarStore(s => s.setMemberNote)
  const isNewMember = useCalendarStore(s => s.isNewMember)
  const showServiceSelection = useCalendarStore(s => s.showServiceSelection)
  const setShowServiceSelection = useCalendarStore(s => s.setShowServiceSelection)
  const showMemberDetail = useCalendarStore(s => s.showMemberDetail)
  const setShowMemberDetail = useCalendarStore(s => s.setShowMemberDetail)
  const setShowCheckoutPreview = useCalendarStore(s => s.setShowCheckoutPreview)
  const isDatePickerOpen = useCalendarStore(s => s.isDatePickerOpen)
  const setIsDatePickerOpen = useCalendarStore(s => s.setIsDatePickerOpen)
  const isDurationPickerOpen = useCalendarStore(s => s.isDurationPickerOpen)
  const setIsDurationPickerOpen = useCalendarStore(s => s.setIsDurationPickerOpen)
  const setSelectedDate = useCalendarStore(s => s.setSelectedDate)
  const selectedEndDate = useCalendarStore(s => s.selectedEndDate)
  const setSelectedEndDate = useCalendarStore(s => s.setSelectedEndDate)
  const duration = useCalendarStore(s => s.duration)
  const setDuration = useCalendarStore(s => s.setDuration)
  const selectedStaffIds = useCalendarStore(s => s.selectedStaffIds)
  const setSelectedStaffIds = useCalendarStore(s => s.setSelectedStaffIds)
  const itemStaffMap = useCalendarStore(s => s.itemStaffMap)
  const setItemStaffMap = useCalendarStore(s => s.setItemStaffMap)
  const staffAmounts = useCalendarStore(s => s.staffAmounts)
  const setStaffAmounts = useCalendarStore(s => s.setStaffAmounts)
  const customItemPrices = useCalendarStore(s => s.customItemPrices)
  const setCustomItemPrices = useCalendarStore(s => s.setCustomItemPrices)
  const memberSearchQuery = useCalendarStore(s => s.memberSearchQuery)
  const setMemberSearchQuery = useCalendarStore(s => s.setMemberSearchQuery)
  const showTimeSelection = useCalendarStore(s => s.showTimeSelection)
  const setShowTimeSelection = useCalendarStore(s => s.setShowTimeSelection)
  const timeSelectionType = useCalendarStore(s => s.timeSelectionType)
  const showCustomKeypad = useCalendarStore(s => s.showCustomKeypad)
  const setShowCustomKeypad = useCalendarStore(s => s.setShowCustomKeypad)
  const keypadTargetKey = useCalendarStore(s => s.keypadTargetKey)
  const setKeypadTargetKey = useCalendarStore(s => s.setKeypadTargetKey)
  const switchTimeSelection = useCalendarStore(s => s.switchTimeSelection)
  const gestureTime = useCalendarStore(s => s.gestureTime)
  const setGestureTime = useCalendarStore(s => s.setGestureTime)
  const activeHour = useCalendarStore(s => s.activeHour)
  const gestureRef = useCalendarStore(s => s.gestureRef)
  const setGestureRef = useCalendarStore(s => s.setGestureRef)
  const setSelectedColor = useCalendarStore(s => s.setSelectedColor)
  const setClickedStaffId = useCalendarStore(s => s.setClickedStaffId)
  const setIsNewMember = useCalendarStore(s => s.setIsNewMember)
  const setMemberId = useCalendarStore(s => s.setMemberId)
  const setEditingEvent = useCalendarStore(s => s.setEditingEvent)
  const setShowBookingSuccess = useCalendarStore(s => s.setShowBookingSuccess)
  const setEditingPriceItemKey = useCalendarStore(s => s.setEditingPriceItemKey)
  const isDesignatedMode = useCalendarStore(s => s.isDesignatedMode)
  const setIsDesignatedMode = useCalendarStore(s => s.setIsDesignatedMode)
  const resetModalState = useCalendarStore(s => s.resetModalState)
  const selectedColor = useCalendarStore(s => s.selectedColor)
  const clickedStaffId = useCalendarStore(s => s.clickedStaffId)
  const manualTotalAmount = useCalendarStore(s => s.manualTotalAmount)
  const setManualTotalAmount = useCalendarStore(s => s.setManualTotalAmount)
  const editingPriceItemKey = useCalendarStore(s => s.editingPriceItemKey)
  const globalPassport = useCalendarStore(s => s.globalPassport)
  const setGlobalPassport = useCalendarStore(s => s.setGlobalPassport)
  const passportCache = useCalendarStore(s => s.passportCache)
  const resourceLoadFactors = useCalendarStore(s => s.resourceLoadFactors)
  const aiSchedulingInsights = useCalendarStore(s => s.aiSchedulingInsights)
  const predictedOccupancy = useCalendarStore(s => s.predictedOccupancy)

  // --- Logic Hooks ---
  useCalendarInit(initialDate, initialView)
  const { fetchEvents, fetchAllEventsForLibrary, getRecommendedSlots } = useCalendarData()
  const { 
    isCalendarLocked, 
    handleSupabaseError,
    checkVersion,
    isVersionOutdated,
    unlockError,
    setUnlockError,
    handleUnlock,
    lockPassword,
    setLockPassword
  } = useCalendarAuth()
  
  const { mergedEvents, mergedTotalPrice, atomicSplits, involvedStaffIds } = useBillingState()
  useCheckoutInit(mergedEvents)
  const { allMembers } = useMemberData({ 
    allDatabaseEvents, 
    staffMembers, 
    memberSearchQuery,
    passportCache
  })
  const { handleGridClick, handleGridMouseMove } = useGridInteraction({ mode, isCalendarLocked })
  const { 
    deletedEvents, 
    handleRestoreEvent, 
    handlePermanentDelete 
  } = useRecycleBin(allDatabaseEvents, fetchEvents, fetchAllEventsForLibrary)

  const {
    newStaffName,
    setNewStaffName,
    activeColorPickerStaffId,
    setActiveColorPickerStaffId,
    draggedIndex,
    setDraggedIndex
  } = useStaffManagement(isMounted, staffMembers, setStaffMembers)

  const { 
    openEditModal,
    handleSubmit,
    isSubmitting,
    closeModal,
    handleSelectMember,
    handleNewMember,
    generateMemberId,
    toggleService
  } = useEventOperations({
    mode,
    allMembers,
    fetchEvents,
    fetchAllEventsForLibrary,
    checkVersion,
    handleSupabaseError,
  })

  const {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useTimeSelection({
    handleSubmit: async (e, mode, checkout) => {
      await handleSubmit(e, mode, checkout)
    },
    handleDeleteEvent: async () => {}
  })

  const containerRef = useRef<HTMLDivElement>(null);
  const localGestureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGestureRef(localGestureRef);
  }, [setGestureRef]);

  useScrollLock({
    isLocked: isModalOpen || isBookingModalOpen,
    containerRef,
    showCheckoutPreview
  })

  useEffect(() => {
    onModalToggle?.(isModalOpen || isBookingModalOpen)
  }, [isModalOpen, isBookingModalOpen, onModalToggle])

  useEffect(() => {
    if (initialService) setNewTitle(initialService)
  }, [initialService, setNewTitle])

  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-full w-full bg-transparent text-zinc-100 overflow-hidden relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {viewType !== 'nebula' && (
        <Header 
          lang={lang} 
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          viewType={viewType}
          setViewType={setViewType}
          today={today}
          setIsStaffManagerOpen={setIsStaffManagerOpen}
          setShowRecycleBin={setShowRecycleBin}
          onNavigate={navigate}
          fetchEvents={fetchEvents}
          fetchAllEventsForLibrary={fetchAllEventsForLibrary}
        />
      )}

      {!isAuthorized && (
        <div className="fixed inset-0 z-[10000] bg-zinc-950/90 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
          <div className="w-20 h-20 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center mb-6 animate-pulse">
            <ShieldCheck className="w-10 h-10 text-rose-500" />
          </div>
          <h2 className="text-2xl font-black italic text-white mb-2 tracking-widest uppercase" style={{ fontFamily: 'var(--font-orbitron)' }}>
            系统已锁定
          </h2>
          <p className="text-zinc-400 text-sm max-w-xs font-medium leading-relaxed">
            当前版本 ({APP_VERSION}) 授权已过期或未激活。请联系管理员获取最新授权。
          </p>
          <div className="mt-8 flex gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 rounded-full bg-white text-black text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
            >
              重试校验
            </button>
          </div>
          <div className="absolute bottom-8 text-[10px] font-bold text-zinc-600 tracking-[0.3em] uppercase">
            FX-Rapallo 安全保护系统
          </div>
        </div>
      )}

      <div className={cn(
        "flex-1 flex flex-col min-h-0 relative overflow-hidden no-scrollbar",
        (viewType === 'day' || viewType === 'week') && "overflow-y-auto",
        isModalOpen ? "opacity-0 pointer-events-none" : "opacity-100",
        isCalendarLocked && "pointer-events-none"
      )}>
        {(viewType === 'day' || viewType === 'week') ? (
          <div className="flex flex-col h-full overflow-hidden">
            <StaffHeader 
              lang={lang} 
              mode={mode} 
              I18N={I18N} 
              onToggleSidebar={onToggleSidebar || (() => {})} 
              viewType={viewType}
              currentDate={currentDate}
              isModalOpen={isModalOpen}
              today={today}
              setCurrentDate={setCurrentDate}
              setViewType={setViewType}
              events={events}
              staffMembers={staffMembers}
              industryType={industryType}
            />
            {industryType === 'restaurant' ? (
              <SpatialMapView 
                mode={mode}
                lang={lang}
                currentDate={currentDate}
                events={events}
                staffMembers={staffMembers}
                onEventClick={openEditModal}
                onGridClick={handleGridClick}
              />
            ) : industryType === 'car_wash' ? (
              <StationMapView 
                mode={mode}
                lang={lang}
                currentDate={currentDate}
                events={events}
                staffMembers={staffMembers}
                onEventClick={openEditModal}
                onGridClick={handleGridClick}
              />
            ) : (
              <Grid
                mode={mode}
                lang={lang}
                isCalendarLocked={isCalendarLocked}
                onGridClick={handleGridClick}
                onGridMouseMove={handleGridMouseMove}
                onEventClick={openEditModal}
                I18N={I18N}
                viewType={viewType}
                currentDate={currentDate}
                events={events}
                isModalOpen={isModalOpen}
                today={today}
                now={now}
                hoverTime={hoverTime}
                setHoverTime={setHoverTime}
                staffMembers={staffMembers}
              />
            )}
          </div>
        ) : viewType === 'month' ? (
          <MonthView 
            lang={lang}
            I18N={I18N}
            onDayClick={(day) => {
              setCurrentDate(day)
              setViewType('day')
            }}
            currentDate={currentDate}
            events={events}
            isModalOpen={isModalOpen}
            today={today}
          />
        ) : viewType === 'nebula' ? (
          <NebulaView 
            staffMembers={staffMembers}
            events={events}
            isModalOpen={isModalOpen}
            merchantId={staffMembers[0]?.merchant_id}
          />
        ) : viewType === 'ai_review' ? (
          <div className="p-6 h-full overflow-y-auto no-scrollbar">
            <StrategyReview />
          </div>
        ) : (
          <YearView 
            lang={lang}
            I18N={I18N}
            onMonthClick={(day) => {
              setCurrentDate(day)
              setViewType('month')
            }}
            currentDate={currentDate}
            events={events}
            isModalOpen={isModalOpen}
            today={today}
          />
        )
      }
      </div>

      <EventModal 
        lang={lang} 
        mode={mode} 
        isModalOpen={isModalOpen}
        isCalendarLocked={isCalendarLocked}
        editingEvent={editingEvent}
        newTitle={newTitle}
        setNewTitle={setNewTitle}
        memberInfo={memberInfo}
        setMemberInfo={setMemberInfo}
        selectedMember={selectedMember}
        setSelectedMember={setSelectedMember}
        globalPassport={globalPassport}
        setGlobalPassport={setGlobalPassport}
        memberName={memberName}
        setMemberName={setMemberName}
        memberId={memberId}
        memberNote={memberNote}
        setMemberNote={setMemberNote}
        isNewMember={isNewMember}
        today={today}
        showServiceSelection={showServiceSelection}
        setShowServiceSelection={setShowServiceSelection}
        showMemberDetail={showMemberDetail}
        setShowMemberDetail={setShowMemberDetail}
        showCheckoutPreview={showCheckoutPreview}
        setShowCheckoutPreview={setShowCheckoutPreview}
        isDatePickerOpen={isDatePickerOpen}
        setIsDatePickerOpen={setIsDatePickerOpen}
        isDurationPickerOpen={isDurationPickerOpen}
        setIsDurationPickerOpen={setIsDurationPickerOpen}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        selectedEndDate={selectedEndDate}
        setSelectedEndDate={setSelectedEndDate}
        duration={duration}
        setDuration={setDuration}
        selectedStaffId={selectedStaffId}
        selectedStaffIds={selectedStaffIds}
        itemStaffMap={itemStaffMap}
        staffMembers={staffMembers}
        memberSearchQuery={memberSearchQuery}
        setMemberSearchQuery={setMemberSearchQuery}
        showTimeSelection={showTimeSelection}
        setShowTimeSelection={setShowTimeSelection}
        timeSelectionType={timeSelectionType}
        showCustomKeypad={showCustomKeypad}
        setShowCustomKeypad={setShowCustomKeypad}
        keypadTargetKey={keypadTargetKey}
        setKeypadTargetKey={setKeypadTargetKey}
        mergedTotalPrice={mergedTotalPrice}
        atomicSplits={atomicSplits}
        mergedEvents={mergedEvents}
        allDatabaseEvents={allDatabaseEvents}
        involvedStaffIds={involvedStaffIds}
        staffAmounts={staffAmounts}
        setStaffAmounts={setStaffAmounts}
        customItemPrices={customItemPrices}
        setCustomItemPrices={setCustomItemPrices}
        manualTotalAmount={manualTotalAmount}
        setManualTotalAmount={setManualTotalAmount}
        editingPriceItemKey={editingPriceItemKey}
        setEditingPriceItemKey={setEditingPriceItemKey}
        clickedStaffId={clickedStaffId}
        isDesignatedMode={isDesignatedMode}
        setIsDesignatedMode={setIsDesignatedMode}
        resourceLoadFactors={resourceLoadFactors}
        aiSchedulingInsights={aiSchedulingInsights}
        predictedOccupancy={predictedOccupancy}
        setItemStaffMap={setItemStaffMap}
        setSelectedStaffId={setSelectedStaffId}
        setSelectedStaffIds={setSelectedStaffIds}
        onToggleService={toggleService}
        switchTimeSelection={switchTimeSelection}
        gestureTime={gestureTime}
        setGestureTime={setGestureTime}
        activeHour={activeHour}
        gestureRef={gestureRef}
        isSubmitting={isSubmitting}
        handleSubmit={handleSubmit}
        handleSelectMember={handleSelectMember}
        handleNewMember={handleNewMember}
        generateMemberId={generateMemberId}
        getRecommendedSlots={getRecommendedSlots}
        industryType={industryType}
      />
      <StaffManagerModal 
        isStaffManagerOpen={isStaffManagerOpen}
        setIsStaffManagerOpen={setIsStaffManagerOpen}
        isCalendarLocked={isCalendarLocked}
        staffMembers={staffMembers}
        setStaffMembers={setStaffMembers}
        newStaffName={newStaffName}
        setNewStaffName={setNewStaffName}
        activeColorPickerStaffId={activeColorPickerStaffId}
        setActiveColorPickerStaffId={setActiveColorPickerStaffId}
        draggedIndex={draggedIndex}
        setDraggedIndex={setDraggedIndex}
      />
      <RecycleBinModal 
        showRecycleBin={showRecycleBin}
        setShowRecycleBin={setShowRecycleBin}
        deletedEvents={deletedEvents}
        handleRestoreEvent={handleRestoreEvent}
        handlePermanentDelete={handlePermanentDelete}
      />
      <BookingModal 
        lang={lang} 
        isBookingModalOpen={isBookingModalOpen}
        selectedDate={selectedDate}
        memberName={memberName}
        setMemberName={setMemberName}
        memberInfo={memberInfo}
        setMemberInfo={setMemberInfo}
        newTitle={newTitle}
        setNewTitle={setNewTitle}
        selectedStaffId={selectedStaffId}
        setSelectedStaffId={setSelectedStaffId}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onClose={closeModal}
      />
      <LockOverlay 
        mode={mode} 
        isCalendarLocked={isCalendarLocked}
        setIsCalendarLocked={setIsCalendarLocked}
        isVersionOutdated={isVersionOutdated}
        unlockError={unlockError}
        setUnlockError={setUnlockError}
        handleUnlock={handleUnlock}
        checkVersion={checkVersion}
        lockPassword={lockPassword}
        setLockPassword={setLockPassword}
      />

      {showBookingSuccess && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100001] animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-emerald-500 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3">
            <ShieldCheck className="w-5 h-5" />
            <div className="flex flex-col">
              <span className="text-sm font-black uppercase tracking-widest">预约成功!</span>
              <span className="text-[10px] font-bold opacity-80 uppercase tracking-tighter">商家将尽快通过电话与您确认</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
