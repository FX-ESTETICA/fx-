"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Search, Plus } from "lucide-react";
import { BookingService } from "@/features/booking/api/booking";
import { BookingScheduler } from "@/features/booking/utils/scheduler";
import { useShop } from '@/features/shop/ShopContext';

type QuickCommandPaletteProps = {
  services: any[];
  staffs: any[];
  shopId: string;
  currentDate: Date;
  onBookingCreated: () => void;
  visualSettings: any;
  setCrosshairDate?: (date: Date) => void;
  setCrosshairTime?: (time: string) => void;
  setCrosshairResourceId?: (id: string | undefined) => void;
  setEditingBooking?: (booking: any) => void;
  handleCreateBookingClick?: () => void;
};

type Stage = 'service' | 'staff' | 'customer' | 'time' | 'confirm';

export function QuickCommandPalette({
  services,
  staffs,
  shopId,
  currentDate,
  onBookingCreated,
  visualSettings,
  setCrosshairDate,
  setCrosshairTime,
  setCrosshairResourceId,
  setEditingBooking,
  handleCreateBookingClick
}: QuickCommandPaletteProps) {
  const { globalBookings } = useShop();

  const isLight = visualSettings?.calendarBgIndex !== 0;
  const textColor = isLight ? "text-black" : (visualSettings?.calendarBgIndex !== 0 ? "text-[#8B7355]" : "text-[#FDF5E6]");
  const borderColor = isLight ? "border-black/10" : "border-white/10";
  const glowShadow = isLight ? "drop-shadow-[0_0_8px_rgba(0,0,0,0.1)]" : "drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]";

  const [mode, setMode] = useState<'idle' | 'create' | 'search'>('idle');

  // --- Create Mode States ---
  const [stage, setStage] = useState<Stage>('service');
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [query, setQuery] = useState("");
  
  const currentStage = editingStage || stage;

  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<{ name: string; phone: string; gx_id?: string } | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [fuzzyCustomers, setFuzzyCustomers] = useState<any[]>([]);

  // --- Search Mode States ---
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
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

  // Create Mode Filtering
  const filteredServices = useMemo(() => {
    if (currentStage !== 'service') return [];
    if (!query) return [];
    const q = query.toLowerCase();
    return services.filter(s => 
      (s.name && s.name.toLowerCase().includes(q)) || 
      (s.pinyin && s.pinyin.toLowerCase().includes(q)) ||
      (s.name && s.name.toLowerCase().includes(q))
    );
  }, [currentStage, query, services]);

  const staffOptions = useMemo(() => {
    const validStaffs = staffs.filter(s => s.status !== 'resigned' && s.status !== 'spectator');
    return [{ id: 'unassigned', name: '无指定' }, ...validStaffs];
  }, [staffs]);

  const filteredStaffs = useMemo(() => {
    if (currentStage !== 'staff') return [];
    if (!query) return [];
    const q = query.toLowerCase();
    return staffOptions.filter(s => 
      s.name.toLowerCase().includes(q)
    );
  }, [currentStage, query, staffOptions]);

  const filteredTimes = useMemo(() => {
    if (currentStage !== 'time') return [];
    if (!query) return [];
    return timeSlots.filter(t => t.includes(query) || t.replace(':', '').includes(query));
  }, [currentStage, query, timeSlots]);

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
  }, [query, currentStage, searchQuery]);

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

  // Search Mode Debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchResults = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return [];
    const term = debouncedSearchQuery.toLowerCase().trim();
    
    return globalBookings
      .filter(b => {
        const name = (b.customerName || b.data?.customerName || '').toLowerCase();
        const nameClean = name.replace(/\D/g, ''); 
        const phoneRaw = (b.customerPhone || b.phone || b.data?.customerPhone || b.data?.phone || '').toLowerCase();
        const phoneClean = phoneRaw.replace(/\D/g, ''); 
        const servicesArray = b.services || b.data?.services;
        const srvs = Array.isArray(servicesArray) 
          ? servicesArray.map((s: any) => s.name?.toLowerCase() || '').join(' ')
          : (b.serviceName || b.data?.serviceName || '').toLowerCase();
        const customerIdRaw = (b.customerId || b.data?.customerId || '').toLowerCase();
        const customerIdClean = customerIdRaw.replace(/\D/g, '');
        const termClean = term.replace(/\D/g, '');
          
        return name.includes(term) || 
               (termClean && nameClean.includes(termClean)) || 
               phoneRaw.includes(term) || 
               (termClean && phoneClean.includes(termClean)) || 
               customerIdRaw.includes(term) ||
               (termClean && customerIdClean.includes(termClean)) ||
               srvs.includes(term);
      })
      .sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateA > dateB ? -1 : 1;
        const timeA = a.startTime || '';
        const timeB = b.startTime || '';
        return timeA > timeB ? -1 : 1;
      });
  }, [debouncedSearchQuery, globalBookings]);

  const formattedDate = useMemo(() => {
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');
    return `${month}/${day}`;
  }, [currentDate]);

  const resetCreate = () => {
    setStage('service');
    setQuery('');
    setSelectedServices([]);
    setSelectedStaff(null);
    setSelectedCustomer(null);
    setSelectedTime(null);
    setEditingStage(null);
  };

  const resetAll = () => {
    resetCreate();
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setMode('idle');
  };

  // Focus input when mode changes
  useEffect(() => {
    if (mode === 'create') {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else if (mode === 'search') {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [mode]);

  const handleCreateKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (editingStage) { setEditingStage(null); setQuery(''); }
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
      const targetItem = currentList[selectedIndex] || currentList[0];

      if (currentStage === 'service') {
        const tokens = query.trim().split(/\s+/).filter(Boolean);
        if (tokens.length > 1) {
          const matchedServices = tokens.map(token => {
            const q = token.toLowerCase();
            return services.find(s => 
              (s.name && s.name.toLowerCase().includes(q)) || 
              (s.pinyin && s.pinyin.toLowerCase().includes(q))
            );
          }).filter(Boolean);
          if (matchedServices.length > 0) {
            setSelectedServices(matchedServices);
            if (editingStage) setEditingStage(null); else setStage('staff');
            setQuery('');
          }
        } else {
          if (targetItem) {
            setSelectedServices([targetItem]);
            if (editingStage) setEditingStage(null); else setStage('staff');
            setQuery('');
          }
        }
      } else if (currentStage === 'staff') {
        if (targetItem) {
          setSelectedStaff(targetItem);
          if (editingStage) setEditingStage(null); else setStage('customer');
          setQuery('');
        } else if (query.trim() === '') {
          setSelectedStaff({ id: 'unassigned', name: '无指定' });
          if (editingStage) setEditingStage(null); else setStage('customer');
          setQuery('');
        }
      } else if (currentStage === 'customer') {
        if (targetItem) {
          setSelectedCustomer({ name: targetItem.name, phone: targetItem.phone, gx_id: targetItem.gx_id });
        } else {
          const isPhone = /^[0-9]+$/.test(query);
          setSelectedCustomer({ name: isPhone ? "" : query, phone: isPhone ? query : "" });
        }
        if (editingStage) setEditingStage(null); else setStage('time');
        setQuery('');
      } else if (currentStage === 'time') {
        const finalTime = targetItem || query;
        if (finalTime) {
          setSelectedTime(finalTime as string);
          if (editingStage) setEditingStage(null); else setStage('confirm');
          setQuery('');
        }
      } else if (currentStage === 'confirm') {
        await submitBooking();
      }
    }
  };

  const submitBooking = async () => {
    if (selectedServices.length === 0 || !selectedStaff || !selectedCustomer || !selectedTime) return;
    const baseDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
    const masterOrderId = `ORD-${Date.now()}`;
    const finalCustomerId = selectedCustomer.gx_id || await BookingService.getAvailableCustomerId(shopId, 'CO');

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

  const handleOpenBooking = (booking: any) => {
    if (booking.date && setCrosshairDate) {
      setCrosshairDate(new Date(booking.date.replace(/-/g, '/')));
    }
    if (booking.startTime && setCrosshairTime) {
      setCrosshairTime(booking.startTime);
    }
    if (setCrosshairResourceId) {
      setCrosshairResourceId(booking.resourceId);
    }
    if (setEditingBooking) {
      setEditingBooking(booking);
    }
    if (handleCreateBookingClick) {
      handleCreateBookingClick();
    }
    resetAll();
  };

  return (
    <>
      {/* 物理结界：点击空白处重置 */}
      {mode !== 'idle' && (
        <div 
          className="fixed inset-0 z-[55]" 
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            // 绝对法则：点击外侧无条件清空并收起
            resetAll();
          }} 
          onMouseDown={(e) => {
             // 防止 mousedown 穿透
            e.stopPropagation();
          }}
          onTouchStart={(e) => {
             // 防止 touch 穿透
            e.stopPropagation();
          }}
        />
      )}
      <div 
        ref={paletteRef} 
        className={cn(
          "h-8 md:h-[38px] flex items-center z-[60]",
          mode === 'idle' 
            ? "relative w-full" 
            : "fixed top-[150px] md:top-[150px] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[368px]"
        )}
      >
        <div 
          className={cn(
            "absolute left-0 right-0 h-full flex items-center rounded-full border overflow-hidden backdrop-blur-md",
          borderColor,
          glowShadow,
          "bg-transparent", // 极致透明法则：废弃一切底色 (bg-black/5 等)
          textColor
        )}
      >
        {mode !== 'search' && (
          <div
            className={cn("h-full flex items-center", mode === 'create' ? "w-full px-4" : "flex-1 justify-center cursor-pointer hover:bg-white/5")}
            onClick={() => {
              if (mode === 'idle') setMode('create');
              else inputRef.current?.focus();
            }}
          >
            {mode === 'idle' ? (
              <div className="flex items-center gap-1.5 opacity-60">
                <Plus className="w-3.5 h-3.5" />
                <span className="text-[11px] tracking-widest uppercase">快速创建</span>
              </div>
            ) : (
              <div className="flex-1 flex flex-wrap items-center gap-2 relative">
                {selectedServices.length > 0 && editingStage !== 'service' && (
                  <div onClick={(e) => { e.stopPropagation(); setEditingStage('service'); setQuery(''); inputRef.current?.focus(); }} className="flex gap-1 cursor-pointer hover:opacity-70">
                    {selectedServices.map((srv, idx) => (
                      <div key={idx} className={cn("px-2.5 py-0.5 rounded-full text-[10px] tracking-widest border", isLight ? "border-black" : "border-white")}>{srv.name}</div>
                    ))}
                  </div>
                )}
                {selectedStaff && editingStage !== 'staff' && (
                  <div onClick={(e) => { e.stopPropagation(); setEditingStage('staff'); setQuery(''); inputRef.current?.focus(); }} className={cn("px-2.5 py-0.5 rounded-full text-[10px] tracking-widest border cursor-pointer hover:opacity-70", isLight ? "border-black" : "border-white")}>{selectedStaff.name}</div>
                )}
                {selectedCustomer && editingStage !== 'customer' && (
                  <div onClick={(e) => { e.stopPropagation(); setEditingStage('customer'); setQuery(''); inputRef.current?.focus(); }} className={cn("px-2.5 py-0.5 rounded-full text-[10px] tracking-widest border cursor-pointer hover:opacity-70", isLight ? "border-black" : "border-white")}>{selectedCustomer.name || selectedCustomer.phone}</div>
                )}
                {selectedTime && editingStage !== 'time' && (
                  <div onClick={(e) => { e.stopPropagation(); setEditingStage('time'); setQuery(''); inputRef.current?.focus(); }} className={cn("px-2.5 py-0.5 rounded-full text-[10px] tracking-widest border cursor-pointer hover:opacity-70", isLight ? "border-black" : "border-white")}>{formattedDate} {selectedTime}</div>
                )}

                {stage === 'confirm' && !editingStage ? (
                  <div className="flex-1 flex items-center justify-end gap-2 ml-auto">
                    <button onClick={(e) => { e.stopPropagation(); resetAll(); }} className={cn("w-6 h-6 rounded-full flex items-center justify-center border hover:scale-110", isLight ? "border-black/10" : "border-white/10")}><X className="w-3 h-3" /></button>
                    <button onClick={(e) => { e.stopPropagation(); submitBooking(); }} className={cn("w-6 h-6 rounded-full flex items-center justify-center border hover:scale-110 animate-pulse", isLight ? "border-black" : "border-white")}><Check className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={handleCreateKeyDown}
                      className="flex-1 min-w-[100px] h-6 bg-transparent outline-none text-[11px] tracking-widest placeholder:opacity-40"
                      placeholder={
                        currentStage === 'service' ? "输入项目首字母 (如 MN)..." :
                        currentStage === 'staff' ? "选择指派员工..." :
                        currentStage === 'customer' ? "输入客户电话/名字..." :
                        "输入时间 (如 1430)..."
                      }
                    />
                    <button onClick={(e) => { e.stopPropagation(); resetAll(); }} className="p-1 opacity-50 hover:opacity-100 shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        {mode === 'idle' && <div className={cn("w-[1px] h-4", isLight ? "bg-black/10" : "bg-white/10")} />}

        {mode !== 'create' && (
          <div
            className={cn("h-full flex items-center", mode === 'search' ? "w-full px-4" : "flex-1 justify-center cursor-pointer hover:bg-white/5")}
            onClick={() => {
              if (mode === 'idle') setMode('search');
              else searchInputRef.current?.focus();
            }}
          >
            {mode === 'idle' ? (
              <div className="flex items-center gap-1.5 opacity-60">
                <Search className="w-3.5 h-3.5" />
                <span className="text-[11px] tracking-widest uppercase">搜索预约</span>
              </div>
            ) : (
              <div className="flex-1 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 opacity-50" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') resetAll();
                  }}
                  className="flex-1 h-6 bg-transparent outline-none text-[11px] tracking-widest placeholder:opacity-40"
                  placeholder="输入客户电话/名字..."
                />
                {searchQuery && (
                  <button onClick={(e) => { e.stopPropagation(); resetAll(); }} className="p-1 opacity-50 hover:opacity-100">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dropdown for Create Mode */}
      <AnimatePresence>
        {mode === 'create' && stage !== 'confirm' && currentList.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "absolute top-full mt-2 left-0 right-0 max-h-[200px] overflow-y-auto rounded-lg border backdrop-blur-md z-[70] shadow-2xl",
              isLight ? "bg-white/90 border-black/10" : "bg-black/80 border-white/10"
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
                    "px-4 py-2 text-[11px] cursor-pointer transition-colors tracking-widest",
                    isSelected ? (isLight ? "bg-black/10" : "bg-white/10") : "",
                    isLight ? "text-black hover:bg-black/5" : "text-white hover:bg-white/5"
                  )}
                  onClick={() => {
                    setSelectedIndex(idx);
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

      {/* Dropdown for Search Mode */}
      <AnimatePresence>
        {mode === 'search' && debouncedSearchQuery.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "absolute top-full mt-2 left-0 right-0 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto border backdrop-blur-md z-[70] shadow-2xl",
              isLight ? "bg-white/90 border-black/10" : "bg-black/80 border-white/10"
            )}
          >
            {searchResults.length === 0 ? (
              <div className={cn("p-4 text-center text-[11px] tracking-widest", isLight ? "text-black/50" : "text-white/50")}>
                未找到相关预约
              </div>
            ) : (
              <div className="flex flex-col">
                {searchResults.map((booking) => {
                  const srvsArray = booking.services || booking.data?.services;
                  const srvs = Array.isArray(srvsArray) ? srvsArray.map((s: any) => s.name).join(', ') : booking.serviceName || booking.data?.serviceName || '未指定项目';
                  const status = booking.status;
                  let statusColor = isLight ? "text-black/50" : "text-white/50";
                  if (status === 'CANCELLED' || status === 'no_show') statusColor = "text-red-500/80";
                  if (status === 'COMPLETED' || status === 'CHECKED_OUT') statusColor = "text-[#39FF14]/80";

                  return (
                    <button
                      key={booking.id}
                      onClick={() => handleOpenBooking(booking)}
                      className={cn(
                        "flex flex-col text-left p-3 border-b transition-colors hover:bg-white/5 last:border-b-0",
                        isLight ? "border-black/5" : "border-white/5"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={cn("text-[11px] font-medium tracking-widest", isLight ? "text-black" : "text-white")}>
                          {booking.customerId || booking.data?.customerId || 'CO'}
                        </span>
                        <span className={cn("text-[10px] tracking-widest", statusColor)}>
                          {booking.date} {booking.startTime}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={cn("text-[10px] truncate max-w-[150px] tracking-widest", isLight ? "text-black/60" : "text-white/60")}>
                          {srvs}
                        </span>
                        <span className={cn("text-[10px] tracking-widest", isLight ? "text-black/40" : "text-white/40")}>
                          {booking.customerPhone || booking.phone || booking.data?.customerPhone || booking.data?.phone || booking.customerName || booking.data?.customerName || ''}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </>
  );
}
