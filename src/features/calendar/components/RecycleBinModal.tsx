import { useState, useEffect } from 'react';
import { X, RefreshCcw, Trash2, AlertTriangle } from 'lucide-react';
import { BookingService, BookingRecord } from '@/features/booking/api/booking';
import { useTranslations } from "next-intl";
import { useShop } from "@/features/shop/ShopContext";
import { cn } from "@/utils/cn";
import { useVisualSettings } from "@/hooks/useVisualSettings";

export function RecycleBinModal({ isOpen, onClose, shopId }: { isOpen: boolean, onClose: () => void, shopId: string }) {
 const t = useTranslations('RecycleBinModal');
 const { settings } = useVisualSettings();
 const isLight = settings.headerTitleColorTheme === 'coreblack';
 const { refreshBookings, trackAction } = useShop();
 const [voidedBookings, setVoidedBookings] = useState<BookingRecord[]>([]);
 const [isLoading, setIsLoading] = useState(false);

 useEffect(() => {
 if (isOpen) {
 loadVoidedBookings();
 }
 }, [isOpen, shopId]);

 const loadVoidedBookings = async () => {
 setIsLoading(true);
 try {
 const { data } = await BookingService.getVoidedBookings(shopId);
 setVoidedBookings(data);
 } catch (e) {
 console.error(e);
 } finally {
 setIsLoading(false);
 }
 };

 const handleRestore = async (id: string) => {
 await BookingService.restoreBookings([id]);
 await loadVoidedBookings();
 refreshBookings();
 trackAction();
 };

 const handlePurge = async (id: string) => {
 await BookingService.purgeBookings([id]);
 await loadVoidedBookings();
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-[300] flex items-center justify-center font-sans text-white touch-none">
 <div className="absolute inset-0 bg-black/60 " onClick={onClose} />
 
 <div className="relative w-full max-w-2xl h-[70vh] bg-black/80 border border-white/10 rounded-2xl flex flex-col overflow-hidden">
 {/* Header */}
 <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/50">
 <div className="flex items-center gap-3">
 <Trash2 className={cn("w-5 h-5 ", isLight ? "text-black" : "text-white")} />
 <span className="text-lg tracking-widest uppercase text-white ">{t('txt_494437')}</span>
 </div>
 <button onClick={onClose} className="text-white hover:text-white p-2 hover:bg-white/10 rounded-full">
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar relative">
 {isLoading ? (
 <div className="h-full flex items-center justify-center">
 <div className="w-8 h-8 border-2 border-white/10 rounded-full animate-spin" />
 </div>
 ) : voidedBookings.length === 0 ? (
 <div className="h-full flex flex-col items-center justify-center text-white gap-4">
 <Trash2 className="w-16 h-16 " />
 <span className=" tracking-widest text-xs uppercase ">{t('txt_7d246f')}</span>
 </div>
 ) : (
 voidedBookings.map(b => (
 <div key={b.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:border-white/15 group">
 <div className="flex flex-col gap-1">
 <div className="flex items-center gap-3">
 <span className=" text-white text-sm tracking-wide">
 {(b.customerName as string) || ((b.data as Record<string, any>)?.customerName as string) || '散客'}
 </span>
 <span className="text-[11px] text-white px-2 py-0.5 rounded border border-white/10 bg-black/40">
 {b.date} {b.startTime}
 </span>
 </div>
 <span className="text-xs text-white tracking-wider">
 {(b.serviceName as string) || ((b.data as Record<string, any>)?.serviceName as string) || '未命名服务'}
 </span>
 </div>
 <div className="flex items-center gap-3 group-hover:opacity-100 ">
 <button 
 onClick={() => handleRestore(b.id as string)} 
 className="px-4 py-2 rounded-lg border text-[11px] tracking-widest flex items-center gap-2 "
 >
 <RefreshCcw className="w-3 h-3" /> RESTORE
 </button>
 <button 
 onClick={() => handlePurge(b.id as string)} 
 className={cn("px-4 py-2 rounded-lg border text-[11px] tracking-widest flex items-center gap-2 ", isLight ? "border-black/30 text-black hover:bg-black/10" : "border-white/30 text-white hover:bg-white/10")}
 >
 <AlertTriangle className="w-3 h-3" /> PURGE
 </button>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 
 {/* 隐藏滚动条样式 */}
 <style dangerouslySetInnerHTML={{__html: `
 .custom-scrollbar::-webkit-scrollbar {
 width: 4px;
 }
 .custom-scrollbar::-webkit-scrollbar-track {
 background: rgba(0, 0, 0, 0.2);
 }
 .custom-scrollbar::-webkit-scrollbar-thumb {
 background: rgba(255, 255, 255, 0.1);
 border-radius: 10px;
 }
 .custom-scrollbar::-webkit-scrollbar-thumb:hover {
 background: rgba(255, 255, 255, 0.3);
 }
 `}} />
 </div>
 );
}