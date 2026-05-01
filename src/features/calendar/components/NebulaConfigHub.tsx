"use client";

import { X, Settings, Users, Scissors, Clock, Plus, Trash2, User, ChevronLeft, Check, Shield, CreditCard, Calendar as CalendarIcon, Smartphone, Briefcase, Eye, Link as LinkIcon, MonitorPlay, TrendingUp, Crown } from "lucide-react";
import { cn } from "@/utils/cn";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { OperatingHour, ShopOperatingConfig, DEFAULT_OPERATING_CONFIG, DailyOverride } from "./IndustryCalendar";
import { TodayOverrideController } from "./TodayOverrideController";
import { useVisualSettings } from '@/hooks/useVisualSettings';
import { useBackground, GLOBAL_BACKGROUNDS, CALENDAR_BACKGROUNDS } from '@/hooks/useBackground';
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useShop } from "@/features/shop/ShopContext";
import { useHardwareBack } from "@/hooks/useHardwareBack";

export interface CategoryItem { id: string; name: string }
export interface ServiceItem { id: string; categoryId: string; name: string; fullName?: string; prices?: number[]; price?: number; duration: number }
export interface StaffItem {
 id: string;
 name: string;
 role: string;
 color?: string;
 status: string;
 frontendId?: string;
 phone?: string;
 baseSalary?: number;
 guarantee?: number; // 新增：保底工资
 daysOff?: number; // 新增：每月休假天数
 commissionRate?: number;
 calendarView: string;
 nebulaAccess: boolean;
 operationRights: string;
 financialVisibility: string;
 services: string[];
}

export interface NebulaConfigHubProps {
 isOpen: boolean;
 onClose: () => void;
 shopId?: string;
 industryLabel?: string;
 operatingHours: ShopOperatingConfig | OperatingHour[];
 staffs: StaffItem[];
 categories: CategoryItem[];
 services: ServiceItem[];
 onGlobalSave: (hours: ShopOperatingConfig | OperatingHour[], staffs: StaffItem[], categories: CategoryItem[], services: ServiceItem[]) => void;
 isCloudDataLoaded?: boolean; // 新增：防反杀物理锁
 businessName?: string; // 新增：业务名称（用于全息雷达显示）
 businessAvatar?: string; // 新增：业务头像（用于全息雷达显示）
 initialTab?: "staff" | "services" | "hours" | "visual"; // 新增：允许外部指定初始打开的选项卡
}

/**
 * 星云配置中枢 (Nebula Config Hub)
 * 右侧滑出的高维度毛玻璃配置面板
 */
export const NebulaConfigHub = ({ 
 isOpen, 
 onClose, 
 shopId,
 industryLabel = "美业",
 operatingHours,
 staffs,
 categories,
 services,
 onGlobalSave,
 isCloudDataLoaded = true, // 默认为true兼容旧代码
 businessName,
 businessAvatar,
 initialTab = "hours"
}: NebulaConfigHubProps) => {
 const t = useTranslations('NebulaConfigHub');
 const { settings } = useVisualSettings(); // 获取全局视觉设置
 const isLight = settings.headerTitleColorTheme === 'coreblack';

 type MainTab = "staff" | "services" | "hours" | "visual";
 const [activeTab, setActiveTab] = useState<MainTab>(initialTab);
 
 // 当弹窗打开时，如果外部传入了 initialTab，强制同步（针对同一页面多次打开不同 Tab 的场景）
 useEffect(() => {
 if (isOpen) {
 setActiveTab(initialTab);
 }
 }, [isOpen, initialTab]);
 
 const { user } = useAuth();
 
 const [localHours, setLocalHours] = useState<ShopOperatingConfig | OperatingHour[]>(operatingHours);
 const [localStaffs, setLocalStaffs] = useState<StaffItem[]>(staffs);
 const [localCategories, setLocalCategories] = useState<CategoryItem[]>(categories);
 const [localServices, setLocalServices] = useState<ServiceItem[]>(services);

 const [, setSyncStatus] = useState<'idle' | 'syncing' | 'saved' | 'error'>('idle');
 const [activeEditors, setActiveEditors] = useState<Record<string, any>>({});
 const initialLoadRef = useRef(false);
 const prevDataRef = useRef("");

 // 【全息协同雷达 (Holographic Presence)】: 仅负责人员在线状态显示
 useEffect(() => {
 if (!isOpen || !shopId) return;

 const channelName = `config_presence_${shopId}`;
 const channel = supabase.channel(channelName, {
 config: {
 presence: {
 key: user?.id || `guest_${Date.now()}`
 }
 }
 });

 const userName = businessName || (user as any)?.name || (user as any)?.user_metadata?.full_name || (user as any)?.phone || 'BOSS';
 const userAvatar = businessAvatar || (user as any)?.user_metadata?.avatar_url || null;

 channel
 .on('presence', { event: 'sync' }, () => {
 const state = channel.presenceState();
 const activeUsers: Record<string, any> = {};
 for (const [key, presences] of Object.entries(state)) {
 if (presences && presences.length > 0) {
 activeUsers[key] = presences[0];
 }
 }
 setActiveEditors(activeUsers);
 })
 .subscribe(async (status) => {
 if (status === 'SUBSCRIBED') {
 await channel.track({
 name: userName,
 avatar: userAvatar,
 status: 'viewing',
 color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`
 });
 }
 });

 return () => {
 supabase.removeChannel(channel);
 };
 }, [isOpen, shopId, user, businessName, businessAvatar]);

 // 【单向数据流实时同步】：绝对信任来自外部 (Supabase DB onUpdate 或 全局广播) 的数据推送
 useEffect(() => {
 if (isOpen) {
 setLocalHours(operatingHours);
 setLocalStaffs(staffs);
 setLocalCategories(categories);
 setLocalServices(services);
 initialLoadRef.current = true;
 setSyncStatus('idle');
 // 核心：同步更新指纹，防止外部数据流入时被当成本地修改触发二次保存（死循环）
 prevDataRef.current = JSON.stringify({ operatingHours, staffs, categories, services });
 }
 }, [isOpen, operatingHours, staffs, categories, services]);

 const onGlobalSaveRef = useRef(onGlobalSave);
 useEffect(() => {
 onGlobalSaveRef.current = onGlobalSave;
 }, [onGlobalSave]);

 // 【Live Edit 自动同步引擎 (Auto-Save Debouncer)】
  useEffect(() => {
    if (!isOpen || !initialLoadRef.current || !isCloudDataLoaded) return;

    const currentDataStr = JSON.stringify({ 
      operatingHours: localHours, 
      staffs: localStaffs, 
      categories: localCategories, 
      services: localServices 
    });
    
    // 深度对比拦截：如果值完全没变，拒绝广播
    if (prevDataRef.current === currentDataStr) return;

    setSyncStatus('syncing');
    
    // 防抖 800ms：用户停止操作 0.8 秒后，像幽灵一样静默落盘
    const timer = setTimeout(async () => {
      try {
        await onGlobalSaveRef.current(localHours, localStaffs, localCategories, localServices);
        
        // 核心突破：静默触发员工的物理绑定
        if (shopId && shopId !== 'default') {
          // 找出所有被分配了前端ID的员工，且状态不为离职的
          const activeStaffsWithFrontendId = localStaffs.filter(s => s.frontendId && s.status !== 'resigned');
          if (activeStaffsWithFrontendId.length > 0) {
             const { BookingService } = await import('@/features/booking/api/booking');
             // 批量执行绑定（BookingService.bindUserToShop 内部有防重和静默处理）
             for (const staff of activeStaffsWithFrontendId) {
               if (staff.frontendId) {
                 await BookingService.bindUserToShop(staff.frontendId, shopId).catch(err => {
                    console.warn(`[NebulaConfigHub] 员工物理绑定失败: ${staff.frontendId}`, err);
                 });
               }
             }
          }
        }

        prevDataRef.current = currentDataStr;
        setSyncStatus('saved');
        
        // 2秒后恢复 idle 状态
        setTimeout(() => {
          setSyncStatus(current => current === 'saved' ? 'idle' : current);
        }, 2000);
      } catch (e) {
        console.error(e);
        setSyncStatus('error');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [localHours, localStaffs, localCategories, localServices, isOpen, isCloudDataLoaded, shopId]);

 // 原子修改包装器：只更新本地状态，让 useEffect 防抖去处理真实的保存
 const handleHoursChange = (newHours: ShopOperatingConfig | OperatingHour[]) => {
 setLocalHours(newHours);
 };

 const handleStaffsChange = (newStaffs: StaffItem[]) => {
 setLocalStaffs(newStaffs);
 };

 const handleCategoriesChange = (newCategories: CategoryItem[]) => {
 setLocalCategories(newCategories);
 };

 const handleServicesChange = (newServices: ServiceItem[]) => {
 setLocalServices(newServices);
 };


 // 状态机：感知当前是否有子表单正在编辑
 const [editingContext, setEditingContext] = useState<{
 type: 'staff' | 'service' | null;
 saveAction: (() => void) | null;
 cancelAction: (() => void) | null;
 }>({ type: null, saveAction: null, cancelAction: null });

 // 稳固的 action 回调注册，避免子组件重新渲染时触发死循环
 const handleEditingStateChange = useCallback((saveAction: (() => void) | null, cancelAction: (() => void) | null) => {
 setEditingContext({ 
 type: saveAction ? 'staff' : null, 
 saveAction, 
 cancelAction 
 });
 }, []);


 const handleContextualSave = () => {
 if (editingContext.saveAction) {
 editingContext.saveAction();
 }
 };

 const handleContextualCancel = () => {
 if (editingContext.cancelAction) {
 editingContext.cancelAction();
 }
 setEditingContext({ type: null, saveAction: null, cancelAction: null });
 };

 return (
 <>
 {/* 顶级修复：持久化毛玻璃抽屉护盾 (Persistent Drawer Glass Shield) */}
 {isOpen && (
 <div
 className={cn(
 "fixed inset-y-0 right-0 w-full md:w-[480px] z-[100] pointer-events-none",
 isLight ? "bg-transparent" : "bg-transparent"
 )}
 />
 )}

 {isOpen && (
 <>
 {/* 背景遮罩 - 已移除全屏黑色和毛玻璃，保持左侧清透 */}
 <div
 onClick={onClose}
 className="fixed inset-0 bg-transparent z-[101]"
 />

 {/* 抽屉主体 - 赛博半透明黑玻璃材质 */}
 <div
 className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-transparent z-[102] flex flex-col pointer-events-auto"
 >
 {/* 头部 */}
 <div className={cn("p-6 border-b flex items-center justify-between shrink-0", isLight ? "border-black/5" : "border-white/5")}>
 {/* 左侧：标题与图标 */}
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full flex items-center justify-center relative">
 <Settings className="w-4 h-4" />
 </div>
 <div>
 <h2 className={cn("text-sm uppercase tracking-widest flex items-center gap-2", isLight ? "text-black" : "text-white")}>
 {t('txt_406bc4')}
 </h2>
 <p className={cn("text-[11px] uppercase mt-1 flex items-center gap-2", isLight ? "text-black" : "text-white")}>
 {industryLabel}
 </p>
 </div>
 </div>

 {/* 右侧：全息雷达化身显示 与 关闭按钮 */}
 <div className="flex items-center gap-4">
 <div className="flex items-center -space-x-3 group relative">
 {Object.values(activeEditors).map((editor, i) => (
 <div 
 key={i} 
 className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] z-10 overflow-hidden "
 style={{ 
 backgroundColor: editor.avatar ? 'transparent' : (editor.color || '#00f0ff'), 
 color: '#000'
 }}
 >
 {editor.avatar ? (
 // eslint-disable-next-line @next/next/no-img-element
 <img src={editor.avatar} alt={editor.name} className="w-full h-full object-cover" />
 ) : (
 editor.name?.substring(0, 1).toUpperCase()
 )}
 </div>
 ))}
 
 {/* Hover 时显示的统一 tooltip */}
 {Object.values(activeEditors).length > 0 && (
 <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 text-white text-[11px] px-3 py-1.5 rounded-lg pointer-events-none whitespace-nowrap flex flex-col gap-1 z-50">
 {/* 小三角形指示器 */}
 <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/90 border-l border-t border-white/10 rotate-45" />
 {Object.values(activeEditors).map((editor, i) => (
 <div key={i} className="flex items-center justify-center gap-2 relative z-10">
 <div className="w-1.5 h-1.5 rounded-full " />
 <span className="text-white font-medium tracking-widest">{editor.name}</span>
 </div>
 ))}
 </div>
 )}

 {Object.keys(activeEditors).length > 1 && (
 <span className="text-[11px] ml-4 tracking-widest absolute -bottom-4 right-0">
 {Object.keys(activeEditors).length} SYNCED
 </span>
 )}
 </div>
 <div className={cn("w-px h-6 ml-2", isLight ? "bg-black/10" : "bg-white/10")} />
 <button
 onClick={onClose}
 className={cn("p-2 rounded-full ", isLight ? "text-black" : "text-white")}
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 </div>

 {/* 导航 Tabs */}
 <div className={cn("flex p-4 gap-2 border-b shrink-0 overflow-x-auto no-scrollbar", isLight ? "border-black/5" : "border-white/5")}>
 {[
 { id: "hours", label: t('txt_cc3307'), icon: Clock },
 { id: "staff", label: t('txt_bf9e5e'), icon: Users },
 { id: "services", label: t('txt_01295d'), icon: Scissors },
 { id: "visual", label: t('txt_5b4c03'), icon: MonitorPlay },
 ].map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as MainTab)}
 className={cn(
 "min-w-[80px] flex-1 py-3 px-2 rounded-xl flex flex-col items-center gap-2 border border-transparent",
 isLight ? "text-black" : "text-white"
 )}
 >
 <tab.icon className={cn("w-4 h-4", activeTab === tab.id && "")} />
 <span className="text-[11px] tracking-widest">{tab.label}</span>
 </button>
 ))}
 </div>

 {/* 内容区 */}
 <div className="flex-1 overflow-y-auto p-6 no-scrollbar relative pb-32">
 <div key={activeTab} className="space-y-6">
 {activeTab === "hours" && (
 <HoursConfig 
 hours={localHours} 
 onChange={handleHoursChange} 
 />
 )}
 {activeTab === "staff" && (
 <StaffConfig 
 staffs={localStaffs} 
 onChange={handleStaffsChange} 
 onEditingStateChange={handleEditingStateChange}
 services={localServices}
 isLight={isLight}
 />
 )}
 {activeTab === "services" && (
 <ServicesConfig 
 categories={localCategories}
 services={localServices}
 onCategoriesChange={handleCategoriesChange}
 onServicesChange={handleServicesChange}
 isLight={isLight}
 />
 )}
 {activeTab === "visual" && (
 <VisualSettingsConfig />
 )}
 </div>
 </div>

 {/* 底部 Contextual 操作栏 (仅在编辑时显示) */}
 {editingContext.type && (
 <div className={cn("absolute bottom-0 left-0 w-full p-6 border-t z-50 ", isLight ? "bg-white/80 border-black/10" : "bg-black/80 border-white/5")}
 >
 <div className="flex gap-4">
 <button
 onClick={handleContextualCancel}
 className={cn("flex-1 py-4 rounded-2xl border uppercase tracking-widest text-xs", isLight ? "bg-black/5 border-black/10 text-black " : "bg-white/5 border-white/10 text-white ")}
 >
 {t('txt_625fb2')}</button>
 <button
 onClick={handleContextualSave}
 className="flex-[2] py-4 rounded-2xl text-black uppercase tracking-widest text-xs"
 >
 {editingContext.type === 'staff' ? t('txt_dc8d03') : t('txt_49e56c')}
 </button>
 </div>
 </div>
 )}
 </div>
 </>
 )}
 </>
 );
};

// --- 独立的带防弹缓冲舱的输入框组件 ---
const BufferedInput = ({ 
 initialValue, 
 onSave, 
 placeholder, 
 className 
}: { 
 initialValue: string, 
 onSave: (val: string) => void, 
 placeholder?: string, 
 className?: string 
}) => {
 const [localVal, setLocalVal] = useState(initialValue);

 // 当外部初始值发生变化时，同步本地值（如果此时不在编辑状态）
 useEffect(() => {
 setLocalVal(initialValue);
 }, [initialValue]);

 const handleBlurOrEnter = () => {
 if (localVal !== initialValue) {
 onSave(localVal);
 }
 };

 return (
 <input 
 type="text"
 placeholder={placeholder}
 value={localVal}
 onChange={(e) => setLocalVal(e.target.value)}
 onBlur={handleBlurOrEnter}
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 e.preventDefault();
 e.currentTarget.blur(); // 触发 onBlur 去保存
 }
 }}
 className={className}
 />
 );
};

const VisualSettingsConfig = () => {
 const t = useTranslations('NebulaConfigHub');

 const { settings, updateSettings, isLoaded } = useVisualSettings();
 const { updateShopConfig } = useShop();
 const { bgIndex, setSpecificBackground } = useBackground();
 const isLight = settings.headerTitleColorTheme === 'coreblack';

 if (!isLoaded) return null;

 return (
 <div className="space-y-6">
 {/* 图层开关区 */}
 <div className="space-y-4">
 <h3 className={cn("text-xs uppercase tracking-widest", isLight ? "text-black" : "text-white")}>{t('txt_acbc2d')}</h3>
 
 {/* 星空开关 */}
 <div 
 className={cn("flex items-center justify-between p-4 rounded-xl cursor-pointer border", isLight ? "bg-black/5 border-black/5 " : "bg-white/[0.02] border-white/5 ")}
 onClick={() => {
 const newSettings = { showNebula: !settings.showNebula };
 updateSettings(newSettings);
 updateShopConfig('visualSettings', { ...settings, ...newSettings });
 }}
 >
 <div className="space-y-1">
 <span className={cn("text-xs block", isLight ? "text-black" : "text-white")}>{t('txt_ea97c1')}</span>
 <span className={cn("text-[11px] ", isLight ? "text-black" : "text-white")}>{t('txt_203d7a')}</span>
 </div>
 <div className={cn("w-10 h-6 rounded-full border flex items-center p-0.5 ", settings.showNebula ? " justify-end" : (isLight ? "bg-black/5 border-black/10 justify-start" : "bg-white/5 border-white/10 justify-start"))}>
 <div className={cn("w-4 h-4 rounded-full ", settings.showNebula ? "" : (isLight ? "bg-black/40" : "bg-white/40"))} />
 </div>
 </div>

 {/* STATIC ASSETS 横向资产缩略图矩阵 (双轨制) */}
 <div className={cn("space-y-6 p-4 rounded-xl border overflow-hidden", isLight ? "bg-black/[0.02] border-black/5" : "bg-white/[0.01] border-white/5")}>
 {/* 全局壁纸控制区 */}
 <div className="space-y-3">
 <label className={cn("text-[11px] uppercase tracking-widest", isLight ? "text-black" : "text-white")}>GLOBAL ASSETS (全局壁纸)</label>
 <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
 {GLOBAL_BACKGROUNDS.map((src, index) => {
 const isActive = bgIndex === index;
 return (
 <div 
 key={`global-bg-${index}`}
 onClick={() => {
 setSpecificBackground(index);
 updateShopConfig('globalBgIndex', index);
 
 const bgPath = GLOBAL_BACKGROUNDS[index];
 const filename = bgPath.split('/').pop() || '';
 const updates: any = {};
 if (filename.startsWith('A') || filename.startsWith('a')) {
 updates.headerTitleColorTheme = 'purewhite';
 updates.staffNameColorTheme = 'purewhite';
 updates.timelineColorTheme = 'whitegold';
 } else if (filename.startsWith('B') || filename.startsWith('b')) {
 updates.headerTitleColorTheme = 'coreblack';
 updates.staffNameColorTheme = 'coreblack';
 updates.timelineColorTheme = 'blackgold';
 }
 if (Object.keys(updates).length > 0) {
 updateSettings(updates);
 updateShopConfig('visualSettings', { ...settings, ...updates });
 }
 }}
 className={cn(
 "relative shrink-0 w-28 h-16 rounded-lg cursor-pointer overflow-hidden border-2",
 isActive 
 ? " opacity-100 " 
 : "border-white/5 "
 )}
 >
 <img 
 src={src} 
 alt={`global-bg-${index}`} 
 className="w-full h-full object-cover"
 />
 {isActive && (
 <div className="absolute top-1 right-1 text-black text-[11px] px-1.5 py-0.5 rounded-sm z-10">
 ACTIVE
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>

 {/* 日历专属壁纸控制区 */}
 <div className={cn("space-y-3 pt-4 border-t", isLight ? "border-black/5" : "border-white/5")}>
 <label className={cn("text-[11px] uppercase tracking-widest", isLight ? "text-black" : "text-white")}>CALENDAR ASSETS (日历专属壁纸)</label>
 <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
 {CALENDAR_BACKGROUNDS.map((src, index) => {
 const isActive = settings.calendarBgIndex === index;
 return (
 <div 
 key={`calendar-bg-${index}`}
 onClick={() => {
 const bgPath = CALENDAR_BACKGROUNDS[index];
 const filename = bgPath.split('/').pop() || '';
 const updates: any = { calendarBgIndex: index };
 if (filename.startsWith('A') || filename.startsWith('a')) {
 updates.headerTitleColorTheme = 'purewhite';
 updates.staffNameColorTheme = 'purewhite';
 updates.timelineColorTheme = 'whitegold';
 } else if (filename.startsWith('B') || filename.startsWith('b')) {
 updates.headerTitleColorTheme = 'coreblack';
 updates.staffNameColorTheme = 'coreblack';
 updates.timelineColorTheme = 'blackgold';
 }
 updateSettings(updates);
 updateShopConfig('visualSettings', { ...settings, ...updates });
 }}
 className={cn(
 "relative shrink-0 w-28 h-16 rounded-lg cursor-pointer overflow-hidden border-2",
 isActive 
 ? " opacity-100 " 
 : "border-white/5 "
 )}
 >
 <img 
 src={src} 
 alt={`calendar-bg-${index}`} 
 className="w-full h-full object-cover"
 />
 {isActive && (
 <div className="absolute top-1 right-1 text-black text-[11px] px-1.5 py-0.5 rounded-sm z-10">
 ACTIVE
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};

const HoursConfig = ({ hours, onChange }: { hours: ShopOperatingConfig | OperatingHour[], onChange: (h: ShopOperatingConfig | OperatingHour[]) => void }) => {
 const idSeed = useRef(0);
 const { settings } = useVisualSettings();
 const isLight = settings.headerTitleColorTheme === 'coreblack';
 
 // 初始化/升级为完整的新版结构，防御数据残缺
 const fullConfig: ShopOperatingConfig = Array.isArray(hours) 
 ? {
 ...DEFAULT_OPERATING_CONFIG,
 regular: {
 monday: hours, tuesday: hours, wednesday: hours, thursday: hours, friday: hours, saturday: hours, sunday: hours
 }
 }
 : {
 ...DEFAULT_OPERATING_CONFIG,
 ...(hours || {}),
 regular: (hours as ShopOperatingConfig)?.regular || DEFAULT_OPERATING_CONFIG.regular,
 specialDates: (hours as ShopOperatingConfig)?.specialDates || {}
 };

 const daysOfWeek = [
 { key: 'monday', label: '周一' },
 { key: 'tuesday', label: '周二' },
 { key: 'wednesday', label: '周三' },
 { key: 'thursday', label: '周四' },
 { key: 'friday', label: '周五' },
 { key: 'saturday', label: '周六' },
 { key: 'sunday', label: '周日' },
 ] as const;

 const handleAddRegular = (dayKey: keyof ShopOperatingConfig['regular']) => {
 idSeed.current += 1;
 const newId = `hour_${Date.now()}_${idSeed.current}`;
 const newConfig = { ...fullConfig };
 if (!newConfig.regular) newConfig.regular = { ...DEFAULT_OPERATING_CONFIG.regular };
 newConfig.regular[dayKey] = [...(newConfig.regular[dayKey] || []), { id: newId, start: 9, end: 18 }];
 onChange(newConfig);
 };

 const handleRemoveRegular = (dayKey: keyof ShopOperatingConfig['regular'], id: string) => {
 const newConfig = { ...fullConfig };
 newConfig.regular[dayKey] = newConfig.regular[dayKey].filter(h => h.id !== id);
 onChange(newConfig);
 };

 const handleUpdateRegular = (dayKey: keyof ShopOperatingConfig['regular'], id: string, field: 'start' | 'end', value: string) => {
 const numValue = parseInt(value, 10);
 if (isNaN(numValue)) return;
 const newConfig = { ...fullConfig };
 newConfig.regular[dayKey] = newConfig.regular[dayKey].map(h => h.id === id ? { ...h, [field]: numValue } : h);
 onChange(newConfig);
 };

 const handleToggleClosedRegular = (dayKey: keyof ShopOperatingConfig['regular'], isClosed: boolean) => {
 const newConfig = { ...fullConfig };
 if (!newConfig.regular) newConfig.regular = { ...DEFAULT_OPERATING_CONFIG.regular };
 if (isClosed) {
 newConfig.regular[dayKey] = []; // 清空时间段表示休息
 } else {
 idSeed.current += 1;
 newConfig.regular[dayKey] = [{ id: `hour_${Date.now()}_${idSeed.current}`, start: 9, end: 18 }];
 }
 onChange(newConfig);
 };

 // --- Special Dates Handlers ---
 const [newSpecialDate, setNewSpecialDate] = useState('');

 const handleAddSpecialDate = () => {
 if (!newSpecialDate) return;
 const newConfig = { ...fullConfig };
 if (!newConfig.specialDates) newConfig.specialDates = {};
 if (!newConfig.specialDates[newSpecialDate]) {
 newConfig.specialDates[newSpecialDate] = { isClosed: true, hours: [] };
 }
 onChange(newConfig);
 setNewSpecialDate('');
 };

 const handleRemoveSpecialDate = (dateStr: string) => {
 const newConfig = { ...fullConfig };
 delete newConfig.specialDates[dateStr];
 onChange(newConfig);
 };

 const handleToggleClosedSpecial = (dateStr: string, isClosed: boolean) => {
 const newConfig = { ...fullConfig };
 newConfig.specialDates[dateStr].isClosed = isClosed;
 if (!isClosed && newConfig.specialDates[dateStr].hours.length === 0) {
 idSeed.current += 1;
 newConfig.specialDates[dateStr].hours = [{ id: `hour_${Date.now()}_${idSeed.current}`, start: 9, end: 18 }];
 } else if (isClosed) {
 newConfig.specialDates[dateStr].hours = [];
 }
 onChange(newConfig);
 };

 const handleAddSpecialHour = (dateStr: string) => {
 idSeed.current += 1;
 const newId = `hour_${Date.now()}_${idSeed.current}`;
 const newConfig = { ...fullConfig };
 newConfig.specialDates[dateStr].hours = [...newConfig.specialDates[dateStr].hours, { id: newId, start: 9, end: 18 }];
 newConfig.specialDates[dateStr].isClosed = false;
 onChange(newConfig);
 };

 const handleRemoveSpecialHour = (dateStr: string, id: string) => {
 const newConfig = { ...fullConfig };
 newConfig.specialDates[dateStr].hours = newConfig.specialDates[dateStr].hours.filter(h => h.id !== id);
 onChange(newConfig);
 };

 const handleUpdateSpecialHour = (dateStr: string, id: string, field: 'start' | 'end', value: string) => {
 const numValue = parseInt(value, 10);
 if (isNaN(numValue)) return;
 const newConfig = { ...fullConfig };
 newConfig.specialDates[dateStr].hours = newConfig.specialDates[dateStr].hours.map(h => h.id === id ? { ...h, [field]: numValue } : h);
 onChange(newConfig);
 };

 // --- Today Override Handlers ---
 const handleTodayOverrideChange = (newOverride: DailyOverride | null) => {
 const newConfig = { ...fullConfig, todayOverride: newOverride };
 onChange(newConfig);
 };

 const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => i);

 // 内部通用时间段渲染组件
 const renderTimeBlocks = (
 hoursList: OperatingHour[], 
 onUpdate: (id: string, field: 'start' | 'end', value: string) => void,
 onRemove: (id: string) => void
 ) => (
 <div className="space-y-1 w-full mt-2">
 {hoursList.map((hour) => (
 <div 
 key={hour.id}
 
 
 
 className="flex items-center gap-3 py-1 group overflow-hidden"
 >
 <div className="flex-1 flex items-center justify-center gap-4">
 <select 
 value={hour.start} 
 onChange={(e) => onUpdate(hour.id, 'start', e.target.value)}
 className={cn("bg-transparent text-sm md:text-base outline-none cursor-pointer appearance-none text-right w-16", isLight ? "text-black" : "text-white")} 
 >
 {HOUR_OPTIONS.map(h => (
 <option key={`start-${h}`} value={h} className={cn(isLight ? "bg-white text-black" : "bg-black text-white")}>
 {h.toString().padStart(2, '0')}:00
 </option>
 ))}
 </select>
 <span className={cn("text-xs font-light", isLight ? "text-black" : "text-white")}>—</span>
 <select 
 value={hour.end}
 onChange={(e) => onUpdate(hour.id, 'end', e.target.value)}
 className={cn("bg-transparent text-sm md:text-base outline-none cursor-pointer appearance-none text-left w-16", isLight ? "text-black" : "text-white")} 
 >
 {HOUR_OPTIONS.map(h => (
 <option key={`end-${h}`} value={h} className={cn(isLight ? "bg-white text-black" : "bg-black text-white")}>
 {h.toString().padStart(2, '0')}:00
 </option>
 ))}
 </select>
 </div>
 {hoursList.length > 1 && (
 <button onClick={() => onRemove(hour.id)} className={cn(" p-1 ", isLight ? "text-black " : "text-white ")}>
 <Trash2 className="w-4 h-4" />
 </button>
 )}
 </div>
 ))}
 </div>
 );

 return (
 <div className="space-y-6">
 {/* 0. 今日临时覆盖设置 (Today's Live Override) */}
 <TodayOverrideController 
 todayOverride={fullConfig.todayOverride?.date === new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-') ? fullConfig.todayOverride : null} 
 onChange={handleTodayOverrideChange}
 fullConfig={fullConfig}
 />

 {/* 1. 常规星期几设置 */}
 <div className={cn("p-4 rounded-2xl space-y-4 border", isLight ? "bg-black/[0.02] border-black/5" : "bg-white/[0.02] border-white/5")}>
 <div className="flex items-center justify-between">
 <span className={cn("text-xs ", isLight ? "text-black" : "text-white")}>常规营业时间段 (Regular Hours)</span>
 </div>
 <p className={cn("text-[11px] ", isLight ? "text-black" : "text-white")}>
 按照星期一到星期日设置基础营业时间。如果一天内有午休，请添加多个时间段。
 </p>
 
 <div className="space-y-0">
 {daysOfWeek.map(({ key, label }) => {
 const dayHours = fullConfig.regular?.[key] || [];
 const isClosed = dayHours.length === 0;

 return (
 <div key={key} className={cn("flex flex-col py-3 border-b", isLight ? "border-black/5" : "border-white/5")}>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div className={cn("w-10 text-xs ", isLight ? "text-black" : "text-white")}>{label}</div>
 <button 
 onClick={() => handleToggleClosedRegular(key, !isClosed)}
 className={cn("px-2 py-0.5 text-[11px] tracking-widest rounded-sm ", 
 isClosed ? (isLight ? "text-black" : "text-white") : " "
 )}
 >
 {isClosed ? '休息' : '营业'}
 </button>
 </div>
 {!isClosed && (
 <button onClick={() => handleAddRegular(key)} className={cn("text-[11px] flex items-center gap-1 ", isLight ? "text-black " : "text-white ")}>
 <Plus className="w-3 h-3" /> 添加
 </button>
 )}
 </div>
 {!isClosed && renderTimeBlocks(
 dayHours, 
 (id, field, val) => handleUpdateRegular(key, id, field, val),
 (id) => handleRemoveRegular(key, id)
 )}
 </div>
 );
 })}
 </div>
 </div>

 {/* 2. 特殊节假日例外设置 */}
 <div className={cn("p-4 rounded-2xl space-y-4 border", isLight ? "bg-black/[0.02] border-black/5" : "bg-white/[0.02] border-white/5")}>
 <div className="flex items-center justify-between">
 <span className={cn("text-xs ", isLight ? "text-black" : "text-white")}>特殊日期与节假日 (Special Dates Override)</span>
 </div>
 <p className={cn("text-[11px] ", isLight ? "text-black" : "text-white")}>
 设置未来的店庆、节假日等例外时间。在日历渲染时，特殊日期的配置将强制覆盖常规星期的规律。
 </p>

 {/* 添加特殊日期器 */}
 <div className="flex gap-2 items-center">
 <input 
 type="date" 
 value={newSpecialDate}
 onChange={(e) => setNewSpecialDate(e.target.value)}
 className={cn("flex-1 border rounded-lg px-3 py-2 text-xs outline-none", isLight ? "bg-white text-black border-black/10 " : "bg-black text-white border-white/10 ")}
 />
 <button 
 onClick={handleAddSpecialDate}
 disabled={!newSpecialDate}
 className="px-4 py-2 text-xs rounded-lg border disabled:opacity-30"
 >
 添加日期
 </button>
 </div>

 {/* 渲染已有的特殊日期列表 */}
 <div className="space-y-0 mt-4">
 {Object.entries(fullConfig.specialDates || {}).sort(([a], [b]) => a.localeCompare(b)).map(([dateStr, specialConfig]) => (
 <div 
 key={dateStr}
 
 
 
 className={cn("flex flex-col py-3 border-b", isLight ? "border-black/5" : "border-white/5")}
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div className={cn("text-xs tracking-widest", isLight ? "text-black" : "text-white")}>{dateStr}</div>
 <button 
 onClick={() => handleToggleClosedSpecial(dateStr, !specialConfig.isClosed)}
 className={cn("px-2 py-0.5 text-[11px] tracking-widest rounded-sm ", 
 specialConfig.isClosed ? (isLight ? "text-black" : "text-white") : " "
 )}
 >
 {specialConfig.isClosed ? '休息' : '营业'}
 </button>
 </div>
 <div className="flex items-center gap-2">
 {!specialConfig.isClosed && (
 <button onClick={() => handleAddSpecialHour(dateStr)} className={cn("text-[11px] flex items-center gap-1 ", isLight ? "text-black " : "text-white ")}>
 <Plus className="w-3 h-3" /> 添加
 </button>
 )}
 <button onClick={() => handleRemoveSpecialDate(dateStr)} className={cn(" p-1", isLight ? "text-black " : "text-white ")}>
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </div>
 {!specialConfig.isClosed && renderTimeBlocks(
 specialConfig.hours,
 (id, field, val) => handleUpdateSpecialHour(dateStr, id, field, val),
 (id) => handleRemoveSpecialHour(dateStr, id)
 )}
 </div>
 ))}
 </div>

 </div>
 </div>
 );
};

import { useTranslations } from "next-intl";

const StaffConfig = ({ staffs, onChange, onEditingStateChange, services, isLight }: { staffs: StaffItem[], onChange: (s: StaffItem[]) => void, onEditingStateChange: (saveAction: (() => void) | null, cancelAction: (() => void) | null) => void, services: ServiceItem[], isLight: boolean }) => {
 const t = useTranslations('NebulaConfigHub');
 const [editingStaff, setEditingStaff] = useState<StaffItem | null>(null);

 // 监听编辑状态变化，同步到外层状态机
 useEffect(() => {
 if (!editingStaff) {
 onEditingStateChange(null, null);
 }
 }, [editingStaff, onEditingStateChange]);

 // 将 useCallback 移到顶层，遵循 React Hooks 规则
 const handleRegisterActions = useCallback((save: () => void, cancel: () => void) => {
 onEditingStateChange(save, () => {
 cancel();
 setEditingStaff(null);
 });
 }, [onEditingStateChange]);

 if (editingStaff) {
 return (
 <StaffForm 
 staff={editingStaff} 
 onBack={() => setEditingStaff(null)} 
 onSave={(data) => {
 if (editingStaff?.id) {
 onChange(staffs.map(s => s.id === editingStaff.id ? { ...data, id: editingStaff.id } : s));
 } else {
 onChange([...staffs, { ...data, id: `staff_${Date.now()}` }]);
 }
 
 // 彻底删除越权行为：不再在这里偷偷跑去执行 bindUserToShop
 // 这个动作已经被收缴并转移到了外层的 Live Edit (Auto-Save) 引擎中，会在保存时一并发送
 
 setEditingStaff(null);
 }} 
 registerActions={handleRegisterActions}
 availableServices={services}
 isLight={isLight}
 />
 );
 }

 return (
 <div className="space-y-4">
 <button 
 onClick={() => setEditingStaff({ id: "", name: "", role: "", status: "active", calendarView: "self", nebulaAccess: false, operationRights: "view", financialVisibility: "self", services: [] })}
 className={cn(
 "w-full py-3 rounded-xl border border-dashed text-[11px] tracking-widest flex items-center justify-center gap-2",
 isLight ? "border-black/20 text-black " : "border-white/20 text-white "
 )}
 >
 <Plus className="w-4 h-4" /> {t('txt_3fb42e')}</button>
 
 {staffs.map((staff) => (
 <div key={staff.id} className={cn("flex items-center justify-between p-4 border-b group cursor-pointer", isLight ? "border-black/5 " : "border-white/5 ")} onClick={() => setEditingStaff(staff)}>
 <div className="flex items-center gap-4">
 {/* 头像背景微光 (Scheme C) */}
 <div 
 className={cn(
 "w-10 h-10 rounded-full flex items-center justify-center relative overflow-hidden ",
 staff.status === "resigned" ? "grayscale " : ""
 )}
 style={{ backgroundColor: `${staff.color || '#FFFFFF'}20`, border: `1px solid ${staff.color || '#FFFFFF'}40` }}
 >
 <User className="w-5 h-5" style={{ color: staff.color || '#FFFFFF' }} />
 </div>
 <div className="flex flex-col">
 <div className="flex items-center gap-2">
 <span className={cn("text-xs ", staff.status === "resigned" ? (isLight ? "text-black line-through" : "text-white line-through") : (isLight ? "text-black" : "text-white"))}>{staff.name}</span>
 {staff.status === "on_leave" && <span className="px-1.5 py-0.5 rounded text-[11px] bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">{t('txt_62a8cf')}</span>}
 {staff.status === "resigned" && <span className={cn("px-1.5 py-0.5 rounded text-[11px] border", isLight ? "bg-black/5 text-black border-black/30" : "bg-white/5 text-white border-white/30")}>{t('txt_583e79')}</span>}
 </div>
 <span className={cn("text-[11px] mt-0.5 flex items-center gap-1", isLight ? "text-black" : "text-white")}>
 {staff.role} 
 {staff.frontendId && <LinkIcon className="w-2.5 h-2.5 " />}
 </span>
 </div>
 </div>
 <button className={cn("text-[11px] underline underline-offset-4 ", isLight ? "text-black " : "text-white ")}>{t('txt_224e2c')}</button>
 </div>
 ))}
 </div>
 );
};

const StaffForm = ({ staff, onBack, onSave, registerActions, availableServices = [], isLight }: { staff: StaffItem, onBack: () => void, onSave: (data: StaffItem) => void, registerActions: (save: () => void, cancel: () => void) => void, availableServices?: ServiceItem[], isLight: boolean }) => {
 const t = useTranslations('NebulaConfigHub');
 type StaffTab = "basic" | "finance" | "access";
 const [activeTab, setActiveTab] = useState<StaffTab>("basic");
 const [formData, setFormData] = useState({
 name: staff.name || "",
 role: staff.role || "",
 color: staff.color || "#06b6d4",
 status: staff.status || "active",
 frontendId: staff.frontendId || "",
 phone: staff.phone || "",
 baseSalary: staff.baseSalary || 0,
 guarantee: staff.guarantee || 0, // 新增：保底工资初始值
 daysOff: staff.daysOff ?? 4, // 新增：休假天数初始值，默认4
 commissionRate: staff.commissionRate || 0,
 calendarView: staff.calendarView || "self",
 nebulaAccess: staff.nebulaAccess || false,
 operationRights: staff.operationRights || "view",
 financialVisibility: staff.financialVisibility || "self",
 services: staff.services || []
 });
 const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
 const [realAvatar, setRealAvatar] = useState<string | null>(null);

 const registerBack = useHardwareBack(state => state.register);
 const unregisterBack = useHardwareBack(state => state.unregister);

 useEffect(() => {
 if (!formData.frontendId) {
 setRealAvatar(null);
 return;
 }
 const fetchAvatar = async () => {
 const { data } = await supabase
 .from('profiles')
 .select('avatar_url')
 .eq('gx_id', formData.frontendId)
 .maybeSingle();
 if (data?.avatar_url) {
 setRealAvatar(data.avatar_url);
 } else {
 setRealAvatar(null);
 }
 };
 fetchAvatar();
 }, [formData.frontendId]);

 useEffect(() => {
 if (isServicesModalOpen) {
 registerBack('nebula-services-modal', () => {
 setIsServicesModalOpen(false);
 return true;
 }, 50);
 } else {
 unregisterBack('nebula-services-modal');
 }
 return () => unregisterBack('nebula-services-modal');
 }, [isServicesModalOpen, registerBack, unregisterBack]);

 // 向父组件注册真实的保存动作
 // 使用 useRef 缓存回调函数，避免每次 formData 变化都导致外层组件重新渲染
 const formDataRef = useRef(formData);
 const onSaveRef = useRef(onSave);
 const onBackRef = useRef(onBack);

 useEffect(() => {
 formDataRef.current = formData;
 }, [formData]);

 useEffect(() => {
 onSaveRef.current = onSave;
 }, [onSave]);

 useEffect(() => {
 onBackRef.current = onBack;
 }, [onBack]);

 useEffect(() => {
 registerActions(
 () => {
 onSaveRef.current({ ...staff, ...formDataRef.current });
 },
 () => {
 onBackRef.current();
 }
 );
 }, [staff, registerActions]); // 仅在初始化或 staff 改变时重新注册

 const colors = [
 // 红色系
 "#ef4444", "#f87171", "#fca5a5",
 // 粉紫系
 "#ec4899", "#f472b6", "#d946ef", "#c026d3", "#a855f7",
 // 蓝紫系
 "#8b5cf6", "#6366f1", "#4f46e5",
 // 蓝色系
 "#3b82f6", "#0ea5e9", "#38bdf8", "#06b6d4", "#22d3ee",
 // 绿青系
 "#14b8a6", "#10b981", "#34d399", "#22c55e", "#84cc16",
 // 黄橙系
 "#eab308", "#f59e0b", "#f97316", "#fb923c",
 // 灰黑白系 (高级中性色)
 "#64748b", "#94a3b8", "#a8a29e", "#d6d3d1"
 ];

 return (
 <div className={cn("space-y-4 animate-in fade-in slide-in-from-right-4 ", isLight ? "text-black" : "text-white")}>
 {/* Header */}
 <div className={cn("flex items-center justify-between pb-4 border-b", isLight ? "border-black/5" : "border-white/5")}>
 <button onClick={onBack} className={cn("flex items-center gap-1 text-[11px] ", isLight ? "text-black " : "text-white ")}>
 <ChevronLeft className="w-4 h-4" /> {t('txt_adcd1d')}</button>
 <span className={cn("text-xs ", isLight ? "text-black" : "text-white")}>{staff.id ? t('txt_d03a9c') : t('txt_3fb42e')}</span>
 </div>

 {/* Internal Tabs */}
 <div className={cn("flex p-1 rounded-lg border", isLight ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10")}>
 {[
 { id: "basic", label: t('txt_754801'), icon: User },
 { id: "finance", label: t('txt_03b5ea'), icon: CreditCard },
 { id: "access", label: t('txt_d930d1'), icon: Shield },
 ].map(tab => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id as StaffTab)}
 className={cn(
 "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] ",
 activeTab === tab.id 
 ? (isLight ? "bg-black/10 text-black " : "bg-white/10 text-white ") 
 : (isLight ? "text-black " : "text-white ")
 )}
 >
 <tab.icon className="w-3 h-3" /> {tab.label}
 </button>
 ))}
 </div>

 {/* Form Content */}
 <div className="space-y-6 pt-2 pb-8">
 {activeTab === "basic" && (
 <div className="space-y-5 animate-in fade-in">
 {/* Avatar & Basic Info */}
 <div className={cn("flex items-start gap-4 p-4 rounded-xl border-b", isLight ? "border-black/5" : "border-white/5")}>
 <div 
 className="w-16 h-16 rounded-2xl flex items-center justify-center relative overflow-hidden shrink-0"
 style={{ backgroundColor: `${formData.color}20`, border: `1px solid ${formData.color}40` }}
 >
 {formData.frontendId ? (
 <Image
 src={realAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.frontendId}`}
 alt="avatar"
 fill
 sizes="64px"
 className="object-cover"
 />
 ) : (
 <User className="w-8 h-8" style={{ color: formData.color }} />
 )}
 <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end justify-center pb-1">
 <span className="text-[11px] text-white uppercase">{formData.frontendId ? 'Linked' : 'Default'}</span>
 </div>
 </div>
 <div className="flex-1 space-y-3">
 <div className="space-y-1">
 <label className={cn("text-[11px] uppercase tracking-widest", isLight ? "text-black" : "text-white")}>{t('txt_a140c4')}</label>
 <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={cn("w-full bg-transparent border-b text-sm pb-1 focus:outline-none ", isLight ? "border-black/10 text-black" : "border-white/10 text-white")} placeholder={t('txt_a6a423')} />
 </div>
 <div className="space-y-1">
 <label className={cn("text-[11px] uppercase tracking-widest", isLight ? "text-black" : "text-white")}>{t('txt_60f114')}</label>
 <input type="text" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className={cn("w-full bg-transparent border-b text-sm pb-1 focus:outline-none ", isLight ? "border-black/10 text-black" : "border-white/10 text-white")} placeholder={t('txt_480054')} />
 </div>
 </div>
 </div>

 {/* Colors */}
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <label className={cn("text-[11px] uppercase tracking-widest", isLight ? "text-black" : "text-white")}>{t('txt_d9f234')}</label>
 <div className="flex items-center gap-2">
 <div className={cn("w-4 h-4 rounded-full border", isLight ? "border-black/20" : "border-white/20")} style={{ backgroundColor: formData.color }} />
 <span className={cn("text-[11px] ", isLight ? "text-black" : "text-white")}>{formData.color}</span>
 </div>
 </div>
 <div className={cn("grid grid-cols-8 gap-2 p-3 rounded-xl border", isLight ? "bg-black/5 border-black/5" : "bg-white/[0.02] border-white/5")}>
 {colors.map(color => (
 <button 
 key={color} 
 onClick={() => setFormData({...formData, color})}
 className={cn(
 "w-6 h-6 rounded-full border-2 mx-auto",
 formData.color === color ? (isLight ? "border-black z-10 relative" : "border-white z-10 relative") : "border-transparent "
 )}
 style={{ backgroundColor: color, color: color }}
 />
 ))}
 </div>
 </div>

 {/* Status */}
 <div className="space-y-2">
 <label className={cn("text-[11px] uppercase tracking-widest", isLight ? "text-black" : "text-white")}>{t('txt_70240b')}</label>
 <div className="grid grid-cols-3 gap-2">
 {[
 { id: "active", label: t('txt_238a27'), color: " " },
 { id: "on_leave", label: t('txt_538024'), color: "text-yellow-400 border-yellow-400/20 bg-yellow-400/10" },
 { id: "resigned", label: t('txt_151a99'), color: isLight ? "text-black border-black/20 bg-black/10" : "text-white border-white/20 bg-white/10" },
 ].map(s => (
 <button
 key={s.id}
 onClick={() => setFormData({...formData, status: s.id})}
 className={cn(
 "py-2 rounded-lg text-xs border flex items-center justify-center gap-1",
 formData.status === s.id ? s.color : (isLight ? "border-black/5 text-black " : "border-white/5 text-white ")
 )}
 >
 {formData.status === s.id && <Check className="w-3 h-3" />}
 {s.label}
 </button>
 ))}
 </div>
 </div>

 {/* System Linking */}
 <div className="space-y-4 p-4 rounded-xl border ">
 <div className="flex items-center gap-2 ">
 <LinkIcon className="w-4 h-4" />
 <span className="text-xs uppercase">{t('txt_dab60d')}</span>
 </div>
 <div className="space-y-3">
 <div className="space-y-1">
 <label className={cn("text-[11px] uppercase tracking-widest", isLight ? "text-black" : "text-white")}>{t('txt_ab459e')}</label>
 <div className={cn("flex items-center rounded-md border overflow-hidden", isLight ? "bg-black/5 border-black/10" : "bg-black/40 border-white/10")}>
   <div className={cn("px-3 py-2 text-xs font-mono", isLight ? "text-black/60 bg-black/5 border-r border-black/10" : "text-white/60 bg-white/5 border-r border-white/10")}>GX-UR-</div>
   <input 
     type="text" 
     value={formData.frontendId.replace('GX-UR-', '')} 
     onChange={e => {
       const val = e.target.value.replace(/\D/g, ''); // 强制剔除非数字字符
       setFormData({...formData, frontendId: val ? `GX-UR-${val}` : ''});
     }} 
     maxLength={6}
     className={cn("w-full flex-1 text-xs p-2 focus:outline-none bg-transparent", isLight ? "text-black placeholder:text-black/40" : "text-white placeholder:text-white/40")} 
     placeholder="000000" 
   />
 </div>
 <p className={cn("text-[11px] mt-1", isLight ? "text-black" : "text-white")}>{t('txt_1e10a4')}</p>
 </div>
 <div className="space-y-1">
 <label className={cn("text-[11px] uppercase tracking-widest", isLight ? "text-black" : "text-white")}>{t('txt_f6da71')}</label>
 <div className="relative">
 <Smartphone className={cn("absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3", isLight ? "text-black" : "text-white")} />
 <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={cn("w-full rounded-md text-xs py-2 pl-7 pr-2 focus:outline-none ", isLight ? "bg-black/5 border border-black/10 text-black placeholder:text-black" : "bg-black/40 border border-white/10 text-white placeholder:text-white")} placeholder={t('txt_5c0b15')} />
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {activeTab === "finance" && (
 <div className="space-y-5 animate-in fade-in">
 {/* 新版动态表单：底薪类型选择器 */}
 <div className="space-y-3 mb-6">
 <label className={cn("text-[11px] uppercase tracking-widest flex items-center gap-1", isLight ? "text-black" : "text-white")}><CreditCard className="w-3 h-3"/> 薪酬模型 (SALARY MODEL)</label>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
 {[
 { id: "guarantee", label: "保底提成制", desc: "设保底额度，赚回本后分润" },
 { id: "fixed", label: "纯底薪制", desc: "固定死工资，无提成" },
 { id: "commission", label: "纯提成制", desc: "无底薪，纯按比例分润" }
 ].map(opt => {
 // 简单推导当前选中的模型
 let currentModel = "guarantee";
 if ((formData.guarantee || 0) === 0 && (formData.commissionRate || 0) === 0) currentModel = "fixed";
 if ((formData.baseSalary || 0) === 0 && (formData.guarantee || 0) === 0 && (formData.commissionRate || 0) > 0) currentModel = "commission";
 // 老板模式推导：全0
 if ((formData.baseSalary || 0) === 0 && (formData.guarantee || 0) === 0 && (formData.commissionRate || 0) === 0) currentModel = "boss";

 const isSelected = currentModel === opt.id || (currentModel === "boss" && opt.id === "fixed"); // 老板模式默认选中样式上可能需要特殊处理，这里暂时让纯底薪高亮或者都不高亮

 return (
 <div 
 key={opt.id} 
 onClick={() => {
 if (opt.id === "guarantee") setFormData({...formData, baseSalary: 0, guarantee: 3000, commissionRate: 40});
 if (opt.id === "fixed") setFormData({...formData, baseSalary: 3000, guarantee: 0, commissionRate: 0});
 if (opt.id === "commission") setFormData({...formData, baseSalary: 0, guarantee: 0, commissionRate: 50});
 }} 
 className={cn("p-3 rounded-xl border cursor-pointer ", isSelected ? " " : (isLight ? "bg-black/5 border-black/5 " : "bg-white/[0.02] border-white/5 "))}
 >
 <div className="flex items-center justify-between mb-1">
 <span className={cn("text-xs ", isSelected ? "" : (isLight ? "text-black" : "text-white"))}>{opt.label}</span>
 {isSelected && <Check className="w-3 h-3 " />}
 </div>
 <span className={cn("text-[11px] leading-tight block", isLight ? "text-black" : "text-white")}>{opt.desc}</span>
 </div>
 );
 })}
 </div>
 </div>

 {/* 动态显示的输入框阵列 */}
 <div className={cn("p-4 rounded-xl border space-y-4", isLight ? "border-black/5 bg-black/5" : "border-white/5 bg-white/[0.02]")}>
 
 {/* 仅在【纯底薪制】或【有底薪】时显示 */}
 {((formData.guarantee || 0) === 0 && (formData.commissionRate || 0) === 0) && (
 <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
 <label className={cn("text-[11px] uppercase tracking-widest", isLight ? "text-black" : "text-white")}>基础底薪 / BASE SALARY (€)</label>
 <input 
 type="number" 
 min="0"
 value={formData.baseSalary === 0 ? '' : formData.baseSalary} 
 onChange={e => {
 const val = e.target.value;
 setFormData({...formData, baseSalary: val === '' ? 0 : Math.max(0, Number(val))})
 }} 
 className={cn("w-full bg-transparent border-b text-lg pb-1 focus:outline-none ", isLight ? "border-black/10 text-black" : "border-white/10 text-white")} 
 placeholder="0" 
 />
 </div>
 )}
 
 {/* 仅在【保底提成制】显示 */}
 {((formData.guarantee || 0) > 0 || ((formData.baseSalary || 0) === 0 && (formData.commissionRate || 0) > 0 && (formData.guarantee || 0) > 0) || ((formData.guarantee || 0) !== 0)) && (
 <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
 <label className="text-[11px] uppercase tracking-widest">业绩保底 / GUARANTEE TARGET (€)</label>
 <input 
 type="number" 
 min="0"
 value={formData.guarantee === 0 ? '' : formData.guarantee} 
 onChange={e => {
 const val = e.target.value;
 setFormData({...formData, guarantee: val === '' ? 0 : Math.max(0, Number(val))})
 }} 
 className="w-full bg-transparent border-b text-lg pb-1 focus:outline-none " 
 placeholder="如：3200" 
 />
 </div>
 )}

 {/* 仅在【保底提成制】和【纯提成制】显示 */}
 {((formData.commissionRate || 0) > 0 || (formData.guarantee || 0) > 0) && (
 <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
 <label className={cn("text-[11px] uppercase tracking-widest flex items-center justify-between", isLight ? "text-black" : "text-white")}>
 <span>提成比例 / COMMISSION RATE</span>
 </label>
 <div className="relative">
 <input 
 type="number" 
 min="0"
 max="100"
 value={formData.commissionRate === 0 ? '' : formData.commissionRate} 
 onChange={e => {
 const val = e.target.value;
 setFormData({...formData, commissionRate: val === '' ? 0 : Math.max(0, Math.min(100, Number(val)))})
 }} 
 className={cn("w-full bg-transparent border-b text-lg pb-1 focus:outline-none pr-8", isLight ? "border-black/10 text-black" : "border-white/10 text-white")} 
 placeholder="0" 
 />
 <span className={cn("absolute right-0 bottom-2 ", isLight ? "text-black" : "text-white")}>%</span>
 </div>
 </div>
 )}

 {/* 始终显示：每月休假天数 (用于推算日目标) */}
 <div className={cn("space-y-1 pt-2 border-t animate-in fade-in", isLight ? "border-black/5" : "border-white/5")}>
 <label className={cn("text-[11px] uppercase tracking-widest", isLight ? "text-black" : "text-white")}>每月休假 / MONTHLY DAYS OFF</label>
 <div className="relative">
 <input 
 type="number" 
 min="0"
 max="31"
 value={formData.daysOff === 0 ? '' : formData.daysOff} 
 onChange={e => {
 const val = e.target.value;
 setFormData({...formData, daysOff: val === '' ? 0 : Math.max(0, Math.min(31, Number(val)))})
 }} 
 className={cn("w-full bg-transparent border-b text-lg pb-1 focus:outline-none pr-12", isLight ? "border-black/10 text-black" : "border-white/10 text-white")} 
 placeholder="0" 
 />
 <span className={cn("absolute right-0 bottom-2", isLight ? "text-black" : "text-white")}>天/月</span>
 </div>
 </div>
 </div>

 {/* 自动化提示看板 (动态推演) */}
 {(() => {
 const b = formData.baseSalary || 0;
 const g = formData.guarantee || 0;
 const r = formData.commissionRate || 0;
 const d = formData.daysOff ?? 4;
 
 // 获取当前月真实天数
 const today = new Date();
 const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
 const workDays = Math.max(1, daysInMonth - d);
 
 let monthTarget = 0;
 let dayTarget = 0;
 let targetStr = "该员工未设置保底要求，无需进行回本推演。";
 
 // 老板模式判定 (All Zero)
 const isBossMode = b === 0 && g === 0 && r === 0;

 if (isBossMode) {
 return (
 <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/30 flex gap-3 items-start relative overflow-hidden">
 <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/20 rounded-full"></div>
 <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500 shrink-0 relative z-10">
 <Crown className="w-4 h-4" />
 </div>
 <div className="space-y-1 relative z-10">
 <h4 className={cn("text-xs flex items-center gap-2", isLight ? "text-black" : "text-white")}>
 [ 老板模式 ] 顶级权限激活
 </h4>
 <p className={cn("text-[11px] leading-relaxed ", isLight ? "text-black" : "text-white")}>
 无薪酬参数，自动豁免所有业绩考核。此账号产生的业绩将作为门店纯利润，不计入个人提成支出。
 </p>
 </div>
 </div>
 );
 }

 if (g > 0 && r > 0) {
 monthTarget = Math.round(g / (r / 100));
 dayTarget = Math.round(monthTarget / workDays);
 targetStr = `本月共 ${daysInMonth} 天，扣除 ${d} 天休假，剩余 ${workDays} 个工作日。日均回本目标为：€ ${dayTarget}。`;
 } else if (g === 0 && r === 0) {
 targetStr = `该员工为纯底薪模式，无业绩硬性考核要求。`;
 } else if (g === 0 && r > 0) {
 targetStr = `该员工为纯提成模式，无保底成本压力。日目标取决于其个人期望。`;
 }

 return (
 <div className="p-4 rounded-xl bg-gradient-to-br to-transparent border flex gap-3 items-start relative overflow-hidden">
 <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full"></div>
 <div className="p-2 rounded-lg shrink-0 relative z-10">
 <TrendingUp className="w-4 h-4" />
 </div>
 <div className="space-y-1 relative z-10">
 <h4 className={cn("text-xs flex items-center gap-2", isLight ? "text-black" : "text-white")}>
 AI 动态目标推演 
 {g > 0 && r > 0 && <span className="tracking-wider">€ {monthTarget} / 月</span>}
 </h4>
 <p className={cn("text-[11px] leading-relaxed ", isLight ? "text-black" : "text-white")}>
 {targetStr}
 </p>
 </div>
 </div>
 );
 })()}
 </div>
 )}

 {activeTab === "access" && (
 <div className="space-y-6 animate-in fade-in">
 {/* Calendar Access */}
 <div className="space-y-3">
 <label className={cn("text-[11px] uppercase tracking-widest flex items-center gap-1", isLight ? "text-black" : "text-white")}><CalendarIcon className="w-3 h-3"/> {t('txt_461577')}</label>
 <div className="grid grid-cols-2 gap-2">
 {[
 { id: "self", label: t('txt_c71868'), desc: t('txt_cd5e70') },
 { id: "all", label: t('txt_0467cc'), desc: t('txt_319cc2') }
 ].map(opt => (
 <div key={opt.id} onClick={() => setFormData({...formData, calendarView: opt.id})} className={cn("p-3 rounded-xl border cursor-pointer ", formData.calendarView === opt.id ? " " : (isLight ? "bg-black/5 border-black/5 " : "bg-white/[0.02] border-white/5 "))}>
 <div className="flex items-center justify-between mb-1">
 <span className={cn("text-xs ", formData.calendarView === opt.id ? "" : (isLight ? "text-black" : "text-white"))}>{opt.label}</span>
 {formData.calendarView === opt.id && <Check className="w-3 h-3 " />}
 </div>
 <span className={cn("text-[11px]", isLight ? "text-black" : "text-white")}>{opt.desc}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Operation Rights */}
 <div className="space-y-3">
 <label className={cn("text-[11px] uppercase tracking-widest flex items-center gap-1", isLight ? "text-black" : "text-white")}><Shield className="w-3 h-3"/> {t('txt_773712')}</label>
 <select value={formData.operationRights} onChange={e => setFormData({...formData, operationRights: e.target.value})} className={cn("w-full border rounded-lg text-xs p-3 focus:outline-none appearance-none cursor-pointer", isLight ? "bg-black/5 border-black/10 text-black" : "bg-black/40 border-white/10 text-white")}>
 <option value="view" className={cn(isLight ? "bg-white text-black" : "bg-black text-white")}>{t('txt_7781d9')}</option>
 <option value="edit" className={cn(isLight ? "bg-white text-black" : "bg-black text-white")}>{t('txt_2878a0')}</option>
 <option value="edit_price" className={cn(isLight ? "bg-white text-black" : "bg-black text-white")}>{t('txt_823d26')}</option>
 </select>
 </div>

 {/* Financial Visibility */}
 <div className="space-y-3">
 <label className={cn("text-[11px] uppercase tracking-widest flex items-center gap-1", isLight ? "text-black" : "text-white")}><Eye className="w-3 h-3"/> {t('txt_db3e82')}</label>
 <select value={formData.financialVisibility} onChange={e => setFormData({...formData, financialVisibility: e.target.value})} className={cn("w-full border rounded-lg text-xs p-3 focus:outline-none appearance-none cursor-pointer", isLight ? "bg-black/5 border-black/10 text-black" : "bg-black/40 border-white/10 text-white")}>
 <option value="self" className={cn(isLight ? "bg-white text-black" : "bg-black text-white")}>{t('txt_2091de')}</option>
 <option value="store" className={cn(isLight ? "bg-white text-black" : "bg-black text-white")}>{t('txt_395559')}</option>
 </select>
 </div>

 {/* Nebula Access */}
 <div className={cn("flex items-center justify-between p-4 rounded-xl border cursor-pointer", formData.nebulaAccess ? " " : (isLight ? "border-black/5 bg-black/5" : "border-white/5 bg-white/5"))} onClick={() => setFormData({...formData, nebulaAccess: !formData.nebulaAccess})}>
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <span className={cn("text-xs ", isLight ? "text-black" : "text-white")}>{t('txt_c4b9ca')}</span>
 <span className="px-1.5 py-0.5 rounded text-[11px] border uppercase">Nebula</span>
 </div>
 <p className={cn("text-[11px]", isLight ? "text-black" : "text-white")}>{t('txt_45b088')}</p>
 </div>
 <div className={cn("w-10 h-6 rounded-full border flex items-center p-0.5 ", formData.nebulaAccess ? " justify-end" : (isLight ? "bg-black/10 border-black/20 justify-start" : "bg-white/5 border-white/10 justify-start"))}>
 <div className={cn("w-4 h-4 rounded-full ", formData.nebulaAccess ? "" : (isLight ? "bg-black/40" : "bg-white/40"))} />
 </div>
 </div>

 {/* Assigned Services (Capabilities Workflow) */}
 <div className={cn("pt-4 border-t space-y-3", isLight ? "border-black/10" : "border-white/10")}>
 <label className={cn("text-[11px] uppercase tracking-widest flex items-center justify-between", isLight ? "text-black" : "text-white")}>
 <span className="flex items-center gap-1"><Briefcase className="w-3 h-3"/> {t('txt_149023')}</span>
 <span className={cn("cursor-pointer ", isLight ? " " : " ")} onClick={() => setIsServicesModalOpen(true)}>{t('txt_8347a9')}</span>
 </label>
 <div className={cn("p-3 rounded-xl border min-h-[60px] flex flex-wrap gap-2", isLight ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5")}>
 {formData.services.length > 0 ? (
 formData.services.map((svcId: string) => {
 const svc = availableServices.find(s => s.id === svcId);
 if (!svc) return null;
 return (
 <div key={svcId} className={cn("px-2 py-1 rounded border text-[11px] flex items-center gap-1", isLight ? "bg-black/10 border-black/10 text-black" : "bg-white/10 border-white/10 text-white")}>
 {svc.name}
 <button className={cn("", isLight ? "text-black " : "text-white ")} onClick={() => setFormData({...formData, services: formData.services.filter((id: string) => id !== svcId)})}>
 <X className="w-2.5 h-2.5" />
 </button>
 </div>
 );
 })
 ) : (
 <span className={cn("text-xs my-auto", isLight ? "text-black" : "text-white")}>{t('txt_fe642f')}</span>
 )}
 </div>
 <p className="text-[11px] ">{t('txt_c7f632')}</p>
 </div>
 </div>
 )}
 </div>

 {/* Services Modal Mock */}
 {isServicesModalOpen && (
 <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
 <div className={cn("border rounded-2xl p-6 w-full max-w-sm space-y-4 ", isLight ? "bg-white border-black/10" : "bg-[#111] border-white/10")}>
 <h3 className={cn("text-sm ", isLight ? "text-black" : "text-white")}>{t('txt_070091')}</h3>
 <div className="space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar">
 {availableServices.map(svc => (
 <div key={svc.id} className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer ", isLight ? "border-black/5 bg-black/5 " : "border-white/5 bg-white/5 ")} onClick={() => {
 const newServices = formData.services.includes(svc.id) ? formData.services.filter((id: string) => id !== svc.id) : [...formData.services, svc.id];
 setFormData({...formData, services: newServices});
 }}>
 <div className={cn("w-4 h-4 rounded border flex items-center justify-center", formData.services.includes(svc.id) ? " text-black" : (isLight ? "border-black/20" : "border-white/20"))}>
 {formData.services.includes(svc.id) && <Check className="w-3 h-3" />}
 </div>
 <div className="flex flex-col">
 <span className={cn("text-xs ", isLight ? "text-black" : "text-white")}>{svc.name}</span>
 <span className={cn("text-[11px] ", isLight ? "text-black" : "text-white")}>¥{svc.price} · {svc.duration}min</span>
 </div>
 </div>
 ))}
 </div>
 <button onClick={() => setIsServicesModalOpen(false)} className={cn("w-full py-2.5 rounded-xl text-xs ", isLight ? "bg-black/5 text-black " : "bg-white/10 text-white ")}>
 {t('txt_3fdf2d')}</button>
 </div>
 </div>
 )}
 </div>
 );
};

const ServicesConfig = ({ 
 categories, 
 services, 
 onCategoriesChange, 
 onServicesChange,
 isLight
}: { 
 categories: CategoryItem[], 
 services: ServiceItem[], 
 onCategoriesChange: (c: CategoryItem[]) => void, 
 onServicesChange: (s: ServiceItem[]) => void,
 isLight: boolean
}) => {
 const t = useTranslations('NebulaConfigHub');
 const [activeCategoryId, setActiveCategoryId] = useState<string | null>(categories.length > 0 ? categories[0].id : null);
 const [isCreatingCategory, setIsCreatingCategory] = useState<boolean>(categories.length === 0);
 const [newCatName, setNewCatName] = useState("");
 const [newSvcName, setNewSvcName] = useState("");
 const [newSvcPrice, setNewSvcPrice] = useState("");
 const nameInputRef = useRef<HTMLInputElement>(null);
 const priceInputRef = useRef<HTMLInputElement>(null);
 
 const categoryIdSeed = useRef(0);
 const serviceIdSeed = useRef(0);

 // Synchronize activeCategoryId if categories change and active is gone, or if initially null and categories added
 useEffect(() => {
 if (!activeCategoryId && categories.length > 0 && !isCreatingCategory) {
 setActiveCategoryId(categories[0].id);
 } else if (activeCategoryId && !categories.find(c => c.id === activeCategoryId) && !isCreatingCategory) {
 setActiveCategoryId(categories.length > 0 ? categories[0].id : null);
 }
 
 if (categories.length === 0) {
 setIsCreatingCategory(true);
 }
 }, [categories, activeCategoryId, isCreatingCategory]);

 const handleCreateCategory = () => {
 if (!newCatName.trim()) return;
 const targetName = newCatName.trim();
 categoryIdSeed.current += 1;
 const newCatId = `cat_${Date.now()}_${categoryIdSeed.current}`;
 onCategoriesChange([...categories, { id: newCatId, name: targetName }]);
 setActiveCategoryId(newCatId);
 setIsCreatingCategory(false);
 setNewCatName("");
 };

 const handleCreateService = () => {
 if (!newSvcName.trim() || !activeCategoryId) return;
 
 const parsedPrice = parseInt(newSvcPrice.trim(), 10);
 const basePrice = isNaN(parsedPrice) ? 0 : parsedPrice;

 const newItem = {
 id: `svc_${Date.now()}_${++serviceIdSeed.current}`,
 categoryId: activeCategoryId,
 name: newSvcName.trim(),
 prices: [basePrice],
 duration: 60
 };

 onServicesChange([...services, newItem]);
 setNewSvcName("");
 setNewSvcPrice("");
 // 极速连录：敲击回车后自动跳回项目名称输入框
 setTimeout(() => nameInputRef.current?.focus(), 50);
 };

 const handleRemoveService = (id: string) => {
 onServicesChange(services.filter(s => s.id !== id));
 };

 const handleRemoveCategory = (id: string) => {
 onCategoriesChange(categories.filter((c) => c.id !== id));
 };

 // --- 分类标题行内编辑逻辑 ---
 const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
 const [categoryEditInput, setCategoryEditInput] = useState("");

 const handleStartCategoryEdit = (category: CategoryItem) => {
 setEditingCategoryId(category.id);
 setCategoryEditInput(category.name);
 };

 const handleSaveCategoryEdit = (categoryId: string) => {
 if (!categoryEditInput.trim()) {
 setEditingCategoryId(null);
 return;
 }
 const newName = categoryEditInput.trim();
 onCategoriesChange(categories.map(c => {
 if (c.id === categoryId) {
 return { ...c, name: newName };
 }
 return c;
 }));
 setEditingCategoryId(null);
 };

 // --- 极简横向平铺：原地编辑逻辑 ---
 const [editingField, setEditingField] = useState<{ id: string, field: 'name' | 'price' } | null>(null);
 const [editValue, setEditValue] = useState("");

 const handleStartEditField = (service: ServiceItem, field: 'name' | 'price') => {
 setEditingField({ id: service.id, field });
 if (field === 'name') {
 setEditValue(service.name);
 } else {
 const basePrice = service.prices && service.prices.length > 0 ? service.prices[0] : (service.price || 0);
 setEditValue(basePrice.toString());
 }
 };

 const handleSaveEditField = () => {
 if (!editingField) return;
 const { id, field } = editingField;
 
 onServicesChange(services.map(s => {
 if (s.id === id) {
 if (field === 'name') {
 return { ...s, name: editValue.trim() || s.name };
 } else {
 const parsedPrice = parseInt(editValue.trim(), 10);
 const newPrice = isNaN(parsedPrice) ? 0 : parsedPrice;
 const newPrices = s.prices ? [...s.prices] : [];
 if (newPrices.length > 0) {
 newPrices[0] = newPrice;
 } else {
 newPrices.push(newPrice);
 }
 return { ...s, prices: newPrices };
 }
 }
 return s;
 }));
 setEditingField(null);
 };

 const handleDurationChange = (serviceId: string, newDuration: number) => {
 onServicesChange(services.map(s => s.id === serviceId ? { ...s, duration: newDuration } : s));
 };

 // --- 变体胶囊逻辑 ---
 const [addingVariantId, setAddingVariantId] = useState<string | null>(null);
 const [variantInput, setVariantInput] = useState("");

 const handleAddVariant = (serviceId: string) => {
 if (!variantInput.trim()) {
 setAddingVariantId(null);
 return;
 }
 const newPrice = parseInt(variantInput.trim(), 10);
 if (!isNaN(newPrice)) {
 onServicesChange(services.map(s => {
 if (s.id === serviceId) {
 const newPrices = s.prices ? [...s.prices] : [s.price || 0];
 newPrices.push(newPrice);
 return { ...s, prices: newPrices };
 }
 return s;
 }));
 }
 setVariantInput("");
 setAddingVariantId(null);
 };

 const handleRemoveVariant = (serviceId: string, indexToRemove: number) => {
 if (indexToRemove === 0) return; // 基准价不可在此删除
 onServicesChange(services.map(s => {
 if (s.id === serviceId && s.prices) {
 const newPrices = [...s.prices];
 newPrices.splice(indexToRemove, 1);
 return { ...s, prices: newPrices };
 }
 return s;
 }));
 };

 const [isDropdownOpen, setIsDropdownOpen] = useState(false);

 const activeCategoryName = categories.find(c => c.id === activeCategoryId)?.name || "未选择";

 return (
 <div className="space-y-8 pb-24">
 {/* 分类与服务列表 */}
 {categories.map((cat) => {
 const catServices = services.filter(s => s.categoryId === cat.id);
 const isActive = cat.id === activeCategoryId;
 
 
 return (
 <div key={cat.id} className={cn("space-y-3 p-4 rounded-xl border", isActive ? (isLight ? "bg-black/5 " : "bg-white/[0.02] ") : "border-transparent")}>
 <div className={cn("flex items-center justify-between border-b pb-2 group/header", isLight ? "border-black/10" : "border-white/10")}>
 {editingCategoryId === cat.id ? (
 <input
 type="text"
 value={categoryEditInput}
 onChange={(e) => setCategoryEditInput(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter') { e.preventDefault(); handleSaveCategoryEdit(cat.id); }
 else if (e.key === 'Escape') setEditingCategoryId(null);
 }}
 autoFocus
 onBlur={() => handleSaveCategoryEdit(cat.id)}
 className={cn("flex-1 border rounded text-xs tracking-widest px-2 py-1 outline-none mr-2", isLight ? "bg-white text-black" : "bg-black/60 text-white")}
 />
 ) : (
 <h3 
 className={cn("text-xs tracking-widest flex items-center gap-2 cursor-pointer", isLight ? "text-black" : "text-white")}
 onClick={() => {
 if (isActive) {
 handleStartCategoryEdit(cat);
 } else {
 setActiveCategoryId(cat.id);
 }
 }}
 title={isActive ? t('txt_a0cb83') : t('txt_78345c')}
 >
 {isActive && <span className="w-1.5 h-1.5 rounded-full " />}
 {cat.name}
 {catServices.length === 0 && (
 <button 
 onClick={(e) => { e.stopPropagation(); handleRemoveCategory(cat.id); }}
 className={cn(" ml-2", isLight ? "text-black " : "text-white ")}
 title={t('txt_1837b2')}
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 )}
 </h3>
 )}
 <span className={cn("text-[11px] ", isLight ? "text-black" : "text-white")}>{catServices.length} ITEMS</span>
 </div>

 <div className="space-y-2">
 {catServices.map((service) => (
 <div 
 key={service.id} 
 
 
 
 className={cn("flex flex-col gap-2 p-4 border rounded-xl group relative overflow-hidden", isLight ? "bg-black/5 border-black/5 " : "bg-black/40 border-white/5 ")}
 >
 <div className="flex items-center justify-between gap-3">
 {/* Name - 原地编辑 */}
 <div className="flex-1 min-w-0">
 {editingField?.id === service.id && editingField.field === 'name' ? (
 <input
 type="text"
 value={editValue}
 onChange={(e) => setEditValue(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter') { e.preventDefault(); handleSaveEditField(); }
 else if (e.key === 'Escape') setEditingField(null);
 }}
 autoFocus
 onBlur={handleSaveEditField}
 className={cn("w-full border rounded text-xs px-2 py-1 outline-none ", isLight ? "bg-white text-black" : "bg-black/60 text-white")}
 />
 ) : (
 <span 
 className={cn("text-xs flex items-center gap-2 cursor-pointer truncate", isLight ? "text-black " : "text-white ")}
 onClick={() => handleStartEditField(service, 'name')}
 title="点击修改名称"
 >
 {service.name}
 </span>
 )}
 </div>

 {/* 耗时 - 下拉选择 */}
 <div className="w-16 shrink-0 flex justify-center">
 <select
 value={service.duration || 60}
 onChange={(e) => handleDurationChange(service.id, parseInt(e.target.value, 10))}
 className={cn("bg-transparent text-[11px] outline-none cursor-pointer appearance-none text-center", isLight ? "text-black " : "text-white ")}
 >
 {Array.from({length: 16}, (_, i) => (i + 1) * 15).map(m => (
 <option key={m} value={m} className={cn(isLight ? "bg-white text-black" : "bg-black text-white")}>{m} min</option>
 ))}
 </select>
 </div>

 <div className="flex items-center gap-3 shrink-0">
 <div className="flex items-center flex-wrap justify-end gap-1.5">
 {/* 基准价 - 原地编辑 */}
 {editingField?.id === service.id && editingField.field === 'price' ? (
 <input
 type="text"
 value={editValue}
 onChange={(e) => setEditValue(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter') { e.preventDefault(); handleSaveEditField(); }
 else if (e.key === 'Escape') setEditingField(null);
 }}
 autoFocus
 onBlur={handleSaveEditField}
 className={cn("w-12 border rounded text-xs px-1 py-1 outline-none text-center", isLight ? "bg-white text-black" : "bg-black/60 text-white")}
 />
 ) : (
 <span 
 className={cn("text-xs cursor-pointer", isLight ? "text-black" : "text-white")}
 onClick={() => handleStartEditField(service, 'price')}
 title="点击修改价格"
 >
 ¥{service.prices && service.prices.length > 0 ? service.prices[0] : (service.price || 0)}
 </span>
 )}
 
 {/* 变体胶囊阵列 */}
 {service.prices && service.prices.length > 1 && (
 <div className="flex items-center gap-1 ml-1">
 {service.prices.slice(1).map((p: number, i: number) => (
 <div key={i} className="group/capsule relative">
 <span className={cn("text-[11px] px-1.5 py-0.5 rounded-full border", isLight ? "text-black bg-black/5 border-black/5" : "text-white bg-white/10 border-white/5")}>
 {p}
 </span>
 <button 
 onClick={() => handleRemoveVariant(service.id, i + 1)}
 className="absolute -top-1 -right-1 bg-red-500 rounded-full w-3 h-3 flex items-center justify-center "
 >
 <span className="text-[11px] text-white leading-none -mt-0.5">×</span>
 </button>
 </div>
 ))}
 </div>
 )}

 {/* 添加胶囊按钮/输入框 */}
 {addingVariantId === service.id ? (
 <input 
 type="text"
 value={variantInput}
 onChange={e => setVariantInput(e.target.value)}
 onKeyDown={e => {
 if (e.key === 'Enter') { e.preventDefault(); handleAddVariant(service.id); }
 else if (e.key === 'Escape') setAddingVariantId(null);
 }}
 onBlur={() => handleAddVariant(service.id)}
 autoFocus
 className={cn("w-10 text-[11px] border rounded px-1 py-0.5 outline-none", isLight ? "bg-white text-black" : "bg-black/60 text-white")}
 placeholder={t('txt_0e9fd9')}
 />
 ) : (
 <button 
 onClick={(e) => { e.stopPropagation(); setAddingVariantId(service.id); }}
 className={cn("text-[11px] px-1.5 py-0.5 rounded-full border border-dashed ml-1", isLight ? "text-black bg-black/5 border-black/20 " : "text-white bg-white/5 border-white/20 ")}
 >
 +
 </button>
 )}
 </div>
 
 {/* 垃圾桶 */}
 <button 
 onClick={(e) => { e.stopPropagation(); handleRemoveService(service.id); }} 
 className={cn(" z-20 ml-2", isLight ? "text-black " : "text-white ")}
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 <div className="flex items-center justify-between mt-1">
 <BufferedInput 
 placeholder={t('txt_48247a')}
 initialValue={service.fullName || ""}
 onSave={(val) => {
 onServicesChange(services.map(s => s.id === service.id ? { ...s, fullName: val } : s));
 }}
 className={cn("w-full bg-transparent border-b text-[11px] py-1 outline-none ", isLight ? "border-black/10 text-black placeholder:text-black" : "border-white/10 text-white placeholder:text-white")}
 />
 </div>
 </div>
 ))}
 </div>
 </div>
 );
 })}

 {/* 底部全局指挥舱 (Omni-Input Core) */}
 <div className="sticky bottom-0 left-0 w-full pt-4 pb-2 z-30">
 
 {/* 透明遮罩：用于点击外部关闭下拉菜单 */}
 {isDropdownOpen && (
 <div 
 className="fixed inset-0 z-40"
 onClick={() => setIsDropdownOpen(false)}
 />
 )}

 <div className={cn("relative group flex items-center border rounded-2xl p-1.5 z-50", isLight ? "bg-transparent border-black/10 " : "bg-transparent border-white/10 ")}>
 
 {/* 上下文 Badge (交互式 Dropdown) - 始终显示 */}
 <div className="relative">
 <div 
 className={cn("flex items-center gap-1.5 px-3 py-2 shrink-0 cursor-pointer group/badge rounded-xl", isDropdownOpen ? "" : (isLight ? "" : ""))}
 onClick={() => setIsDropdownOpen(!isDropdownOpen)}
 title={t('txt_236222')}
 >
 <span className={cn("text-[11px] uppercase tracking-wider max-w-[80px] truncate ", isLight ? "text-black" : "text-white")}>
 {isCreatingCategory ? "新建分类" : activeCategoryName}
 </span>
 <svg 
 className={cn("w-2.5 h-2.5 ", isLight ? "text-black" : "text-white")} 
 
 fill="none" viewBox="0 0 24 24" stroke="currentColor"
 >
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
 </svg>
 </div>

 {/* 下拉菜单面板 (取消对 isCreatingCategory 的封锁) */}
 {isDropdownOpen && (
 <div
 
 
 
 
 className={cn("absolute bottom-full left-0 mb-2 w-48 border rounded-xl overflow-hidden flex flex-col z-50", isLight ? "bg-white border-black/10 " : "bg-[#0f0f0f] border-white/10 ")}
 >
 <div className="max-h-40 overflow-y-auto no-scrollbar p-1.5 space-y-1">
 {categories.length === 0 && (
 <div className={cn("px-3 py-4 text-[11px] text-center", isLight ? "text-black" : "text-white")}>暂无分类</div>
 )}
 {categories.map(cat => (
 <div
 key={cat.id}
 className={cn("px-3 py-2 text-xs tracking-widest rounded-lg cursor-pointer flex items-center justify-center border", cat.id === activeCategoryId && !isCreatingCategory ? " " : (isLight ? "text-black border-black/5 " : "text-white border-white/5 "))}
 onClick={() => {
 setActiveCategoryId(cat.id);
 setIsCreatingCategory(false);
 setIsDropdownOpen(false);
 }}
 >
 <span className="tracking-widest">{cat.name}</span>
 </div>
 ))}
 </div>
 
 <div className={cn("border-t p-1.5", isLight ? "border-black/10 bg-black/5" : "border-white/10 bg-black/40")}>
 <div 
 className={cn("px-3 py-2 text-xs rounded-lg cursor-pointer flex items-center justify-center gap-1.5 border", isCreatingCategory ? " " : (isLight ? "text-black border-black/5 " : "text-white border-white/5 "))}
 onClick={() => {
 setIsCreatingCategory(true);
 setIsDropdownOpen(false);
 }}
 >
 <span className="text-lg leading-none -mt-0.5">+</span>
 <span className="tracking-widest">新建分类</span>
 </div>
 </div>
 </div>
 )}
 </div>

 <div className="flex-1 flex items-center bg-transparent relative h-full">
 {isCreatingCategory ? (
 <input
 type="text"
 value={newCatName}
 onChange={(e) => setNewCatName(e.target.value)}
 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); } }}
 placeholder="输入项目分类名称..."
 className={cn("w-full bg-transparent text-sm px-3 py-2 outline-none ", isLight ? "text-black placeholder:text-black" : "text-white placeholder:text-white")}
 autoFocus
 />
 ) : (
 <div className="flex items-center w-full h-full px-2 gap-2">
 <input
 ref={nameInputRef}
 type="text"
 value={newSvcName}
 onChange={(e) => setNewSvcName(e.target.value)}
 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); priceInputRef.current?.focus(); } }}
 placeholder="项目名称"
 className={cn("flex-1 min-w-[80px] bg-transparent text-sm py-2 outline-none ", isLight ? "text-black placeholder:text-black" : "text-white placeholder:text-white")}
 />
 <div className={cn("w-px h-4 shrink-0", isLight ? "bg-black/20" : "bg-white/20")} />
 <div className="flex items-center shrink-0 w-20 relative">
 <input
 ref={priceInputRef}
 type="number"
 value={newSvcPrice}
 onChange={(e) => setNewSvcPrice(e.target.value)}
 onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateService(); } }}
 placeholder="价格"
 className={cn("w-full bg-transparent text-sm py-2 outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none", isLight ? "text-black placeholder:text-black" : "text-white placeholder:text-white")}
 />
 </div>
 </div>
 )}
 </div>

 {/* 触屏发送键 */}
 <div className="flex items-center gap-1 pr-1 shrink-0">
 <button
 onClick={isCreatingCategory ? handleCreateCategory : handleCreateService}
 className="w-8 h-8 rounded-xl flex items-center justify-center text-black "
 >
 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
 </button>
 </div>
 </div>
 </div>
 </div>
 );
};
