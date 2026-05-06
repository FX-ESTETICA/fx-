import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cn } from '@/utils/cn';
import { useVisualSettings } from '@/hooks/useVisualSettings';
import { ShieldAlert } from 'lucide-react';

import { useTranslations } from "next-intl";

interface PrivacySettingsProps {
 isTransparent?: boolean;
}

export function PrivacySettings({ isTransparent = false }: PrivacySettingsProps) {
  const t = useTranslations('PrivacySettings');
  const { user, activeRole } = useAuth();
 const { settings } = useVisualSettings();
 const isLight = settings.frontendBgIndex !== 0;
 const isBossView = activeRole === 'boss';
 const isMerchantView = activeRole === 'merchant';
 
 const [allowPhone, setAllowPhone] = useState(true);
 const [allowId, setAllowId] = useState(true);
 const [allowStranger, setAllowStranger] = useState(false);
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
 if (!user?.id) return;
 const fetchPrivacy = async () => {
 const { data } = await supabase
 .from('profiles')
 .select('allow_search_by_phone, merchant_allow_search_by_phone, boss_allow_search_by_phone, allow_search_by_id, merchant_allow_search_by_id, boss_allow_search_by_id, allow_stranger_messages')
 .eq('id', user.id)
 .single();
 
 if (data) {
 setAllowPhone(
 isBossView ? (data.boss_allow_search_by_phone ?? true) :
 isMerchantView ? (data.merchant_allow_search_by_phone ?? true) : 
 (data.allow_search_by_phone ?? true)
 );
 setAllowId(
 isBossView ? (data.boss_allow_search_by_id ?? true) :
 isMerchantView ? (data.merchant_allow_search_by_id ?? true) : 
 (data.allow_search_by_id ?? true)
 );
 setAllowStranger(data.allow_stranger_messages ?? false);
 }
 setIsLoading(false);
 };
 fetchPrivacy();
 }, [user?.id, isMerchantView, isBossView]);

 const togglePhone = async () => {
 if (!user?.id) return;
 const newValue = !allowPhone;
 setAllowPhone(newValue);
 
 const updateField = isBossView ? 'boss_allow_search_by_phone' : isMerchantView ? 'merchant_allow_search_by_phone' : 'allow_search_by_phone';
 await supabase.from('profiles').update({ [updateField]: newValue }).eq('id', user.id);
 };

 const toggleId = async () => {
 if (!user?.id) return;
 const newValue = !allowId;
 setAllowId(newValue);
 
 const updateField = isBossView ? 'boss_allow_search_by_id' : isMerchantView ? 'merchant_allow_search_by_id' : 'allow_search_by_id';
 await supabase.from('profiles').update({ [updateField]: newValue }).eq('id', user.id);
 };

 const toggleStranger = async () => {
 if (!user?.id) return;
 const newValue = !allowStranger;
 setAllowStranger(newValue);
 await supabase.from('profiles').update({ allow_stranger_messages: newValue }).eq('id', user.id);
 };

 if (isLoading) return null;

 return (
 <div className={cn(
 "w-full max-w-sm p-4 flex flex-col space-y-4",
 isTransparent 
 ? "bg-transparent border-transparent" 
 : cn(
 "rounded-3xl border",
 isLight ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10"
 )
 )}>
 <div className="flex items-center space-x-2 px-2">
 <ShieldAlert className={cn("w-4 h-4", isLight ? "text-black" : "text-white")} />
 <span className={cn("text-xs tracking-widest uppercase", isLight ? "text-black" : "text-white")}>
 {t('txt_title')}
 </span>
 </div>

 <div className="space-y-2">
 {/* 手机号搜索开关 */}
 <div className={cn(
 "flex items-center justify-between p-3",
 isTransparent 
 ? "bg-transparent border-transparent" 
 : cn(
 "rounded-2xl border", 
 isLight ? "bg-white/50 border-black/5" : "bg-black/50 border-white/5"
 )
 )}>
 <div className="flex flex-col">
 <span className={cn("text-sm font-medium tracking-wide", isLight ? "text-black" : "text-white")}>
 {t('txt_phone_title')}
 </span>
 <span className={cn("text-[11px] mt-0.5", isLight ? "text-black" : "text-white", isTransparent && "opacity-60")}>
 {t('txt_phone_desc')}
 </span>
 </div>
 <button 
 onClick={togglePhone}
 className={cn(
 "w-12 h-6 rounded-full relative",
 allowPhone ? "bg-green-500" : (isLight ? "bg-black/20" : "bg-white/20")
 )}
 >
 <div className={cn(
 "absolute top-1 w-4 h-4 rounded-full bg-white ",
 allowPhone ? "translate-x-7" : "translate-x-1"
 )} />
 </button>
 </div>

 {/* GX ID搜索开关 */}
 <div className={cn(
 "flex items-center justify-between p-3",
 isTransparent 
 ? "bg-transparent border-transparent" 
 : cn(
 "rounded-2xl border", 
 isLight ? "bg-white/50 border-black/5" : "bg-black/50 border-white/5"
 )
 )}>
 <div className="flex flex-col">
 <span className={cn("text-sm font-medium tracking-wide", isLight ? "text-black" : "text-white")}>
 {t('txt_id_title')}
 </span>
 <span className={cn("text-[11px] mt-0.5", isLight ? "text-black" : "text-white", isTransparent && "opacity-60")}>
 {t('txt_id_desc')}
 </span>
 </div>
 <button 
 onClick={toggleId}
 className={cn(
 "w-12 h-6 rounded-full relative",
 allowId ? "bg-green-500" : (isLight ? "bg-black/20" : "bg-white/20")
 )}
 >
 <div className={cn(
 "absolute top-1 w-4 h-4 rounded-full bg-white ",
 allowId ? "translate-x-7" : "translate-x-1"
 )} />
 </button>
 </div>

 {/* 陌生人消息网关开关 */}
 <div className={cn(
 "flex items-center justify-between p-3",
 isTransparent 
 ? "bg-transparent border-transparent" 
 : cn(
 "rounded-2xl border", 
 isLight ? "bg-white/50 border-black/5" : "bg-black/50 border-white/5"
 )
 )}>
 <div className="flex flex-col">
 <span className={cn("text-sm font-medium tracking-wide", isLight ? "text-black" : "text-white")}>
 {t('txt_stranger_title')}
 </span>
 <span className={cn("text-[11px] mt-0.5", isLight ? "text-black" : "text-white", isTransparent && "opacity-60")}>
 {t('txt_stranger_desc')}
 </span>
 </div>
 <button 
 onClick={toggleStranger}
 className={cn(
 "w-12 h-6 rounded-full relative",
 allowStranger ? "bg-green-500" : (isLight ? "bg-black/20" : "bg-white/20")
 )}
 >
 <div className={cn(
 "absolute top-1 w-4 h-4 rounded-full bg-white ",
 allowStranger ? "translate-x-7" : "translate-x-1"
 )} />
 </button>
 </div>
 </div>
 </div>
 );
}
