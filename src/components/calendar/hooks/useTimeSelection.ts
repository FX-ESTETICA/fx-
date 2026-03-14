'use client'

import { useRef } from 'react'
import { addMinutes } from 'date-fns'
import { useCalendarStore } from '../store/useCalendarStore'

interface UseTimeSelectionProps {
  handleSubmit: (e?: React.FormEvent | React.MouseEvent, forcedMode?: 'normal' | 'sequential' | 'parallel', isCheckout?: boolean) => Promise<void>
  handleDeleteEvent: () => Promise<void>
}

export function useTimeSelection({ handleSubmit, handleDeleteEvent }: UseTimeSelectionProps) {
  const {
    gestureRef,
    touchStartX, setTouchStartX,
    touchCurrentX, setTouchCurrentX,
    touchStartY, setTouchStartY,
    touchCurrentY, setTouchCurrentY,
    isGesturing, setIsGesturing,
    showTimeSelection, setShowTimeSelection,
    gestureTime, setGestureTime,
    timeSelectionType,
    selectedDate, setSelectedDate,
    selectedEndDate, setSelectedEndDate,
    duration, setDuration,
    setActiveHour,
    isModalOpen,
    isBookingModalOpen,
    showCheckoutPreview, setShowCheckoutPreview,
    editingEvent,
    resetModalState,
    navigate,
    setShowServiceSelection,
    setShowMemberDetail
  } = useCalendarStore()

  const gestureStartPos = useRef({ x: 0, y: 0 })

  const handleTouchStart = (e: React.TouchEvent) => {
    const touchX = e.touches[0].clientX
    const touchY = e.touches[0].clientY

    if (showTimeSelection && gestureRef?.current) {
      const buttons = gestureRef.current.querySelectorAll('button[data-hour]')
      
      buttons.forEach((btn: any) => {
        const element = btn as HTMLElement;
        const btnRect = element.getBoundingClientRect()
        if (touchX >= btnRect.left && touchX <= btnRect.right &&
            touchY >= btnRect.top && touchY <= btnRect.bottom) {
          const hour = parseInt(element.getAttribute('data-hour') || '0')
          const defaultPeriod: 'AM' | 'PM' = (hour >= 8 && hour <= 11) ? 'AM' : 'PM'
          
          setIsGesturing(true)
          setActiveHour(hour)
          gestureStartPos.current = { x: touchX, y: touchY }
          setGestureTime({ h: hour, m: 0, p: defaultPeriod })
        }
      })
    }

    setTouchStartX(touchX)
    setTouchCurrentX(touchX)
    setTouchStartY(touchY)
    setTouchCurrentY(touchY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const touchX = e.touches[0].clientX
    const touchY = e.touches[0].clientY

    const diffX = Math.abs(touchX - (touchStartX || touchX))
    const diffY = Math.abs(touchY - (touchStartY || touchY))
    const isHorizontalPotential = diffX > diffY && diffX > 10

    if (isModalOpen || isBookingModalOpen || showCheckoutPreview) {
      const scrollableElement = (e.target as HTMLElement).closest('.overflow-y-auto') as HTMLElement
      
      if (isHorizontalPotential) {
        if (e.cancelable) e.preventDefault()
      } else if (scrollableElement) {
        const isAtTop = scrollableElement.scrollTop <= 0
        const isSwipingDown = touchY > (touchStartY || touchY)
        
        if (isAtTop && isSwipingDown && e.cancelable) {
          e.preventDefault()
        }
      } else if (e.cancelable) {
        e.preventDefault()
      }
    }

    setTouchCurrentX(touchX)
    setTouchCurrentY(touchY)

    if (isGesturing && showTimeSelection && gestureRef?.current) {
      const deltaX = touchX - gestureStartPos.current.x
      const deltaY = touchY - gestureStartPos.current.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      if (distance > 25) {
        let minute = 0
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          minute = deltaX > 0 ? 15 : 45
        } else {
          minute = deltaY > 0 ? 30 : 0
        }
        setGestureTime(prev => ({ ...prev, m: minute }))
      }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent | React.FormEvent) => {
    if (isGesturing && showTimeSelection) {
      setIsGesturing(false)
      const { h, m, p } = gestureTime
      
      if (h !== null && m !== null) {
        let finalHour = h
        if (p === 'PM' && h < 12) finalHour += 12
        if (p === 'AM' && h === 12) finalHour = 0

        const baseDate = timeSelectionType === 'start' ? selectedDate : selectedEndDate
        if (baseDate) {
          const newDate = new Date(baseDate)
          newDate.setHours(finalHour)
          newDate.setMinutes(m)
          
          if (timeSelectionType === 'start') {
            setSelectedDate(newDate)
            if (selectedEndDate && newDate >= selectedEndDate) {
              setSelectedEndDate(addMinutes(newDate, duration))
            }
          } else {
            setSelectedEndDate(newDate)
            if (selectedDate) {
              setDuration(Math.max(15, (newDate.getTime() - selectedDate.getTime()) / 60000))
            }
          }
        }
        setShowTimeSelection(false)
        setActiveHour(null)
        setGestureTime({ h: null, m: null, p: 'PM' })
      }
      return
    }

    if (touchStartX === null || touchCurrentX === null || touchStartY === null || touchCurrentY === null) return

    const diffX = touchCurrentX - touchStartX
    const diffY = touchCurrentY - touchStartY
    const threshold = 50
    const absX = Math.abs(diffX)
    const absY = Math.abs(diffY)

    const isVertical = absY > absX * 1.2 && absY > threshold
    const isHorizontal = absX > absY * 1.2 && absX > threshold

    if (isVertical) {
      if (diffY < -threshold) {
        if (isModalOpen || isBookingModalOpen) {
          const submitEvent = ('preventDefault' in e) ? e : { preventDefault: () => {} } as React.FormEvent
          handleSubmit(submitEvent as any, undefined, showCheckoutPreview)
        }
      } else if (diffY > threshold) {
        if (isModalOpen) {
          if (editingEvent) {
            handleDeleteEvent()
          } else {
            resetModalState()
          }
        } else if (isBookingModalOpen) {
          resetModalState()
        }
      }
    } else if (isHorizontal) {
      if (isModalOpen || isBookingModalOpen) {
        if (diffX > threshold) {
          if (!showCheckoutPreview) {
            setShowCheckoutPreview(true)
            setShowServiceSelection(false)
            setShowMemberDetail(false)
            setShowTimeSelection(false)
          } else {
            setShowCheckoutPreview(false)
          }
        } else if (diffX < -threshold) {
          if (showCheckoutPreview) {
            setShowCheckoutPreview(false)
          }
        }
      } else if (showCheckoutPreview) {
        setShowCheckoutPreview(false)
      } else {
        if (diffX > threshold) {
          navigate('prev')
        } else if (diffX < -threshold) {
          navigate('next')
        }
      }
    }

    setTouchStartX(null)
    setTouchCurrentX(null)
    setTouchStartY(null)
    setTouchCurrentY(null)
  }

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  }
}
