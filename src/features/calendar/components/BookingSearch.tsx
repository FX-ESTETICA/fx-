import { useState, useMemo, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { useShop } from '@/features/shop/ShopContext';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

export interface BookingSearchProps {
  visualSettings: any;
  setCrosshairDate: (date: Date) => void;
  setCrosshairTime: (time: string) => void;
  setCrosshairResourceId: (id: string | undefined) => void;
  setEditingBooking: (booking: any) => void;
  handleCreateBookingClick: () => void;
}

export const BookingSearch = ({ 
  visualSettings, 
  setCrosshairDate, 
  setCrosshairTime, 
  setCrosshairResourceId, 
  setEditingBooking, 
  handleCreateBookingClick 
}: BookingSearchProps) => {
  const { globalBookings } = useShop();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return [];
    
    const term = debouncedSearchTerm.toLowerCase().trim();
    
    return globalBookings
      .filter(b => {
        // 全局订单池 (globalBookings) 已经由 BookingService 铺平，属性在根级，不在 b.data 下
        const name = (b.customerName || b.data?.customerName || '').toLowerCase();
        const nameClean = name.replace(/\D/g, ''); 
        
        // 处理 customerPhone 或 phone，并移除所有空格、横线等符号以便纯数字匹配
        const phoneRaw = (b.customerPhone || b.phone || b.data?.customerPhone || b.data?.phone || '').toLowerCase();
        const phoneClean = phoneRaw.replace(/\D/g, ''); 
        
        const servicesArray = b.services || b.data?.services;
        const services = Array.isArray(servicesArray) 
          ? servicesArray.map((s: any) => s.name?.toLowerCase() || '').join(' ')
          : (b.serviceName || b.data?.serviceName || '').toLowerCase();
          
        // 处理 customerId，并提取纯数字用于极简匹配
        const customerIdRaw = (b.customerId || b.data?.customerId || '').toLowerCase();
        const customerIdClean = customerIdRaw.replace(/\D/g, '');
          
        // 搜索词也移除符号进行电话比对
        const termClean = term.replace(/\D/g, '');
          
        return name.includes(term) || 
               (termClean && nameClean.includes(termClean)) || 
               phoneRaw.includes(term) || 
               (termClean && phoneClean.includes(termClean)) || 
               customerIdRaw.includes(term) ||
               (termClean && customerIdClean.includes(termClean)) ||
               services.includes(term);
      })
      .sort((a, b) => {
        // Date descending
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateA > dateB ? -1 : 1;
        // Time descending
        const timeA = a.startTime || '';
        const timeB = b.startTime || '';
        return timeA > timeB ? -1 : 1;
      });
  }, [debouncedSearchTerm, globalBookings]);

  const handleOpenBooking = (booking: any) => {
    // 复用极速开单的完整唤醒链路
    if (booking.date) {
      const bDate = new Date(booking.date.replace(/-/g, '/'));
      setCrosshairDate(bDate);
    }
    if (booking.startTime) {
      setCrosshairTime(booking.startTime);
    }
    setCrosshairResourceId(booking.resourceId);
    setEditingBooking(booking);
    handleCreateBookingClick();
    setIsOpen(false);
  };

  const isLight = visualSettings?.headerTitleColorTheme === 'coreblack';

  return (
    <div className="px-8 mt-4 pointer-events-auto relative z-[60]" ref={containerRef}>
      <div className="relative group">
        <div className={cn(
          "flex items-center gap-2 px-3 py-2.5 rounded transition-all duration-300",
          "bg-transparent"
        )}>
          <Search className={cn("w-4 h-4", isLight ? "text-black/50" : "text-white/50")} />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="搜索名字或电话..."
            className={cn(
              "w-full bg-transparent border-none outline-none text-xs tracking-widest",
              isLight ? "text-black placeholder:text-black/30" : "text-white placeholder:text-white/30"
            )}
          />
          {/* 绝对透明底色 + 悬停发光边框法则 */}
          <div className={cn(
            "absolute inset-0 rounded pointer-events-none transition-all duration-300",
            "border border-transparent",
            isLight 
              ? "group-focus-within:border-black/20 group-focus-within:shadow-[0_0_8px_rgba(0,0,0,0.1)]" 
              : "group-focus-within:border-white/20 group-focus-within:shadow-[0_0_8px_rgba(255,255,255,0.1)]"
          )} />
        </div>

        {/* Dropdown Results */}
        <AnimatePresence>
          {isOpen && debouncedSearchTerm.trim() && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className={cn(
                "absolute top-full left-0 right-0 mt-2 rounded overflow-hidden max-h-[300px] overflow-y-auto",
                "bg-transparent border",
                isLight ? "border-black/20" : "border-white/20",
                "backdrop-blur-md shadow-2xl"
              )}
            >
              {results.length === 0 ? (
                <div className={cn("p-4 text-center text-xs", isLight ? "text-black/50" : "text-white/50")}>
                  未找到相关预约
                </div>
              ) : (
                <div className="flex flex-col">
                  {results.map((booking) => {
                    const servicesArray = booking.services || booking.data?.services;
                    const services = Array.isArray(servicesArray) 
                      ? servicesArray.map((s: any) => s.name).join(', ')
                      : booking.serviceName || booking.data?.serviceName || '未指定项目';
                      
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
                          <span className={cn("text-xs font-medium", isLight ? "text-black" : "text-white")}>
                            {booking.customerId || booking.data?.customerId || 'CO'}
                          </span>
                          <span className={cn("text-[10px]", statusColor)}>
                            {booking.date} {booking.startTime}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={cn("text-[10px] truncate max-w-[150px]", isLight ? "text-black/60" : "text-white/60")}>
                            {services}
                          </span>
                          <span className={cn("text-[10px]", isLight ? "text-black/40" : "text-white/40")}>
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
    </div>
  );
};
