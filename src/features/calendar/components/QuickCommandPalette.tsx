"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { BookingService } from "@/features/booking/api/booking";
import { BookingScheduler } from "@/features/booking/utils/scheduler";

type QuickCommandPaletteProps = {
  services: any[];
  staffs: any[];
  shopId: string;
  currentDate: Date;
  onBookingCreated: () => void;
  visualSettings: any;
};

type Stage = 'service' | 'staff' | 'customer' | 'time' | 'confirm';

export function QuickCommandPalette({
  services,
  staffs,
  shopId,
  currentDate,
  onBookingCreated,
  visualSettings
}: QuickCommandPaletteProps) {
  const isLight = visualSettings?.headerTitleColorTheme === 'coreblack';
  const textColor = isLight ? "text-black" : (visualSettings?.timelineColorTheme === 'blackgold' ? "text-[#8B7355]" : "text-[#FDF5E6]");
  const borderColor = isLight ? "border-black/30" : "border-white/30";
  const glowShadow = isLight ? "drop-shadow-[0_0_12px_rgba(0,0,0,0.15)]" : "drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]";

  const [stage, setStage] = useState<Stage>('service');
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [query, setQuery] = useState("");

  const currentStage = editingStage || stage;

  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null); // 'unassigned' or staff object
  const [selectedCustomer, setSelectedCustomer] = useState<{ name: string; phone: string; gx_id?: string } | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [fuzzyCustomers, setFuzzyCustomers] = useState<any[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Time generator
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = 9; h <= 22; h++) {
      for (let m = 0; m < 60; m += 15) {
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, []);

  // Filtering logic
  const filteredServices = useMemo(() => {
    if (currentStage !== 'service') return [];
    if (!query) return []; // 当没有输入时，直接返回空数组，不显示列表
    const q = query.toLowerCase();
    return services.filter(s => 
      (s.name && s.name.toLowerCase().includes(q)) || 
      (s.pinyin && s.pinyin.toLowerCase().includes(q)) ||
      (s.name && s.name.toLowerCase().includes(q)) // simple fallback
    );
  }, [currentStage, query, services]);

  const staffOptions = useMemo(() => {
    return [{ id: 'unassigned', name: '无指定' }, ...staffs];
  }, [staffs]);

  const filteredStaffs = useMemo(() => {
    if (currentStage !== 'staff') return [];
    if (!query) return []; // 选员工时如果没有输入，也不显示默认列表
    const q = query.toLowerCase();
    return staffOptions.filter(s => 
      s.name.toLowerCase().includes(q)
    );
  }, [currentStage, query, staffOptions]);

  const filteredTimes = useMemo(() => {
    if (currentStage !== 'time') return [];
    if (!query) return []; // 选时间时如果没有输入，也不显示默认列表
    return timeSlots.filter(t => t.includes(query) || t.replace(':', '').includes(query));
  }, [currentStage, query, timeSlots]);

  // Current list for keyboard navigation
  const currentList = useMemo(() => {
    switch (currentStage) {
      case 'service': return filteredServices;
      case 'staff': return filteredStaffs;
      case 'customer': return fuzzyCustomers;
      case 'time': return filteredTimes;
      default: return [];
    }
  }, [currentStage, filteredServices, filteredStaffs, fuzzyCustomers, filteredTimes]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, currentStage]);

  useEffect(() => {
    if (currentStage === 'customer' && query.length >= 3) {
      const timer = setTimeout(async () => {
        try {
          const { data } = await BookingService.searchProfilesByPhoneFuzzy(shopId, query);
          setFuzzyCustomers(data || []);
        } catch (error) {
          console.error("Fuzzy search failed", error);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setFuzzyCustomers([]);
    }
  }, [query, stage, shopId]);

  // 格式化当前日期为 MM/DD
  const formattedDate = useMemo(() => {
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');
    return `${month}/${day}`;
  }, [currentDate]);

  const resetAll = () => {
    setStage('service');
    setQuery('');
    setSelectedService(null);
    setSelectedStaff(null);
    setSelectedCustomer(null);
    setSelectedTime(null);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (editingStage) {
        setEditingStage(null);
        setQuery('');
      }
      else if (stage === 'confirm') { setStage('time'); setQuery(''); setSelectedTime(null); }
      else if (stage === 'time') { setStage('customer'); setQuery(''); setSelectedCustomer(null); }
      else if (stage === 'customer') { setStage('staff'); setQuery(''); setSelectedStaff(null); }
      else if (stage === 'staff') { setStage('service'); setQuery(''); setSelectedService(null); }
      else resetAll();
      e.preventDefault();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < currentList.length - 1 ? prev + 1 : prev));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentStage === 'service') {
        const item = currentList[selectedIndex];
        if (item) {
          setSelectedService(item);
          if (editingStage) setEditingStage(null);
          else setStage('staff');
          setQuery('');
        }
      } else if (currentStage === 'staff') {
        const item = currentList[selectedIndex];
        if (item) {
          setSelectedStaff(item);
          if (editingStage) setEditingStage(null);
          else setStage('customer');
          setQuery('');
        }
      } else if (currentStage === 'customer') {
        const item = currentList[selectedIndex];
        if (item) {
          setSelectedCustomer({ name: item.name, phone: item.phone, gx_id: item.gx_id });
        } else {
          // New customer from query
          const isPhone = /^[0-9]+$/.test(query);
          setSelectedCustomer({ 
            name: isPhone ? "" : query, 
            phone: isPhone ? query : "" 
          });
        }
        if (editingStage) setEditingStage(null);
        else setStage('time');
        setQuery('');
      } else if (currentStage === 'time') {
        const item = currentList[selectedIndex] || query;
        if (item) {
          setSelectedTime(item);
          if (editingStage) setEditingStage(null);
          else setStage('confirm');
          setQuery('');
        }
      } else if (currentStage === 'confirm') {
        // Submit
        await submitBooking();
      }
    }
  };

  const submitBooking = async () => {
    if (!selectedService || !selectedStaff || !selectedCustomer || !selectedTime) return;

    const baseDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
    const masterOrderId = `ORD-${Date.now()}`;
    const finalCustomerId = selectedCustomer.gx_id || await BookingService.getAvailableCustomerId(shopId, 'CO');

    const duration = selectedService.duration || 60;

    const bookingPayload = {
      id: `BKG-${Date.now()}`,
      masterOrderId,
      _siblingIndex: 0,
      resourceId: selectedStaff.id === 'unassigned' ? undefined : selectedStaff.id,
      customerId: finalCustomerId,
      customerName: selectedCustomer.name || selectedCustomer.phone || "散客 Walk-in",
      customerPhone: selectedCustomer.phone,
      serviceName: selectedService.name,
      date: baseDate,
      startTime: selectedTime,
      duration: duration,
      status: 'CONFIRMED',
      is_staff_requested: selectedStaff.id !== 'unassigned',
      services: [{...selectedService, assignedEmployeeId: selectedStaff.id === 'unassigned' ? null : selectedStaff.id}],
      originalUnassigned: selectedStaff.id === 'unassigned',
      shopId: shopId,
      _needsTimeReflow: true,
      _isForceInsert: false
    };

    const manualOverrides = {
      [bookingPayload.id]: {
        resourceId: bookingPayload.resourceId as string | null,
        originalUnassigned: bookingPayload.originalUnassigned,
        _needsTimeReflow: true,
        _isForceInsert: false
      }
    };

    try {
      await BookingService.upsertBookings([bookingPayload]);
      await BookingScheduler.reflowDayBookings(baseDate, shopId, staffs, manualOverrides);
      onBookingCreated();
      resetAll();
    } catch (error) {
      console.error("Quick create failed", error);
    }
  };

  return (
    <div className={cn("px-8 mt-4 pointer-events-auto relative z-50 flex flex-col items-center", isLight ? "" : "")}>
      
      {/* Popup Menus */}
      <AnimatePresence>
        {stage !== 'confirm' && currentList.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={cn(
              "absolute bottom-full mb-2 w-[300px] max-h-[200px] overflow-y-auto rounded-lg border backdrop-blur-md z-50",
              isLight ? "bg-white/80 border-black/10" : "bg-black/60 border-white/10"
            )}
          >
            {currentList.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              
              let label = "";
              if (currentStage === 'service') label = item.name;
              else if (currentStage === 'staff') label = item.name;
              else if (currentStage === 'customer') label = `${item.name || ''} ${item.phone || ''} ${item.gx_id || ''}`.trim();
              else if (currentStage === 'time') label = item as string;

              return (
                <div 
                  key={idx}
                  className={cn(
                    "px-4 py-2 text-sm cursor-pointer transition-colors",
                    isSelected ? (isLight ? "bg-black/10" : "bg-white/10") : "",
                    isLight ? "text-black hover:bg-black/5" : "text-white hover:bg-white/5"
                  )}
                  onClick={() => {
                    setSelectedIndex(idx);
                    // trigger enter programmatically would be ideal, but direct logic is fine
                    if (currentStage === 'service') { setSelectedService(item); if(editingStage) setEditingStage(null); else setStage('staff'); setQuery(''); }
                    else if (currentStage === 'staff') { setSelectedStaff(item); if(editingStage) setEditingStage(null); else setStage('customer'); setQuery(''); }
                    else if (currentStage === 'customer') { setSelectedCustomer({ name: item.name, phone: item.phone, gx_id: item.gx_id }); if(editingStage) setEditingStage(null); else setStage('time'); setQuery(''); }
                    else if (currentStage === 'time') { setSelectedTime(item as string); if(editingStage) setEditingStage(null); else setStage('confirm'); setQuery(''); }
                  }}
                >
                  {label}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        className={cn(
          "w-[600px] h-12 flex items-center rounded-full border transition-all duration-300 relative",
          borderColor,
          glowShadow,
          "bg-transparent backdrop-blur-sm"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex items-center pl-4 gap-2 overflow-x-auto whitespace-nowrap hide-scrollbar flex-shrink-0">
          {/* Capsules */}
          {selectedService && editingStage !== 'service' && (
            <div 
              onClick={() => { setEditingStage('service'); setQuery(''); inputRef.current?.focus(); }}
              className={cn("px-3 py-1 rounded-full text-xs tracking-widest border whitespace-nowrap cursor-pointer transition-opacity hover:opacity-70", isLight ? "border-black text-black" : "border-white text-white", glowShadow)}
            >
              {selectedService.name}
            </div>
          )}
          {selectedStaff && editingStage !== 'staff' && (
            <div 
              onClick={() => { setEditingStage('staff'); setQuery(''); inputRef.current?.focus(); }}
              className={cn("px-3 py-1 rounded-full text-xs tracking-widest border whitespace-nowrap cursor-pointer transition-opacity hover:opacity-70", isLight ? "border-black text-black" : "border-white text-white", glowShadow)}
            >
              {selectedStaff.name}
            </div>
          )}
          {selectedCustomer && editingStage !== 'customer' && (
            <div 
              onClick={() => { setEditingStage('customer'); setQuery(''); inputRef.current?.focus(); }}
              className={cn("px-3 py-1 rounded-full text-xs tracking-widest border whitespace-nowrap cursor-pointer transition-opacity hover:opacity-70", isLight ? "border-black text-black" : "border-white text-white", glowShadow)}
            >
              {selectedCustomer.name || selectedCustomer.phone}
            </div>
          )}
          {selectedTime && editingStage !== 'time' && (
            <div 
              onClick={() => { setEditingStage('time'); setQuery(''); inputRef.current?.focus(); }}
              className={cn("px-3 py-1 rounded-full text-xs tracking-widest border whitespace-nowrap cursor-pointer transition-opacity hover:opacity-70", isLight ? "border-black text-black" : "border-white text-white", glowShadow)}
            >
              {formattedDate} {selectedTime}
            </div>
          )}
        </div>

        {stage === 'confirm' && !editingStage ? (
          <div className="flex-1 flex items-center justify-end pr-4 gap-3">
            <button 
              onClick={resetAll}
              className={cn("w-8 h-8 rounded-full flex items-center justify-center border transition-all hover:scale-110", isLight ? "border-black/30 text-black/50 hover:text-black hover:border-black" : "border-white/30 text-white/50 hover:text-white hover:border-white")}
            >
              <X className="w-4 h-4" />
            </button>
            <button 
              onClick={submitBooking}
              className={cn("w-8 h-8 rounded-full flex items-center justify-center border transition-all hover:scale-110 animate-pulse", isLight ? "border-black text-black" : "border-white text-white", glowShadow)}
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              "flex-1 h-full bg-transparent outline-none px-4 text-sm tracking-widest placeholder:opacity-40 min-w-[100px]",
              textColor
            )}
            placeholder={
              currentStage === 'service' ? "输入项目首字母 (如 MN)..." :
              currentStage === 'staff' ? "选择指派员工..." :
              currentStage === 'customer' ? "输入客户电话/名字..." :
              "输入时间 (如 1430)..."
            }
            autoFocus
          />
        )}
      </div>
    </div>
  );
}
