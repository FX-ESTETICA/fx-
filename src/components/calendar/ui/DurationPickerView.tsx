'use client'

import React from 'react'
import { addMinutes } from 'date-fns'
import { I18N } from '@/utils/calendar-constants'
import { DurationPicker } from '@/modules/core/components/DurationPicker'

interface DurationPickerViewProps {
  lang: 'zh' | 'it'
  duration: number
  selectedDate: Date | null
  onDurationSelect: (duration: number) => void
  onClose: () => void
}

export const DurationPickerView: React.FC<DurationPickerViewProps> = ({ 
  lang,
  duration,
  selectedDate,
  onDurationSelect,
  onClose
}) => {
  return (
    <DurationPicker 
      duration={duration}
      minutesSuffix={I18N[lang].minutesSuffix}
      onDurationSelect={(m) => {
        onDurationSelect(m);
        onClose();
      }}
      onClose={onClose}
    />
  );
}
