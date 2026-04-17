"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, Users, Scissors, Clock, Plus, Trash2, User, ChevronLeft, Check, Shield, CreditCard, Calendar as CalendarIcon, Smartphone, Briefcase, Eye, Link as LinkIcon, MonitorPlay, TrendingUp, Crown } from "lucide-react";
import { cn } from "@/utils/cn";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { OperatingHour, ShopOperatingConfig, DEFAULT_OPERATING_CONFIG, DailyOverride } from "./IndustryCalendar";
import { TodayOverrideController } from "./TodayOverrideController";
import { useVisualSettings, CYBER_COLOR_DICTIONARY, CyberThemeColor } from "@/hooks/useVisualSettings";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/hooks/useAuth";
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
  businessName?: string;       // 新增：业务名称（用于全息雷达显示）
  businessAvatar?: string;     // 新增：业务头像（用于全息雷达显示）
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
  businessAvatar
}: NebulaConfigHubProps) => {
  const t = useTranslations('NebulaConfigHub');

  type MainTab = "staff" | "services" | "hours" | "visual";
  const [activeTab, setActiveTab] = useState<MainTab>("hours");
  
  const { user } = useAuth();
  
  const [localHours, setLocalHours] = useState<ShopOperatingConfig | OperatingHour[]>(operatingHours);
  const [localStaffs, setLocalStaffs] = useState<StaffItem[]>(staffs);
  const [localCategories, setLocalCategories] = useState<CategoryItem[]>(categories);
  const [localServices, setLocalServices] = useState<ServiceItem[]>(services);

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'saved' | 'error'>('idle');
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
  }, [localHours, localStaffs, localCategories, localServices, isOpen, isCloudDataLoaded]);

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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 - 已移除全屏黑色和毛玻璃，保持左侧清透 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0 }} // 极速响应
            onClick={onClose}
            className="fixed inset-0 bg-transparent z-[100]"
          />

          {/* 抽屉主体 - 赛博半透明黑玻璃材质 */}
          <motion.div
            key="config-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0 }} // 极速响应，移除弹簧动画
            className="fixed inset-0 md:inset-y-0 md:left-auto md:right-0 md:w-[480px] bg-black/70 backdrop-blur-2xl md:border-l border-white/10 z-[101] flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.3)]"
          >
            {/* 头部 */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
              {/* 左侧：标题与图标 */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gx-cyan/10 flex items-center justify-center border border-gx-cyan/30 relative">
                  <Settings className="w-4 h-4 text-gx-cyan animate-spin-slow" />
                  {/* Presence 脉冲动画 */}
                  <div className="absolute inset-0 rounded-full border border-gx-cyan/50 animate-ping" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                    {t('txt_406bc4')}
                  </h2>
                  <p className="text-[10px] font-mono text-white/40 uppercase mt-1 flex items-center gap-2">
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
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border border-black z-10 overflow-hidden bg-white/10 transition-transform hover:scale-110"
                      style={{ 
                        backgroundColor: editor.avatar ? 'transparent' : (editor.color || '#00f0ff'), 
                        color: '#000', 
                        boxShadow: `0 0 12px ${editor.color || '#00f0ff'}80` 
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
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-md border border-white/10 text-white text-[10px] px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col gap-1 z-50">
                      {/* 小三角形指示器 */}
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/90 border-l border-t border-white/10 rotate-45" />
                      {Object.values(activeEditors).map((editor, i) => (
                        <div key={i} className="flex items-center justify-center gap-2 relative z-10">
                          <div className="w-1.5 h-1.5 rounded-full bg-gx-cyan animate-pulse" />
                          <span className="text-white/70 font-medium tracking-widest">{editor.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {Object.keys(activeEditors).length > 1 && (
                    <span className="text-[9px] font-mono text-gx-cyan/80 ml-4 font-bold tracking-widest absolute -bottom-4 right-0">
                      {Object.keys(activeEditors).length} SYNCED
                    </span>
                  )}
                </div>
                <div className="w-px h-6 bg-white/10 ml-2" />
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 导航 Tabs */}
            <div className="flex p-4 gap-2 border-b border-white/5 shrink-0 overflow-x-auto no-scrollbar">
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
                    "min-w-[80px] flex-1 py-3 px-2 rounded-xl flex flex-col items-center gap-2 transition-all",
                    activeTab === tab.id
                      ? "bg-white/10 text-white border border-white/10 shadow-inner"
                      : "text-white/40 hover:text-white/80 hover:bg-white/5"
                  )}
                >
                  <tab.icon className={cn("w-4 h-4", activeTab === tab.id && "text-gx-cyan")} />
                  <span className="text-[10px] font-black tracking-widest">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto p-6 no-scrollbar relative pb-32">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
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
                    />
                  )}
                  {activeTab === "services" && (
                    <ServicesConfig 
                      categories={localCategories}
                      services={localServices}
                      onCategoriesChange={handleCategoriesChange}
                      onServicesChange={handleServicesChange}
                    />
                  )}
                  {activeTab === "visual" && (
                    <VisualSettingsConfig />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* 底部 Contextual 操作栏 */}
            <div className="absolute bottom-0 left-0 w-full p-6 border-t border-white/5 bg-black/80 backdrop-blur-xl z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
              {editingContext.type ? (
                <div className="flex gap-4">
                  <button
                    onClick={handleContextualCancel}
                    className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all text-xs"
                  >
                    {t('txt_625fb2')}</button>
                  <button
                    onClick={handleContextualSave}
                    className="flex-[2] py-4 rounded-2xl bg-gx-cyan text-black font-black uppercase tracking-widest hover:shadow-[0_0_30px_rgba(0,240,255,0.3)] transition-all text-xs"
                  >
                    {editingContext.type === 'staff' ? t('txt_dc8d03') : t('txt_49e56c')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center py-4 w-full text-xs font-mono font-black tracking-widest border border-white/5 rounded-2xl bg-white/[0.02]">
                  {syncStatus === 'syncing' && <span className="text-gx-cyan animate-pulse">☁ SYNCING MATRIX...</span>}
                  {syncStatus === 'saved' && <span className="text-green-400">✓ ALL CHANGES SECURED</span>}
                  {syncStatus === 'error' && <span className="text-red-500">⚠ SYNC FAILED</span>}
                  {syncStatus === 'idle' && <span className="text-white/30">LIVE EDIT ACTIVE</span>}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// --- 子面板组件 ---

const VisualSettingsConfig = () => {
  const t = useTranslations('NebulaConfigHub');

  const { settings, updateSettings, isLoaded } = useVisualSettings();

  if (!isLoaded) return null;

  return (
    <div className="space-y-6">
      {/* 图层开关区 */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-white/60">{t('txt_acbc2d')}</h3>
        
        {/* 星空开关 */}
        <div 
          className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl cursor-pointer hover:bg-white/[0.05] transition-colors"
          onClick={() => updateSettings({ showNebula: !settings.showNebula })}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-white block">{t('txt_ea97c1')}</span>
            <span className="text-[10px] text-white/40 font-mono">{t('txt_203d7a')}</span>
          </div>
          <div className={cn("w-10 h-6 rounded-full border flex items-center p-0.5 transition-colors", settings.showNebula ? "bg-gx-cyan/30 border-gx-cyan/50 justify-end" : "bg-white/5 border-white/10 justify-start")}>
            <motion.div layout className={cn("w-4 h-4 rounded-full shadow-sm", settings.showNebula ? "bg-gx-cyan" : "bg-white/40")} />
          </div>
        </div>

        {/* 壁纸开关 */}
        <div 
          className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl cursor-pointer hover:bg-white/[0.05] transition-colors"
          onClick={() => updateSettings({ showWallpaper: !settings.showWallpaper })}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-white block">{t('txt_162afa')}</span>
            <span className="text-[10px] text-white/40 font-mono">{t('txt_5e50ed')}</span>
          </div>
          <div className={cn("w-10 h-6 rounded-full border flex items-center p-0.5 transition-colors", settings.showWallpaper ? "bg-gx-cyan/30 border-gx-cyan/50 justify-end" : "bg-white/5 border-white/10 justify-start")}>
            <motion.div layout className={cn("w-4 h-4 rounded-full shadow-sm", settings.showWallpaper ? "bg-gx-cyan" : "bg-white/40")} />
          </div>
        </div>

        {/* 壁纸浓度滑块 (仅在壁纸开启时显示) */}
        <AnimatePresence>
          {settings.showWallpaper && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-6 p-4 bg-white/[0.01] rounded-xl border border-white/5 overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('txt_wallpaper_opacity') || '壁纸层浓度'}</label>
                  <span className="text-xs font-mono text-gx-cyan">{settings.wallpaperOpacity}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" step="5"
                  value={settings.wallpaperOpacity}
                  onChange={(e) => updateSettings({ wallpaperOpacity: parseInt(e.target.value) })}
                  className="w-full accent-gx-cyan h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 赛博全息主题色控制区 */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <h3 className="text-xs font-black uppercase tracking-widest text-white/60">{t('txt_aaa577')}</h3>
        
        {/* 顶部大标题颜色 */}
        <div className="space-y-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-white/80 uppercase tracking-widest">{t('txt_c94255')}</label>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10", CYBER_COLOR_DICTIONARY[settings.headerTitleColorTheme].className)}>
              {CYBER_COLOR_DICTIONARY[settings.headerTitleColorTheme].label}
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-visible no-scrollbar py-3 px-2">
            {(Object.entries(CYBER_COLOR_DICTIONARY) as [CyberThemeColor, { className: string; hex: string; label: string }][]).map(([key, config]) => (
              <button
                key={`header-${key}`}
                onClick={() => updateSettings({ headerTitleColorTheme: key })}
                className={cn(
                  "w-8 h-8 rounded-full shrink-0 transition-all border-2 flex items-center justify-center",
                  settings.headerTitleColorTheme === key 
                    ? "border-white scale-110 shadow-[0_0_15px_currentColor]" 
                    : "border-transparent hover:scale-105 opacity-50 hover:opacity-100"
                )}
                style={{ color: config.hex, backgroundColor: `${config.hex}33` }}
              >
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: config.hex }} />
              </button>
            ))}
          </div>
        </div>

        {/* 员工表头颜色 */}
        <div className="space-y-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-white/80 uppercase tracking-widest">{t('txt_f4fb3b')}</label>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10", CYBER_COLOR_DICTIONARY[settings.staffNameColorTheme].className)}>
              {CYBER_COLOR_DICTIONARY[settings.staffNameColorTheme].label}
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-visible no-scrollbar py-3 px-2">
            {(Object.entries(CYBER_COLOR_DICTIONARY) as [CyberThemeColor, { className: string; hex: string; label: string }][]).map(([key, config]) => (
              <button
                key={`staff-${key}`}
                onClick={() => updateSettings({ staffNameColorTheme: key })}
                className={cn(
                  "w-8 h-8 rounded-full shrink-0 transition-all border-2 flex items-center justify-center",
                  settings.staffNameColorTheme === key 
                    ? "border-white scale-110 shadow-[0_0_15px_currentColor]" 
                    : "border-transparent hover:scale-105 opacity-50 hover:opacity-100"
                )}
                style={{ color: config.hex, backgroundColor: `${config.hex}33` }}
              >
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: config.hex }} />
              </button>
            ))}
          </div>
        </div>

        {/* 时间轴颜色 */}
        <div className="space-y-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-white/80 uppercase tracking-widest">{t('txt_893c8f')}</label>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10", CYBER_COLOR_DICTIONARY[settings.timelineColorTheme].className)}>
              {CYBER_COLOR_DICTIONARY[settings.timelineColorTheme].label}
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-visible no-scrollbar py-3 px-2">
            {(Object.entries(CYBER_COLOR_DICTIONARY) as [CyberThemeColor, { className: string; hex: string; label: string }][]).map(([key, config]) => (
              <button
                key={`timeline-${key}`}
                onClick={() => updateSettings({ timelineColorTheme: key })}
                className={cn(
                  "w-8 h-8 rounded-full shrink-0 transition-all border-2 flex items-center justify-center",
                  settings.timelineColorTheme === key 
                    ? "border-white scale-110 shadow-[0_0_15px_currentColor]" 
                    : "border-transparent hover:scale-105 opacity-50 hover:opacity-100"
                )}
                style={{ color: config.hex, backgroundColor: `${config.hex}33` }}
              >
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: config.hex }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const HoursConfig = ({ hours, onChange }: { hours: ShopOperatingConfig | OperatingHour[], onChange: (h: ShopOperatingConfig | OperatingHour[]) => void }) => {
  const idSeed = useRef(0);
  
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
    <div className="space-y-2 w-full mt-2">
      <AnimatePresence>
        {hoursList.map((hour) => (
          <motion.div 
            key={hour.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 p-2 md:p-3 bg-white/5 rounded-xl border border-white/10 group overflow-hidden"
          >
            <div className="flex-1 grid grid-cols-2 gap-2 md:gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-mono text-white/40 uppercase">Start</span>
                <select 
                  value={hour.start} 
                  onChange={(e) => onUpdate(hour.id, 'start', e.target.value)}
                  className="bg-transparent text-white text-xs md:text-sm font-mono outline-none border-b border-white/10 pb-1 cursor-pointer appearance-none" 
                >
                  {HOUR_OPTIONS.map(h => (
                    <option key={`start-${h}`} value={h} className="bg-black text-white">
                      {h.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-mono text-white/40 uppercase">End</span>
                <select 
                  value={hour.end}
                  onChange={(e) => onUpdate(hour.id, 'end', e.target.value)}
                  className="bg-transparent text-white text-xs md:text-sm font-mono outline-none border-b border-white/10 pb-1 cursor-pointer appearance-none" 
                >
                  {HOUR_OPTIONS.map(h => (
                    <option key={`end-${h}`} value={h} className="bg-black text-white">
                      {h.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button onClick={() => onRemove(hour.id)} className="text-white/20 hover:text-red-500 transition-colors p-1">
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
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
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-white">常规营业时间段 (Regular Hours)</span>
        </div>
        <p className="text-[10px] font-mono text-white/40">
          按照星期一到星期日设置基础营业时间。如果一天内有午休，请添加多个时间段。
        </p>
        
        <div className="space-y-2">
          {daysOfWeek.map(({ key, label }) => {
            const dayHours = fullConfig.regular?.[key] || [];
            const isClosed = dayHours.length === 0;

            return (
              <div key={key} className="flex flex-col p-3 bg-black/40 border border-white/5 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 text-xs font-black text-white/80">{label}</div>
                    <button 
                      onClick={() => handleToggleClosedRegular(key, !isClosed)}
                      className={cn("px-2 py-1 text-[9px] font-bold tracking-widest rounded-md transition-colors border", 
                        isClosed ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-gx-cyan/10 text-gx-cyan border-gx-cyan/30"
                      )}
                    >
                      {isClosed ? '休息 CLOSED' : '营业 OPEN'}
                    </button>
                  </div>
                  {!isClosed && (
                    <button onClick={() => handleAddRegular(key)} className="text-[10px] font-bold text-gx-cyan flex items-center gap-1 hover:text-white transition-colors">
                      <Plus className="w-3 h-3" /> 添加时段
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
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-white">特殊日期与节假日 (Special Dates Override)</span>
        </div>
        <p className="text-[10px] font-mono text-white/40">
          设置未来的店庆、节假日等例外时间。在日历渲染时，特殊日期的配置将强制覆盖常规星期的规律。
        </p>

        {/* 添加特殊日期器 */}
        <div className="flex gap-2 items-center">
          <input 
            type="date" 
            value={newSpecialDate}
            onChange={(e) => setNewSpecialDate(e.target.value)}
            className="flex-1 bg-black border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none focus:border-gx-cyan/50"
          />
          <button 
            onClick={handleAddSpecialDate}
            disabled={!newSpecialDate}
            className="px-4 py-2 bg-gx-cyan/20 text-gx-cyan text-xs font-bold rounded-lg border border-gx-cyan/30 disabled:opacity-30"
          >
            添加日期
          </button>
        </div>

        {/* 渲染已有的特殊日期列表 */}
        <div className="space-y-2 mt-4">
          <AnimatePresence>
            {Object.entries(fullConfig.specialDates || {}).sort(([a], [b]) => a.localeCompare(b)).map(([dateStr, specialConfig]) => (
              <motion.div 
                key={dateStr}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex flex-col p-3 bg-gx-cyan/5 border border-gx-cyan/20 rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-mono font-bold text-white tracking-widest">{dateStr}</div>
                    <button 
                      onClick={() => handleToggleClosedSpecial(dateStr, !specialConfig.isClosed)}
                      className={cn("px-2 py-1 text-[9px] font-bold tracking-widest rounded-md transition-colors border", 
                        specialConfig.isClosed ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-gx-cyan/10 text-gx-cyan border-gx-cyan/30"
                      )}
                    >
                      {specialConfig.isClosed ? '休息 CLOSED' : '营业 OPEN'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {!specialConfig.isClosed && (
                      <button onClick={() => handleAddSpecialHour(dateStr)} className="text-[10px] font-bold text-gx-cyan flex items-center gap-1 hover:text-white transition-colors">
                        <Plus className="w-3 h-3" /> 时段
                      </button>
                    )}
                    <button onClick={() => handleRemoveSpecialDate(dateStr)} className="text-white/20 hover:text-red-500 transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {!specialConfig.isClosed && renderTimeBlocks(
                  specialConfig.hours,
                  (id, field, val) => handleUpdateSpecialHour(dateStr, id, field, val),
                  (id) => handleRemoveSpecialHour(dateStr, id)
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

import { useTranslations } from "next-intl";

const StaffConfig = ({ staffs, onChange, onEditingStateChange, services }: { staffs: StaffItem[], onChange: (s: StaffItem[]) => void, onEditingStateChange: (saveAction: (() => void) | null, cancelAction: (() => void) | null) => void, services: ServiceItem[] }) => {
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
      />
    );
  }

  return (
    <div className="space-y-4">
      <button 
        onClick={() => setEditingStaff({ id: "", name: "", role: "", status: "active", calendarView: "self", nebulaAccess: false, operationRights: "view", financialVisibility: "self", services: [] })}
        className="w-full py-3 rounded-xl border border-dashed border-white/20 text-white/60 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-[11px] font-black tracking-widest"
      >
        <Plus className="w-4 h-4" /> {t('txt_3fb42e')}</button>
      
      {staffs.map((staff) => (
        <div key={staff.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] transition-colors group cursor-pointer" onClick={() => setEditingStaff(staff)}>
          <div className="flex items-center gap-4">
            {/* 头像背景微光 (Scheme C) */}
            <div 
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center relative overflow-hidden shadow-inner transition-all",
                staff.status === "resigned" ? "grayscale opacity-50" : ""
              )}
              style={{ backgroundColor: `${staff.color || '#666'}20`, border: `1px solid ${staff.color || '#666'}40` }}
            >
              <User className="w-5 h-5" style={{ color: staff.color || '#666' }} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className={cn("text-xs font-black", staff.status === "resigned" ? "text-white/40 line-through" : "text-white")}>{staff.name}</span>
                {staff.status === "on_leave" && <span className="px-1.5 py-0.5 rounded text-[8px] bg-yellow-500/20 text-yellow-500 font-bold border border-yellow-500/30">{t('txt_62a8cf')}</span>}
                {staff.status === "resigned" && <span className="px-1.5 py-0.5 rounded text-[8px] bg-red-500/20 text-red-500 font-bold border border-red-500/30">{t('txt_583e79')}</span>}
              </div>
              <span className="text-[10px] font-mono text-white/40 mt-0.5 flex items-center gap-1">
                {staff.role} 
                {staff.frontendId && <LinkIcon className="w-2.5 h-2.5 text-gx-cyan" />}
              </span>
            </div>
          </div>
          <button className="text-[10px] font-bold text-white/40 group-hover:text-white underline underline-offset-4 transition-colors">{t('txt_224e2c')}</button>
        </div>
      ))}
    </div>
  );
};

const StaffForm = ({ staff, onBack, onSave, registerActions, availableServices = [] }: { staff: StaffItem, onBack: () => void, onSave: (data: StaffItem) => void, registerActions: (save: () => void, cancel: () => void) => void, availableServices?: ServiceItem[] }) => {
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
    daysOff: staff.daysOff ?? 4,     // 新增：休假天数初始值，默认4
    commissionRate: staff.commissionRate || 0,
    calendarView: staff.calendarView || "self",
    nebulaAccess: staff.nebulaAccess || false,
    operationRights: staff.operationRights || "view",
    financialVisibility: staff.financialVisibility || "self",
    services: staff.services || []
  });
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);

  const registerBack = useHardwareBack(state => state.register);
  const unregisterBack = useHardwareBack(state => state.unregister);

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
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <button onClick={onBack} className="flex items-center gap-1 text-[10px] font-bold text-white/40 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" /> {t('txt_adcd1d')}</button>
        <span className="text-xs font-black text-white">{staff.id ? t('txt_d03a9c') : t('txt_3fb42e')}</span>
      </div>

      {/* Internal Tabs */}
      <div className="flex p-1 bg-white/5 rounded-lg border border-white/10">
        {[
          { id: "basic", label: t('txt_754801'), icon: User },
          { id: "finance", label: t('txt_03b5ea'), icon: CreditCard },
          { id: "access", label: t('txt_d930d1'), icon: Shield },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as StaffTab)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[10px] font-bold transition-all",
              activeTab === tab.id ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/80"
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
            <div className="flex items-start gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-inner shrink-0"
                style={{ backgroundColor: `${formData.color}20`, border: `1px solid ${formData.color}40` }}
              >
                {formData.frontendId ? (
                  <Image
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.frontendId}`}
                    alt="avatar"
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <User className="w-8 h-8" style={{ color: formData.color }} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end justify-center pb-1">
                  <span className="text-[8px] font-mono text-white/80 uppercase">{formData.frontendId ? 'Linked' : 'Default'}</span>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('txt_a140c4')}</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-transparent border-b border-white/10 text-white text-sm pb-1 focus:outline-none focus:border-gx-cyan transition-colors" placeholder={t('txt_a6a423')} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('txt_60f114')}</label>
                  <input type="text" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-transparent border-b border-white/10 text-white text-sm pb-1 focus:outline-none focus:border-gx-cyan transition-colors" placeholder={t('txt_480054')} />
                </div>
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('txt_d9f234')}</label>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: formData.color }} />
                  <span className="text-[10px] font-mono text-white/60">{formData.color}</span>
                </div>
              </div>
              <div className="grid grid-cols-8 gap-2 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                {colors.map(color => (
                  <button 
                    key={color} 
                    onClick={() => setFormData({...formData, color})}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all mx-auto",
                      formData.color === color ? "border-white scale-125 shadow-[0_0_12px_currentColor] z-10 relative" : "border-transparent hover:scale-110 opacity-70 hover:opacity-100"
                    )}
                    style={{ backgroundColor: color, color: color }}
                  />
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('txt_70240b')}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "active", label: t('txt_238a27'), color: "text-green-400 border-green-400/20 bg-green-400/10" },
                  { id: "on_leave", label: t('txt_538024'), color: "text-yellow-400 border-yellow-400/20 bg-yellow-400/10" },
                  { id: "resigned", label: t('txt_151a99'), color: "text-red-400 border-red-400/20 bg-red-400/10" },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setFormData({...formData, status: s.id})}
                    className={cn(
                      "py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1",
                      formData.status === s.id ? s.color : "border-white/5 text-white/40 hover:bg-white/5"
                    )}
                  >
                    {formData.status === s.id && <Check className="w-3 h-3" />}
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* System Linking */}
            <div className="space-y-4 p-4 rounded-xl border border-gx-cyan/20 bg-gx-cyan/5">
              <div className="flex items-center gap-2 text-gx-cyan">
                <LinkIcon className="w-4 h-4" />
                <span className="text-xs font-black uppercase">{t('txt_dab60d')}</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('txt_ab459e')}</label>
                  <input type="text" value={formData.frontendId} onChange={e => setFormData({...formData, frontendId: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-md text-white text-xs p-2 focus:outline-none focus:border-gx-cyan transition-colors font-mono placeholder:text-white/20" placeholder={t('txt_80c5c7')} />
                  <p className="text-[8px] text-white/30 font-mono mt-1">{t('txt_1e10a4')}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('txt_f6da71')}</label>
                  <div className="relative">
                    <Smartphone className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" />
                    <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-md text-white text-xs py-2 pl-7 pr-2 focus:outline-none focus:border-gx-cyan transition-colors font-mono placeholder:text-white/20" placeholder={t('txt_5c0b15')} />
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
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1"><CreditCard className="w-3 h-3"/> 薪酬模型 (SALARY MODEL)</label>
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
                      className={cn("p-3 rounded-xl border cursor-pointer transition-all", isSelected ? "bg-gx-cyan/10 border-gx-cyan/30" : "bg-white/[0.02] border-white/5 hover:border-white/20")}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn("text-xs font-bold", isSelected ? "text-gx-cyan" : "text-white")}>{opt.label}</span>
                        {isSelected && <Check className="w-3 h-3 text-gx-cyan" />}
                      </div>
                      <span className="text-[9px] text-white/40 leading-tight block">{opt.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 动态显示的输入框阵列 */}
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-4">
              
              {/* 仅在【纯底薪制】或【有底薪】时显示 */}
              {((formData.guarantee || 0) === 0 && (formData.commissionRate || 0) === 0) && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">基础底薪 / BASE SALARY (€)</label>
                  <input 
                    type="number" 
                    min="0"
                    value={formData.baseSalary === 0 ? '' : formData.baseSalary} 
                    onChange={e => {
                      const val = e.target.value;
                      setFormData({...formData, baseSalary: val === '' ? 0 : Math.max(0, Number(val))})
                    }} 
                    className="w-full bg-transparent border-b border-white/10 text-white text-lg font-mono pb-1 focus:outline-none focus:border-gx-cyan transition-colors" 
                    placeholder="0" 
                  />
                </div>
              )}
              
              {/* 仅在【保底提成制】显示 */}
              {((formData.guarantee || 0) > 0 || ((formData.baseSalary || 0) === 0 && (formData.commissionRate || 0) > 0 && (formData.guarantee || 0) > 0) || ((formData.guarantee || 0) !== 0)) && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest text-gx-cyan/80">业绩保底 / GUARANTEE TARGET (€)</label>
                  <input 
                    type="number" 
                    min="0"
                    value={formData.guarantee === 0 ? '' : formData.guarantee} 
                    onChange={e => {
                      const val = e.target.value;
                      setFormData({...formData, guarantee: val === '' ? 0 : Math.max(0, Number(val))})
                    }} 
                    className="w-full bg-transparent border-b border-gx-cyan/30 text-gx-cyan text-lg font-mono pb-1 focus:outline-none focus:border-gx-cyan transition-colors" 
                    placeholder="如：3200" 
                  />
                </div>
              )}

              {/* 仅在【保底提成制】和【纯提成制】显示 */}
              {((formData.commissionRate || 0) > 0 || (formData.guarantee || 0) > 0) && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center justify-between">
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
                      className="w-full bg-transparent border-b border-white/10 text-white text-lg font-mono pb-1 focus:outline-none focus:border-gx-cyan transition-colors pr-8" 
                      placeholder="0" 
                    />
                    <span className="absolute right-0 bottom-2 text-white/40 font-mono">%</span>
                  </div>
                </div>
              )}

              {/* 始终显示：每月休假天数 (用于推算日目标) */}
              <div className="space-y-1 pt-2 border-t border-white/5 animate-in fade-in">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">每月休假 / MONTHLY DAYS OFF</label>
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
                    className="w-full bg-transparent border-b border-white/10 text-white text-lg font-mono pb-1 focus:outline-none focus:border-gx-cyan transition-colors pr-12" 
                    placeholder="0" 
                  />
                  <span className="absolute right-0 bottom-2 text-white/40 font-mono">天/月</span>
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
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/20 blur-2xl rounded-full"></div>
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500 shrink-0 relative z-10">
                      <Crown className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 relative z-10">
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        [ 老板模式 ] 顶级权限激活
                      </h4>
                      <p className="text-[10px] text-white/60 leading-relaxed font-mono">
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
                <div className="p-4 rounded-xl bg-gradient-to-br from-gx-cyan/10 to-transparent border border-gx-cyan/20 flex gap-3 items-start relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-gx-cyan/20 blur-2xl rounded-full"></div>
                  <div className="p-2 rounded-lg bg-gx-cyan/20 text-gx-cyan shrink-0 relative z-10">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 relative z-10">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      AI 动态目标推演 
                      {g > 0 && r > 0 && <span className="text-gx-cyan font-mono tracking-wider">€ {monthTarget} / 月</span>}
                    </h4>
                    <p className="text-[10px] text-white/60 leading-relaxed font-mono">
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
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1"><CalendarIcon className="w-3 h-3"/> {t('txt_461577')}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "self", label: t('txt_c71868'), desc: t('txt_cd5e70') },
                  { id: "all", label: t('txt_0467cc'), desc: t('txt_319cc2') }
                ].map(opt => (
                  <div key={opt.id} onClick={() => setFormData({...formData, calendarView: opt.id})} className={cn("p-3 rounded-xl border cursor-pointer transition-all", formData.calendarView === opt.id ? "bg-gx-cyan/10 border-gx-cyan/30" : "bg-white/[0.02] border-white/5 hover:border-white/20")}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("text-xs font-bold", formData.calendarView === opt.id ? "text-gx-cyan" : "text-white")}>{opt.label}</span>
                      {formData.calendarView === opt.id && <Check className="w-3 h-3 text-gx-cyan" />}
                    </div>
                    <span className="text-[9px] text-white/40">{opt.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Operation Rights */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1"><Shield className="w-3 h-3"/> {t('txt_773712')}</label>
              <select value={formData.operationRights} onChange={e => setFormData({...formData, operationRights: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg text-white text-xs p-3 focus:outline-none focus:border-gx-cyan transition-colors appearance-none cursor-pointer">
                <option value="view">{t('txt_7781d9')}</option>
                <option value="edit">{t('txt_2878a0')}</option>
                <option value="edit_price">{t('txt_823d26')}</option>
              </select>
            </div>

            {/* Financial Visibility */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1"><Eye className="w-3 h-3"/> {t('txt_db3e82')}</label>
              <select value={formData.financialVisibility} onChange={e => setFormData({...formData, financialVisibility: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg text-white text-xs p-3 focus:outline-none focus:border-gx-cyan transition-colors appearance-none cursor-pointer">
                <option value="self">{t('txt_2091de')}</option>
                <option value="store">{t('txt_395559')}</option>
              </select>
            </div>

            {/* Nebula Access */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-gx-purple/20 bg-gx-purple/5 cursor-pointer" onClick={() => setFormData({...formData, nebulaAccess: !formData.nebulaAccess})}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{t('txt_c4b9ca')}</span>
                  <span className="px-1.5 py-0.5 rounded text-[8px] bg-gx-purple/20 text-gx-purple border border-gx-purple/30 font-mono uppercase">Nebula</span>
                </div>
                <p className="text-[9px] text-white/40">{t('txt_45b088')}</p>
              </div>
              <div className={cn("w-10 h-6 rounded-full border flex items-center p-0.5 transition-colors", formData.nebulaAccess ? "bg-gx-purple/30 border-gx-purple/50 justify-end" : "bg-white/5 border-white/10 justify-start")}>
                <motion.div layout className={cn("w-4 h-4 rounded-full shadow-sm", formData.nebulaAccess ? "bg-gx-purple" : "bg-white/40")} />
              </div>
            </div>

            {/* Assigned Services (Capabilities Workflow) */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center justify-between">
                <span className="flex items-center gap-1"><Briefcase className="w-3 h-3"/> {t('txt_149023')}</span>
                <span className="text-gx-cyan cursor-pointer hover:text-white transition-colors" onClick={() => setIsServicesModalOpen(true)}>{t('txt_8347a9')}</span>
              </label>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 min-h-[60px] flex flex-wrap gap-2">
                {formData.services.length > 0 ? (
                  formData.services.map((svcId: string) => {
                    const svc = availableServices.find(s => s.id === svcId);
                    if (!svc) return null;
                    return (
                      <div key={svcId} className="px-2 py-1 rounded bg-white/10 border border-white/10 text-[10px] text-white flex items-center gap-1">
                        {svc.name}
                        <button className="text-white/40 hover:text-white" onClick={() => setFormData({...formData, services: formData.services.filter((id: string) => id !== svcId)})}>
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-xs text-white/20 my-auto">{t('txt_fe642f')}</span>
                )}
              </div>
              <p className="text-[9px] text-gx-cyan/60">{t('txt_c7f632')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Services Modal Mock */}
      <AnimatePresence>
        {isServicesModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
              <h3 className="text-sm font-black text-white">{t('txt_070091')}</h3>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar">
                {availableServices.map(svc => (
                  <div key={svc.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10" onClick={() => {
                    const newServices = formData.services.includes(svc.id) ? formData.services.filter((id: string) => id !== svc.id) : [...formData.services, svc.id];
                    setFormData({...formData, services: newServices});
                  }}>
                    <div className={cn("w-4 h-4 rounded border flex items-center justify-center", formData.services.includes(svc.id) ? "bg-gx-cyan border-gx-cyan text-black" : "border-white/20")}>
                      {formData.services.includes(svc.id) && <Check className="w-3 h-3" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-white font-bold">{svc.name}</span>
                      <span className="text-[10px] text-white/40 font-mono">¥{svc.price} · {svc.duration}min</span>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setIsServicesModalOpen(false)} className="w-full py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors">
                {t('txt_3fdf2d')}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ServicesConfig = ({ 
  categories, 
  services, 
  onCategoriesChange, 
  onServicesChange 
}: { 
  categories: CategoryItem[], 
  services: ServiceItem[], 
  onCategoriesChange: (c: CategoryItem[]) => void, 
  onServicesChange: (s: ServiceItem[]) => void 
}) => {
    const t = useTranslations('NebulaConfigHub');
  const [globalInput, setGlobalInput] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(categories.length > 0 ? categories[0].id : null);
  
  const categoryIdSeed = useRef(0);
  const serviceIdSeed = useRef(0);

  // Synchronize activeCategoryId if categories change and active is gone, or if initially null and categories added
  useEffect(() => {
    if (!activeCategoryId && categories.length > 0) {
      setActiveCategoryId(categories[0].id);
    } else if (activeCategoryId && !categories.find(c => c.id === activeCategoryId)) {
      setActiveCategoryId(categories.length > 0 ? categories[0].id : null);
    }
  }, [categories, activeCategoryId]);

  const handleGlobalNLPInput = () => {
    if (!globalInput.trim()) return;
    const value = globalInput.trim();

    // 1. 如果以 # 开头，则切换或创建分类 (上下文锁定)
    if (value.startsWith('#')) {
      const targetName = value.substring(1).trim();
      if (!targetName) return;

      const existingCat = categories.find(c => c.name === targetName);
      if (existingCat) {
        setActiveCategoryId(existingCat.id);
      } else {
        categoryIdSeed.current += 1;
        const newCatId = `cat_${Date.now()}_${categoryIdSeed.current}`;
        onCategoriesChange([...categories, { id: newCatId, name: targetName }]);
        setActiveCategoryId(newCatId);
      }
      setGlobalInput("");
      return;
    }

    // 2. 正常解析：名称 基准价 耗时 (如：Ms 35 45)
    let targetCatId = activeCategoryId;
    
    // 如果没有激活的分类（兜底：创建"未分类"）
    if (!targetCatId) {
      const uncatName = "未分类";
      let uncat = categories.find(c => c.name === uncatName);
      if (!uncat) {
        categoryIdSeed.current += 1;
        const newCatId = `cat_${Date.now()}_${categoryIdSeed.current}`;
        uncat = { id: newCatId, name: uncatName };
        onCategoriesChange([...categories, uncat]);
      }
      targetCatId = uncat.id;
      setActiveCategoryId(targetCatId);
    }

    const parts = value.split(/\s+/);
    let name = value;
    let basePrice = 0;
    let duration = 60; // 默认 60 分钟

    if (parts.length >= 3) {
      const last = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(last)) duration = last;
      
      const priceStr = parts[parts.length - 2];
      const parsedPrice = parseInt(priceStr, 10);
      if (!isNaN(parsedPrice)) basePrice = parsedPrice;
      
      name = parts.slice(0, parts.length - 2).join(" ");
    } else if (parts.length === 2) {
      const parsedPrice = parseInt(parts[1], 10);
      if (!isNaN(parsedPrice)) basePrice = parsedPrice;
      name = parts[0];
    }

    const newItem = {
      id: `svc_${Date.now()}_${++serviceIdSeed.current}`,
      categoryId: targetCatId,
      name,
      prices: [basePrice], // 仅存基准价，后续通过胶囊添加变体
      duration
    };

    onServicesChange([...services, newItem]);
    setGlobalInput(""); // 极速连录
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleGlobalNLPInput();
    }
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

  // --- 行内编辑逻辑 ---
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState("");

  const handleStartEdit = (service: ServiceItem) => {
    setEditingServiceId(service.id);
    const basePrice = service.prices && service.prices.length > 0 ? service.prices[0] : (service.price || 0);
    setEditInput(`${service.name} ${basePrice} ${service.duration}`);
  };

  const handleSaveEdit = (serviceId: string) => {
    if (!editInput.trim()) {
      setEditingServiceId(null);
      return;
    }
    const parts = editInput.trim().split(/\s+/);
    let name = editInput;
    let basePrice = 0;
    let duration = 60;

    if (parts.length >= 3) {
      const last = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(last)) duration = last;
      const parsedPrice = parseInt(parts[parts.length - 2], 10);
      if (!isNaN(parsedPrice)) basePrice = parsedPrice;
      name = parts.slice(0, parts.length - 2).join(" ");
    } else if (parts.length === 2) {
      const parsedPrice = parseInt(parts[1], 10);
      if (!isNaN(parsedPrice)) basePrice = parsedPrice;
      name = parts[0];
    } else {
      name = editInput;
      const existing = services.find(s => s.id === serviceId);
      if (existing) {
        basePrice = existing.prices && existing.prices.length > 0 ? existing.prices[0] : (existing.price || 0);
        duration = existing.duration || 60;
      }
    }

    onServicesChange(services.map(s => {
      if (s.id === serviceId) {
        // 仅覆盖基准价(prices[0])，保留后续的变体胶囊
        const newPrices = s.prices ? [...s.prices] : [];
        if (newPrices.length > 0) {
          newPrices[0] = basePrice;
        } else {
          newPrices.push(basePrice);
        }
        return { ...s, name, prices: newPrices, duration };
      }
      return s;
    }));
    setEditingServiceId(null);
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
  const [newCategoryInput, setNewCategoryInput] = useState("");

  const handleCreateCategoryFromDropdown = () => {
    if (!newCategoryInput.trim()) return;
    const targetName = newCategoryInput.trim();
    
    const existingCat = categories.find(c => c.name === targetName);
    if (existingCat) {
      setActiveCategoryId(existingCat.id);
    } else {
      categoryIdSeed.current += 1;
      const newCatId = `cat_${Date.now()}_${categoryIdSeed.current}`;
      onCategoriesChange([...categories, { id: newCatId, name: targetName }]);
      setActiveCategoryId(newCatId);
    }
    setNewCategoryInput("");
    setIsDropdownOpen(false);
  };

  const activeCategoryName = categories.find(c => c.id === activeCategoryId)?.name || "未选择";

  return (
    <div className="space-y-8 pb-24">
      {/* 分类与服务列表 */}
      {categories.map((cat) => {
        const catServices = services.filter(s => s.categoryId === cat.id);
        const isActive = cat.id === activeCategoryId;
        
        
        return (
          <div key={cat.id} className={`space-y-3 p-4 rounded-xl transition-all border ${isActive ? 'bg-white/[0.02] border-gx-cyan/30 shadow-[0_0_15px_rgba(0,240,255,0.05)]' : 'border-transparent'}`}>
            <div className="flex items-center justify-between border-b border-white/10 pb-2 group/header">
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
                  className="flex-1 bg-black/60 border border-gx-cyan/50 rounded text-white text-xs font-black tracking-widest px-2 py-1 outline-none mr-2"
                />
              ) : (
                <h3 
                  className={`text-xs font-black tracking-widest flex items-center gap-2 cursor-pointer ${isActive ? 'text-gx-cyan' : 'text-white/80'} hover:text-gx-cyan transition-colors`}
                  onClick={() => {
                    if (isActive) {
                      handleStartCategoryEdit(cat);
                    } else {
                      setActiveCategoryId(cat.id);
                    }
                  }}
                  title={isActive ? t('txt_a0cb83') : t('txt_78345c')}
                >
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-gx-cyan animate-pulse" />}
                  {cat.name}
                  {catServices.length === 0 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRemoveCategory(cat.id); }}
                      className="text-white/20 hover:text-red-500 opacity-0 group-hover/header:opacity-100 transition-opacity ml-2"
                      title={t('txt_1837b2')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </h3>
              )}
              <span className="text-[10px] font-mono text-white/30">{catServices.length} ITEMS</span>
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {catServices.map((service) => (
                  <motion.div 
                    key={service.id} 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col gap-2 p-4 bg-black/40 border border-white/5 rounded-xl group hover:bg-white/[0.05] transition-all relative overflow-hidden"
                  >
                    {editingServiceId === service.id ? (
                      <div className="flex items-center gap-2 relative z-10">
                        <input
                          type="text"
                          value={editInput}
                          onChange={(e) => setEditInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(service.id); }
                            else if (e.key === 'Escape') setEditingServiceId(null);
                          }}
                          autoFocus
                          onBlur={() => handleSaveEdit(service.id)}
                          className="w-full bg-black/60 border border-gx-cyan/50 rounded text-white text-xs px-2 py-1 outline-none font-mono"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span 
                            className="text-xs font-bold text-white flex items-center gap-2 group-hover:text-gx-cyan transition-colors cursor-pointer"
                            onClick={() => handleStartEdit(service)}
                          >
                            {service.name}
                          </span>
                          
                          {/* 耗时移动到中间 */}
                          <span className="text-[10px] font-mono text-white/40">
                            {service.duration || 60} min
                          </span>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center flex-wrap justify-end gap-1.5">
                              {/* 基准价 */}
                              <span 
                                className="text-xs font-bold text-gx-cyan font-mono cursor-pointer"
                                onClick={() => handleStartEdit(service)}
                              >
                                ¥{service.prices && service.prices.length > 0 ? service.prices[0] : (service.price || 0)}
                              </span>
                              
                              {/* 变体胶囊阵列 */}
                              {service.prices && service.prices.length > 1 && (
                                <div className="flex items-center gap-1 ml-1">
                                  {service.prices.slice(1).map((p: number, i: number) => (
                                    <div key={i} className="group/capsule relative">
                                      <span className="text-[10px] text-white/80 font-mono bg-white/10 px-1.5 py-0.5 rounded-full border border-white/5">
                                        {p}
                                      </span>
                                      <button 
                                        onClick={() => handleRemoveVariant(service.id, i + 1)}
                                        className="absolute -top-1 -right-1 bg-red-500 rounded-full w-3 h-3 flex items-center justify-center opacity-0 group-hover/capsule:opacity-100 transition-opacity"
                                      >
                                        <span className="text-[8px] text-white leading-none -mt-0.5">×</span>
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
                                  className="w-10 text-[10px] bg-black/60 border border-gx-cyan/50 rounded px-1 py-0.5 text-white font-mono outline-none"
                                  placeholder={t('txt_0e9fd9')}
                                />
                              ) : (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setAddingVariantId(service.id); }}
                                  className="text-[10px] text-white/40 hover:text-gx-cyan bg-white/5 hover:bg-gx-cyan/10 px-1.5 py-0.5 rounded-full transition-colors border border-dashed border-white/20 hover:border-gx-cyan/50 ml-1"
                                >
                                  +
                                </button>
                              )}
                            </div>
                            
                            {/* 垃圾桶 */}
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleRemoveService(service.id); }} 
                              className="text-white/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-20 ml-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <input 
                            type="text"
                            placeholder={t('txt_48247a')}
                            value={service.fullName || ""}
                            onChange={(e) => {
                              onServicesChange(services.map(s => s.id === service.id ? { ...s, fullName: e.target.value } : s));
                            }}
                            className="w-full bg-transparent border-b border-white/10 focus:border-gx-cyan/50 text-[10px] text-white/60 placeholder:text-white/20 py-1 outline-none transition-colors"
                          />
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        );
      })}

      {/* 底部全局指挥舱 (Omni-Input Core) */}
      <div className="sticky bottom-0 left-0 w-full pt-4 pb-2 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/90 to-transparent z-30">
        
        {/* 透明遮罩：用于点击外部关闭下拉菜单 */}
        {isDropdownOpen && (
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsDropdownOpen(false)}
          />
        )}

        <div className="relative group flex items-center bg-black/60 border border-white/10 group-focus-within:border-gx-cyan/50 rounded-2xl p-1.5 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] transition-all z-50">
          
          {/* 上下文 Badge (交互式 Dropdown) */}
          <div className="relative">
            <div 
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gx-cyan/10 border border-gx-cyan/20 shrink-0 cursor-pointer hover:bg-gx-cyan/20 transition-colors"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              title={t('txt_236222')}
            >
              <span className="text-[10px] font-black text-gx-cyan uppercase tracking-wider max-w-[80px] truncate">
                {activeCategoryName}
              </span>
              <svg 
                className="w-2.5 h-2.5 text-gx-cyan/50 transition-transform duration-200" 
                style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* 下拉菜单面板 */}
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-0 mb-2 w-48 bg-[#0f0f0f] border border-white/10 rounded-xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden flex flex-col z-50"
                >
                  <div className="max-h-40 overflow-y-auto no-scrollbar py-1">
                    {categories.length === 0 && (
                      <div className="px-3 py-2 text-[10px] text-white/30 text-center font-mono">{t('txt_2d32b1')}</div>
                    )}
                    {categories.map(cat => (
                      <div
                        key={cat.id}
                        className={`px-3 py-2 text-xs font-black tracking-widest cursor-pointer transition-colors ${cat.id === activeCategoryId ? 'text-gx-cyan bg-gx-cyan/5' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                        onClick={() => {
                          setActiveCategoryId(cat.id);
                          setIsDropdownOpen(false);
                        }}
                      >
                        {cat.name}
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-white/10 p-2 bg-black/40">
                    <input
                      type="text"
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateCategoryFromDropdown();
                        } else if (e.key === 'Escape') {
                          setIsDropdownOpen(false);
                        }
                      }}
                      placeholder={t('txt_ba4eed')}
                      className="w-full bg-white/5 border border-white/10 focus:border-gx-cyan/50 rounded text-white text-[10px] px-2 py-1.5 outline-none font-mono placeholder:text-white/30 transition-colors"
                      autoFocus
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <input
            type="text"
            value={globalInput}
            onChange={(e) => setGlobalInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('txt_f0cd9f')}
            className="flex-1 bg-transparent text-white text-sm px-3 py-2 outline-none placeholder:text-white/20 font-mono"
          />

          {/* 触屏发送键 */}
          <div className="flex items-center gap-1 pr-1">
            <button
              onClick={handleGlobalNLPInput}
              className="w-8 h-8 rounded-xl bg-gx-cyan flex items-center justify-center text-black hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
