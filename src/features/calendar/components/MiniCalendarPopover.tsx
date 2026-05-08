"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
 import { cn } from "@/utils/cn";
 import { ChevronLeft, ChevronRight } from "lucide-react";
 import { AnimatePresence, motion } from "framer-motion";
 import { createPortal } from "react-dom";

 interface MiniCalendarPopoverProps {
 isOpen: boolean;
 onClose: () => void;
 currentDate: Date;
 onDateSelect: (date: Date) => void;
 isLight?: boolean;
 triggerRef?: React.RefObject<HTMLElement | null>;
 }

 export const MiniCalendarPopover = ({
 isOpen,
 onClose,
 currentDate,
 onDateSelect,
 isLight = false,
 triggerRef
 }: MiniCalendarPopoverProps) => {
 const [monthOffset, setMonthOffset] = useState(0);
 const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
 const popoverRef = useRef<HTMLDivElement>(null);

  const displayDate = useMemo(() => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [currentDate, monthOffset]);

  const calendarDays = useMemo(() => {
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Calculate days from previous month to fill the first row
    const prevMonthDays = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const days = [];
    
    // Add previous month days
    for (let i = prevMonthDays; i > 0; i--) {
      days.push({
        day: new Date(year, month, 0).getDate() - i + 1,
        isCurrentMonth: false,
        date: new Date(year, month - 1, new Date(year, month, 0).getDate() - i + 1)
      });
    }
    
    // Add current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      });
    }
    
    // Add next month days to complete 6 rows (42 cells)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }
    
    return days;
  }, [displayDate]);

  // Click outside to close
 useEffect(() => {
 if (!isOpen) return;
 
 const handlePointerDown = (e: PointerEvent) => {
 const target = e.target as HTMLElement;
 if (!target.closest('.mini-calendar-popover') && triggerRef?.current && !triggerRef.current.contains(target)) {
 onClose();
 }
 };
 
 document.addEventListener('pointerdown', handlePointerDown);
 return () => document.removeEventListener('pointerdown', handlePointerDown);
 }, [isOpen, onClose, triggerRef]);

 // Calculate position based on trigger element
 useEffect(() => {
 if (isOpen && triggerRef?.current) {
 const rect = triggerRef.current.getBoundingClientRect();
 setPopoverStyle({
 position: 'fixed',
 top: `${rect.bottom + 8}px`,
 left: `${rect.left}px`,
 zIndex: 9999,
 });
 }
 }, [isOpen, triggerRef]);

 if (!isOpen) return null;

 return createPortal(
 <AnimatePresence>
 <motion.div
 ref={popoverRef}
 initial={{ opacity: 0, y: -10, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: -10, scale: 0.95 }}
 transition={{ duration: 0.2 }}
 style={popoverStyle}
 className={cn(
 "mini-calendar-popover w-64 p-3 rounded-2xl backdrop-blur-xl border shadow-2xl",
            isLight 
              ? "bg-white/90 border-black/10 shadow-black/5" 
              : "bg-black/90 border-white/10 shadow-white/5"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-1 mb-3">
            <button 
              onClick={() => setMonthOffset(o => o - 1)} 
              className={cn("p-1 rounded-md transition-colors", isLight ? "hover:bg-black/5 text-black/60 hover:text-black" : "hover:bg-white/5 text-white/60 hover:text-white")}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={cn("text-xs font-medium tracking-widest", isLight ? "text-black" : "text-white")}>
              {displayDate.getFullYear()} / {String(displayDate.getMonth() + 1).padStart(2, '0')}
            </span>
            <button 
              onClick={() => setMonthOffset(o => o + 1)} 
              className={cn("p-1 rounded-md transition-colors", isLight ? "hover:bg-black/5 text-black/60 hover:text-black" : "hover:bg-white/5 text-white/60 hover:text-white")}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          {/* Days Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
              <span key={day} className={cn("text-[9px] font-medium tracking-wider", isLight ? "text-black/40" : "text-white/40")}>
                {day[0]}
              </span>
            ))}
          </div>
          
          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, idx) => {
              const isToday = cell.date.toDateString() === new Date().toDateString();
              const isSelected = cell.date.toDateString() === currentDate.toDateString();
              
              return (
                <div
                  key={idx}
                  onClick={() => {
                    onDateSelect(cell.date);
                    setMonthOffset(0); // Reset offset when selected
                  }}
                  className={cn(
                    "h-7 flex items-center justify-center rounded-md text-xs cursor-pointer transition-all duration-200",
                    !cell.isCurrentMonth && (isLight ? "text-black/20" : "text-white/20"),
                    cell.isCurrentMonth && !isSelected && !isToday && (isLight ? "text-black/70 hover:bg-black/5 hover:text-black" : "text-white/70 hover:bg-white/5 hover:text-white"),
                    isToday && !isSelected && (isLight ? "text-[#8B7355] font-bold" : "text-[#FDF5E6] font-bold"),
                    isSelected && (isLight ? "bg-black text-white shadow-md" : "bg-white text-black shadow-md")
                  )}
                >
                  {cell.day}
                </div>
              );
            })}
          </div>
        </motion.div>
    </AnimatePresence>,
    document.body
  );
};