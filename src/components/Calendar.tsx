'use client'

import { CalendarContainer } from '@/modules/booking/components/CalendarContainer'
import { ViewType } from '@/utils/calendar-constants'
import { IndustryType } from '@/modules/core/types/omni-flow'

interface CalendarProps {
  initialDate?: Date
  initialView?: ViewType
  onToggleSidebar?: () => void
  onModalToggle?: (isOpen: boolean) => void
  bgIndex?: number
  lang?: 'zh' | 'it'
  mode?: 'admin' | 'customer'
  initialService?: string
  industryType?: IndustryType
}

export default function Calendar(props: CalendarProps) {
  return <CalendarContainer {...props} />
}
