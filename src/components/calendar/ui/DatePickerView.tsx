'use client'

import React from 'react'
import { addMinutes } from 'date-fns'
import { DatePicker } from '@/modules/core/components/DatePicker'

interface DatePickerViewProps {
  selectedDate: Date | null
  duration: number
  onDateSelect: (date: Date) => void
  onClose: () => void
}

export const DatePickerView: React.FC<DatePickerViewProps> = ({
  selectedDate,
  duration,
  onDateSelect,
  onClose
}) => {
  if (!selectedDate) return null;

  return (
    <div className="absolute top-full left-0 mt-2 z-[100]">
      <DatePicker 
        selectedDate={selectedDate}
        onDateSelect={(newDate) => {
          onDateSelect(newDate);
          onClose();
        }}
      />
    </div>
  );
}
