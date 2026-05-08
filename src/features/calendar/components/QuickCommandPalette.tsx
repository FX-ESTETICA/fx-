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

  // 将 selectedService 升级为数组，以支持连单
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
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
    setSelectedServices([]);
    setSelectedStaff(null);
    setSelectedCustomer(null);
    setSelectedTime(null);
    setEditingStage(null);
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
      else if (stage === 'staff') { setStage('service'); setQuery(''); setSelectedServices([]); }
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
      
      // 【终极盲打法则】：当按下回车时，如果下拉列表中有选项，默认直接抓取第一个（或者当前选中的那一个）
      // 彻底消灭了手机端需要用手去点列表导致的键盘收起闪烁问题。
      const targetItem = currentList[selectedIndex] || currentList[0];

      if (currentStage === 'service') {
        // 【一键连单切片法则】
        // 允许输入类似 "MN PN SOP"，用空格分割
        const tokens = query.trim().split(/\s+/).filter(Boolean);
        if (tokens.length > 1) {
          // 多选模式：遍历每个 token，去 services 里找第一匹配项
          const matchedServices = tokens.map(token => {
            const q = token.toLowerCase();
            const match = services.find(s => 
              (s.name && s.name.toLowerCase().includes(q)) || 
              (s.pinyin && s.pinyin.toLowerCase().includes(q))
            );
            return match;
          }).filter(Boolean);

          if (matchedServices.length > 0) {
            setSelectedServices(matchedServices);
            if (editingStage) setEditingStage(null);
            else setStage('staff');
            setQuery('');
          }
        } else {
          // 单选模式：直接用下拉列表里的选中项
          if (targetItem) {
            setSelectedServices([targetItem]);
            if (editingStage) setEditingStage(null);
            else setStage('staff');
            setQuery('');
          }
        }
      } else if (currentStage === 'staff') {
        if (targetItem) {
          setSelectedStaff(targetItem);
          if (editingStage) setEditingStage(null);
          else setStage('customer');
          setQuery('');
        } else if (query.trim() === '') {
          // 特殊处理：如果没有输入任何内容直接回车，默认指派给“无指定” (unassigned)
          setSelectedStaff({ id: 'unassigned', name: '无指定' });
          if (editingStage) setEditingStage(null);
          else setStage('customer');
          setQuery('');
        }
      } else if (currentStage === 'customer') {
        if (targetItem) {
          setSelectedCustomer({ name: targetItem.name, phone: targetItem.phone, gx_id: targetItem.gx_id });
        } else {
          // 如果列表里什么都没匹配到，把当前的输入直接作为散客录入
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
        // 如果输入了如 143，但没有匹配到精确时间，可以尝试自动补全，或者直接取第一个匹配到的
        const finalTime = targetItem || query;
        if (finalTime) {
          setSelectedTime(finalTime as string);
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
    if (selectedServices.length === 0 || !selectedStaff || !selectedCustomer || !selectedTime) return;

    const baseDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
    const masterOrderId = `ORD-${Date.now()}`;
    const finalCustomerId = selectedCustomer.gx_id || await BookingService.getAvailableCustomerId(shopId, 'CO');

    // 【连单裂变生成法则】
    const bookingPayloads = selectedServices.map((service, index) => {
      const duration = service.duration || 60;
      
      return {
        id: `BKG-${Date.now()}-${index}`,
        masterOrderId,
        _siblingIndex: index,
        resourceId: selectedStaff.id === 'unassigned' ? undefined : selectedStaff.id,
        customerId: finalCustomerId,
        customerName: selectedCustomer.name || selectedCustomer.phone || "散客 Walk-in",
        customerPhone: selectedCustomer.phone,
        serviceName: service.name,
        date: baseDate,
        startTime: selectedTime,
        duration: duration,
        status: 'CONFIRMED',
        is_staff_requested: selectedStaff.id !== 'unassigned',
        services: [{...service, assignedEmployeeId: selectedStaff.id === 'unassigned' ? null : selectedStaff.id}],
        originalUnassigned: selectedStaff.id === 'unassigned',
        shopId: shopId,
        _needsTimeReflow: true,
        _isForceInsert: false
      };
    });

    const manualOverrides: Record<string, any> = {};
    bookingPayloads.forEach(payload => {
      manualOverrides[payload.id] = {
        resourceId: payload.resourceId as string | null,
        originalUnassigned: payload.originalUnassigned,
        _needsTimeReflow: true,
        _isForceInsert: false
      };
    });

    try {
      await BookingService.upsertBookings(bookingPayloads);
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
                    if (currentStage === 'service') { setSelectedServices([item]); if(editingStage) setEditingStage(null); else setStage('staff'); setQuery(''); }
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
          "w-[95%] max-w-[600px] min-h-[3rem] py-1.5 px-4 gap-2 flex flex-wrap items-center rounded-[1.5rem] border transition-all duration-300 relative",
          borderColor,
          glowShadow,
          "bg-transparent backdrop-blur-sm"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Capsules */}
        {selectedServices.length > 0 && editingStage !== 'service' && (
          <div 
            onClick={() => { setEditingStage('service'); setQuery(''); inputRef.current?.focus(); }}
            className="flex flex-wrap items-center gap-1 cursor-pointer transition-opacity hover:opacity-70"
          >
            {selectedServices.map((srv, idx) => (
              <div key={idx} className={cn("px-3 py-1 rounded-full text-xs tracking-widest border whitespace-nowrap", isLight ? "border-black text-black" : "border-white text-white", glowShadow)}>
                {srv.name}
              </div>
            ))}
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

        {stage === 'confirm' && !editingStage ? (
          <div className="flex-1 flex items-center justify-end min-w-[120px] gap-3 ml-auto py-0.5">
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
              "flex-1 min-w-[100px] h-8 bg-transparent outline-none text-sm tracking-widest placeholder:opacity-40 py-0.5",
              textColor
            )}
            placeholder={
              currentStage === 'service' ? "输入项目首字母 (如 MN)..." :
              currentStage === 'staff' ? "选择指派员工..." :
              currentStage === 'customer' ? "输入客户电话/名字..." :
              "输入时间 (如 1430)..."
            }
          />
        )}
      </div>
    </div>
  );
}
