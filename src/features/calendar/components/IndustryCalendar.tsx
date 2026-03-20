"use client";

import { useState, useMemo } from "react";
import { GlassCard } from "@/components/shared/GlassCard";
import { cn } from "@/utils/cn";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Scissors, 
  Utensils, 
  Hotel,
  Plus
} from "lucide-react";
import { IndustryType, Booking } from "../types";

interface IndustryCalendarProps {
  initialIndustry?: IndustryType;
  bookings?: Booking[];
}

/**
 * IndustryCalendar - 行业自适应预约日历
 * 支持根据行业类型自动切换视觉风格与数据展示逻辑
 */
export const IndustryCalendar = ({ 
  initialIndustry = "beauty",
  bookings: _bookings = []
}: IndustryCalendarProps) => {
  const [industry, setIndustry] = useState<IndustryType>(initialIndustry);
  const [currentDate, setCurrentDate] = useState(new Date());

  // 模拟当前月份的天数
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [currentDate]);

  // 行业视觉配置
  const industryConfigs = {
    beauty: {
      icon: Scissors,
      color: "text-gx-purple",
      bg: "bg-gx-purple/10",
      border: "border-gx-purple/20",
      label: "美发/造型",
      accent: "purple"
    },
    dining: {
      icon: Utensils,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      label: "餐饮/订座",
      accent: "none"
    },
    hotel: {
      icon: Hotel,
      color: "text-gx-cyan",
      bg: "bg-gx-cyan/10",
      border: "border-gx-cyan/20",
      label: "住宿/酒店",
      accent: "cyan"
    },
    other: {
      icon: CalendarIcon,
      color: "text-white/60",
      bg: "bg-white/5",
      border: "border-white/10",
      label: "常规预约",
      accent: "none"
    }
  };

  const config = industryConfigs[industry];

  return (
    <div className="space-y-6">
      {/* 行业切换器 */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
        {(Object.keys(industryConfigs) as IndustryType[]).map((type) => {
          const Icon = industryConfigs[type].icon;
          return (
            <button
              key={type}
              onClick={() => setIndustry(type)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all",
                industry === type 
                  ? "bg-white/10 text-white shadow-lg" 
                  : "text-white/40 hover:text-white/60"
              )}
            >
              <Icon className="w-3 h-3" />
              {industryConfigs[type].label}
            </button>
          );
        })}
      </div>

      <GlassCard 
        glowColor={config.accent as any}
        className="p-0 overflow-hidden"
      >
        {/* 日历 Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-xl border", config.bg, config.border, config.color)}>
              <config.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                {config.label} // BOOKING_SYSTEM_V1
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
              className="p-2 hover:bg-white/5 rounded-lg border border-white/5 text-white/40 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 text-[10px] font-mono border border-white/5 rounded-lg hover:bg-white/5 transition-colors"
            >
              TODAY
            </button>
            <button 
              onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
              className="p-2 hover:bg-white/5 rounded-lg border border-white/5 text-white/40 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button className={cn("ml-2 p-2 rounded-lg border flex items-center justify-center transition-all", config.bg, config.border, config.color, "hover:scale-105 active:scale-95")}>
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 日历 Grid */}
        <div className="grid grid-cols-7 border-b border-white/5">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
            <div key={day} className="py-3 text-center text-[9px] font-mono text-white/20 tracking-widest border-r border-white/5 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-[120px]">
          {daysInMonth.map((day, idx) => {
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div 
                key={idx} 
                className={cn(
                  "p-3 border-r border-b border-white/5 last:border-r-0 group hover:bg-white/[0.02] transition-colors relative",
                  day.getMonth() !== currentDate.getMonth() && "opacity-20"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={cn(
                    "text-xs font-mono",
                    isToday ? config.color : "text-white/40"
                  )}>
                    {day.getDate().toString().padStart(2, '0')}
                  </span>
                  {isToday && (
                    <div className={cn("w-1 h-1 rounded-full shadow-[0_0_8px]", config.bg.replace('/10', ''), "bg-current", config.color)} />
                  )}
                </div>

                {/* 简易预约占位 */}
                {idx % 5 === 0 && (
                  <div className={cn("text-[8px] p-1.5 rounded border mb-1 truncate font-mono", config.bg, config.border, config.color)}>
                    {industry === 'beauty' ? '✂️ CUT_HAIR_14:00' : 
                     industry === 'dining' ? '🍽️ TABLE_04_18:30' : 
                     industry === 'hotel' ? '🏨 ROOM_302_IN' : 'RES_EVENT_10:00'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* 底部图例 */}
      <div className="flex items-center gap-6 text-[10px] font-mono text-white/20 uppercase tracking-widest px-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white/20" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", config.bg.replace('/10', ''), "bg-current", config.color)} />
          <span>Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full border border-white/20" />
          <span>Maintenance</span>
        </div>
      </div>
    </div>
  );
};
