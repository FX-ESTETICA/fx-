import React from 'react'
import { cn } from '@/lib/utils'

interface DurationPickerProps {
  duration: number
  onDurationSelect: (minutes: number) => void
  onClose: () => void
  minutesSuffix?: string
  className?: string
}

/**
 * 原子组件：时长选择器
 * 提供标准的时长选项列表
 */
export const DurationPicker: React.FC<DurationPickerProps> = ({
  duration,
  onDurationSelect,
  onClose,
  minutesSuffix = '分钟',
  className
}) => {
  const baseOptions = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 300];
  const options = Array.from(new Set([...baseOptions, duration])).sort((a, b) => a - b);

  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />
      <div className={cn("absolute top-full left-0 w-full mt-2 bg-transparent backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-[70] overflow-hidden", className)}>
        <div className="max-h-48 overflow-y-auto no-scrollbar p-1">
          {options.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => onDurationSelect(m)}
              className={cn(
                "w-full px-4 py-2.5 text-left text-xs font-bold transition-colors rounded-xl",
                duration === m ? "bg-white text-zinc-950" : "text-zinc-400 hover:bg-white/5 hover:text-white"
              )}
            >
              {m} {minutesSuffix}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
