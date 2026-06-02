"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { useShop } from "@/features/shop/ShopContext";

type QuickCommandPaletteProps = {
  visualSettings: any;
  setCrosshairDate?: (date: Date) => void;
  setCrosshairTime?: (time: string) => void;
  setCrosshairResourceId?: (id: string | undefined) => void;
  setEditingBooking?: (booking: any) => void;
  handleCreateBookingClick?: () => void;
};

export function QuickCommandPalette({
  visualSettings,
  setCrosshairDate,
  setCrosshairTime,
  setCrosshairResourceId,
  setEditingBooking,
  handleCreateBookingClick
}: QuickCommandPaletteProps) {
  const { globalBookings } = useShop();
  const isLight = visualSettings?.calendarBgIndex !== 0;
  const textColor = isLight ? "text-black" : "text-[#FDF5E6]";
  const borderColor = isLight ? "border-black/10" : "border-white/10";
  const glowShadow = isLight ? "drop-shadow-[0_0_8px_rgba(0,0,0,0.1)]" : "drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]";

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const resetSearch = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchResults = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return [];
    const term = debouncedSearchQuery.toLowerCase().trim();
    const termClean = term.replace(/\D/g, "");

    return globalBookings
      .filter((booking) => {
        const name = (booking.customerName || booking.data?.customerName || "").toLowerCase();
        const nameClean = name.replace(/\D/g, "");
        const phoneRaw = (booking.customerPhone || booking.phone || booking.data?.customerPhone || booking.data?.phone || "").toLowerCase();
        const phoneClean = phoneRaw.replace(/\D/g, "");
        const servicesArray = booking.services || booking.data?.services;
        const serviceText = Array.isArray(servicesArray)
          ? servicesArray.map((service: any) => service.name?.toLowerCase() || "").join(" ")
          : (booking.serviceName || booking.data?.serviceName || "").toLowerCase();
        const customerIdRaw = (booking.customerId || booking.data?.customerId || "").toLowerCase();
        const customerIdClean = customerIdRaw.replace(/\D/g, "");

        return name.includes(term)
          || (termClean && nameClean.includes(termClean))
          || phoneRaw.includes(term)
          || (termClean && phoneClean.includes(termClean))
          || customerIdRaw.includes(term)
          || (termClean && customerIdClean.includes(termClean))
          || serviceText.includes(term);
      })
      .sort((a, b) => {
        const dateA = a.date || "";
        const dateB = b.date || "";
        if (dateA !== dateB) return dateA > dateB ? -1 : 1;
        const timeA = a.startTime || "";
        const timeB = b.startTime || "";
        return timeA > timeB ? -1 : 1;
      });
  }, [debouncedSearchQuery, globalBookings]);

  const handleOpenBooking = (booking: any) => {
    if (booking.date && setCrosshairDate) {
      setCrosshairDate(new Date(booking.date.replace(/-/g, "/")));
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
    resetSearch();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[55]"
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            resetSearch();
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
        />
      )}

      <div
        className={cn(
          "h-8 md:h-[38px] flex items-center z-[60]",
          isOpen
            ? "fixed top-[180px] md:top-[180px] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[368px]"
            : "relative w-full"
        )}
      >
        <div
          className={cn(
            "absolute left-0 right-0 h-full flex items-center rounded-full border overflow-hidden backdrop-blur-md bg-transparent",
            borderColor,
            glowShadow,
            textColor
          )}
        >
          <div
            className={cn("h-full flex items-center", isOpen ? "w-full px-4" : "flex-1 justify-center cursor-pointer hover:bg-white/5")}
            onClick={() => {
              if (!isOpen) setIsOpen(true);
              else searchInputRef.current?.focus();
            }}
          >
            {!isOpen ? (
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
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") resetSearch();
                  }}
                  className="flex-1 h-6 bg-transparent outline-none text-[11px] tracking-widest placeholder:opacity-40"
                  placeholder="输入客户电话/名字..."
                />
                {searchQuery && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      resetSearch();
                    }}
                    className="p-1 opacity-50 hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isOpen && debouncedSearchQuery.trim() && (
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
                    const servicesArray = booking.services || booking.data?.services;
                    const servicesText = Array.isArray(servicesArray)
                      ? servicesArray.map((service: any) => service.name).join(", ")
                      : booking.serviceName || booking.data?.serviceName || "未指定项目";
                    const status = booking.status;
                    let statusColor = isLight ? "text-black/50" : "text-white/50";
                    if (status === "CANCELLED" || status === "no_show") statusColor = "text-red-500/80";
                    if (status === "COMPLETED" || status === "CHECKED_OUT") statusColor = "text-[#39FF14]/80";

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
                            {booking.customerId || booking.data?.customerId || "CO"}
                          </span>
                          <span className={cn("text-[10px] tracking-widest", statusColor)}>
                            {booking.date} {booking.startTime}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={cn("text-[10px] truncate max-w-[150px] tracking-widest", isLight ? "text-black/60" : "text-white/60")}>
                            {servicesText}
                          </span>
                          <span className={cn("text-[10px] tracking-widest", isLight ? "text-black/40" : "text-white/40")}>
                            {booking.customerPhone || booking.phone || booking.data?.customerPhone || booking.data?.phone || booking.customerName || booking.data?.customerName || ""}
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
