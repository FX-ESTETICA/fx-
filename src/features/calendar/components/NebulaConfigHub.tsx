"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, Users, Scissors, Clock, Plus, Trash2, User, ChevronLeft, Check, Shield, CreditCard, Calendar as CalendarIcon, Smartphone, Briefcase, Eye, Link as LinkIcon, MonitorPlay } from "lucide-react";
import { cn } from "@/utils/cn";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { OperatingHour } from "./IndustryCalendar";
import { useVisualSettings, CYBER_COLOR_DICTIONARY, CyberThemeColor } from "@/hooks/useVisualSettings";
import { BookingService } from "@/features/booking/api/booking";

export interface CategoryItem { id: string; name: string }
export interface ServiceItem { id: string; categoryId: string; name: string; prices?: number[]; price?: number; duration: number }
export interface StaffItem {
  id: string;
  name: string;
  role: string;
  color?: string;
  status: string;
  frontendId?: string;
  phone?: string;
  baseSalary?: number;
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
  industryLabel?: string;
  operatingHours: OperatingHour[];
  staffs: StaffItem[];
  categories: CategoryItem[];
  services: ServiceItem[];
  onGlobalSave: (hours: OperatingHour[], staffs: StaffItem[], categories: CategoryItem[], services: ServiceItem[]) => void;
}

/**
 * 星云配置中枢 (Nebula Config Hub)
 * 右侧滑出的高维度毛玻璃配置面板
 */
export const NebulaConfigHub = ({ 
  isOpen, 
  onClose, 
  industryLabel = "美业",
  operatingHours,
  staffs,
  categories,
  services,
  onGlobalSave
}: NebulaConfigHubProps) => {
  type MainTab = "staff" | "services" | "hours" | "visual";
  const [activeTab, setActiveTab] = useState<MainTab>("hours");
  const panelKey = `panel-${isOpen ? 'open' : 'closed'}-${operatingHours.length}-${staffs.length}-${categories.length}-${services.length}`;
  
  // 本地暂存状态，点击保存时才同步到全局
  const [localHours, setLocalHours] = useState<OperatingHour[]>(operatingHours);
  const [localStaffs, setLocalStaffs] = useState<StaffItem[]>(staffs);
  const [localCategories, setLocalCategories] = useState<CategoryItem[]>(categories);
  const [localServices, setLocalServices] = useState<ServiceItem[]>(services);

  // 【开箱同步锁】：每次打开抽屉时，强制同步外部最新数据，摧毁陈旧的本地缓存
  useEffect(() => {
    if (isOpen) {
      setLocalHours(operatingHours);
      setLocalStaffs(staffs);
      setLocalCategories(categories);
      setLocalServices(services);
    }
  }, [isOpen, operatingHours, staffs, categories, services]);

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


  const handleGlobalSave = () => {
    onGlobalSave(localHours, localStaffs, localCategories, localServices);
    onClose();
  };

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
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />

          {/* 抽屉主体 */}
          <motion.div
            key={panelKey}
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 30, stiffness: 200 }}
            className="fixed inset-0 md:inset-y-0 md:left-auto md:right-0 md:w-[480px] bg-black/95 md:bg-black/80 backdrop-blur-3xl md:border-l border-white/10 z-[101] flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"
          >
            {/* 头部 */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gx-cyan/10 flex items-center justify-center border border-gx-cyan/30">
                  <Settings className="w-4 h-4 text-gx-cyan animate-spin-slow" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">全局运营配置</h2>
                  <p className="text-[10px] font-mono text-white/40 uppercase mt-1">
                    {industryLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 导航 Tabs */}
            <div className="flex p-4 gap-2 border-b border-white/5 shrink-0 overflow-x-auto no-scrollbar">
              {[
                { id: "hours", label: "营业时间", icon: Clock },
                { id: "staff", label: "人员/资源", icon: Users },
                { id: "services", label: "服务项目", icon: Scissors },
                { id: "visual", label: "视觉层级", icon: MonitorPlay },
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
                      onChange={setLocalHours} 
                    />
                  )}
                  {activeTab === "staff" && (
                    <StaffConfig 
                      staffs={localStaffs} 
                      onChange={setLocalStaffs} 
                      onEditingStateChange={handleEditingStateChange}
                      services={localServices}
                    />
                  )}
                  {activeTab === "services" && (
                    <ServicesConfig 
                      categories={localCategories}
                      services={localServices}
                      onCategoriesChange={setLocalCategories}
                      onServicesChange={setLocalServices}
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
                    取消
                  </button>
                  <button
                    onClick={handleContextualSave}
                    className="flex-[2] py-4 rounded-2xl bg-gx-cyan text-black font-black uppercase tracking-widest hover:shadow-[0_0_30px_rgba(0,240,255,0.3)] transition-all text-xs"
                  >
                    {editingContext.type === 'staff' ? '保存人员配置' : '确认修改'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGlobalSave}
                  className="w-full py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest hover:bg-gx-cyan hover:shadow-[0_0_30px_rgba(0,240,255,0.3)] transition-all text-xs"
                >
                  保存全局配置并重载引擎
                </button>
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
  const { settings, updateSettings, isLoaded } = useVisualSettings();

  if (!isLoaded) return null;

  return (
    <div className="space-y-6">
      {/* 图层开关区 */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-white/60">背景层级控制 (Background Layers)</h3>
        
        {/* 星空开关 */}
        <div 
          className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl cursor-pointer hover:bg-white/[0.05] transition-colors"
          onClick={() => updateSettings({ showNebula: !settings.showNebula })}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-white block">3D 星云动效 (Nebula Particles)</span>
            <span className="text-[10px] text-white/40 font-mono">底层全息星空渲染，关闭可提升性能</span>
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
            <span className="text-xs font-bold text-white block">静态壁纸层 (Static Wallpaper)</span>
            <span className="text-[10px] text-white/40 font-mono">显示您自定义或同步的背景图片</span>
          </div>
          <div className={cn("w-10 h-6 rounded-full border flex items-center p-0.5 transition-colors", settings.showWallpaper ? "bg-gx-cyan/30 border-gx-cyan/50 justify-end" : "bg-white/5 border-white/10 justify-start")}>
            <motion.div layout className={cn("w-4 h-4 rounded-full shadow-sm", settings.showWallpaper ? "bg-gx-cyan" : "bg-white/40")} />
          </div>
        </div>
      </div>

      {/* 矩阵背板控制区 */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <h3 className="text-xs font-black uppercase tracking-widest text-white/60">矩阵背板控制 (Matrix Shield)</h3>
        
        {/* 背板总开关 */}
        <div 
          className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl cursor-pointer hover:bg-white/[0.05] transition-colors"
          onClick={() => updateSettings({ enableGlassShield: !settings.enableGlassShield })}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-white block">启用毛玻璃背板 (Enable Glass Shield)</span>
            <span className="text-[10px] text-white/40 font-mono">在日历与背景之间添加视觉隔离层</span>
          </div>
          <div className={cn("w-10 h-6 rounded-full border flex items-center p-0.5 transition-colors", settings.enableGlassShield ? "bg-gx-cyan/30 border-gx-cyan/50 justify-end" : "bg-white/5 border-white/10 justify-start")}>
            <motion.div layout className={cn("w-4 h-4 rounded-full shadow-sm", settings.enableGlassShield ? "bg-gx-cyan" : "bg-white/40")} />
          </div>
        </div>

        {/* 透明度与模糊度滑块 (仅在背板开启时显示) */}
        <AnimatePresence>
          {settings.enableGlassShield && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-6 p-4 bg-white/[0.01] rounded-xl border border-white/5 overflow-hidden"
            >
              {/* 透明度滑块 */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">黑色遮罩浓度 (Opacity)</label>
                  <span className="text-xs font-mono text-gx-cyan">{settings.shieldOpacity}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" step="5"
                  value={settings.shieldOpacity}
                  onChange={(e) => updateSettings({ shieldOpacity: parseInt(e.target.value) })}
                  className="w-full accent-gx-cyan h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* 模糊度滑块 */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">毛玻璃模糊度 (Blur)</label>
                  <span className="text-xs font-mono text-gx-cyan">{settings.shieldBlur}px</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="20" step="0.5"
                  value={settings.shieldBlur}
                  onChange={(e) => updateSettings({ shieldBlur: parseFloat(e.target.value) })}
                  className="w-full accent-gx-cyan h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 赛博全息主题色控制区 */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <h3 className="text-xs font-black uppercase tracking-widest text-white/60">全息主题色映射 (Hologram Theme)</h3>
        
        {/* 顶部大标题颜色 */}
        <div className="space-y-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-white/80 uppercase tracking-widest">顶部日期标题色</label>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10", CYBER_COLOR_DICTIONARY[settings.headerTitleColorTheme].className)}>
              {CYBER_COLOR_DICTIONARY[settings.headerTitleColorTheme].label}
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
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
            <label className="text-[10px] font-bold text-white/80 uppercase tracking-widest">员工表头字体色</label>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10", CYBER_COLOR_DICTIONARY[settings.staffNameColorTheme].className)}>
              {CYBER_COLOR_DICTIONARY[settings.staffNameColorTheme].label}
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
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
            <label className="text-[10px] font-bold text-white/80 uppercase tracking-widest">时间轴字体色</label>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10", CYBER_COLOR_DICTIONARY[settings.timelineColorTheme].className)}>
              {CYBER_COLOR_DICTIONARY[settings.timelineColorTheme].label}
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
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

const HoursConfig = ({ hours, onChange }: { hours: OperatingHour[], onChange: (h: OperatingHour[]) => void }) => {
  const idSeed = useRef(0);
  const handleAdd = () => {
    idSeed.current += 1;
    const newId = `hour_${idSeed.current}`;
    onChange([...hours, { id: newId, start: 9, end: 18 }]);
  };

  const handleRemove = (id: string) => {
    onChange(hours.filter(h => h.id !== id));
  };

  const handleUpdate = (id: string, field: 'start' | 'end', value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;
    
    onChange(hours.map(h => h.id === id ? { ...h, [field]: numValue } : h));
  };

  // 0-24 营业时间选项
  const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => i);

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-white">常规营业时间段</span>
          <button onClick={handleAdd} className="text-[10px] font-bold text-gx-cyan flex items-center gap-1 hover:text-white transition-colors">
            <Plus className="w-3 h-3" /> 添加时段
          </button>
        </div>
        <p className="text-[10px] font-mono text-white/40">
          添加多个时段可自动生成休息时间。日历引擎将智能折叠非营业时间，并在有跨界预约时弹性展开。
        </p>
        
        <div className="space-y-3">
          <AnimatePresence>
            {hours.map((hour) => (
              <motion.div 
                key={hour.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 group overflow-hidden"
              >
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-mono text-white/40 uppercase">Start</span>
                    <select 
                      value={hour.start} 
                      onChange={(e) => handleUpdate(hour.id, 'start', e.target.value)}
                      className="bg-transparent text-white font-mono outline-none border-b border-white/10 pb-1 cursor-pointer appearance-none" 
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
                      onChange={(e) => handleUpdate(hour.id, 'end', e.target.value)}
                      className="bg-transparent text-white font-mono outline-none border-b border-white/10 pb-1 cursor-pointer appearance-none" 
                    >
                      {HOUR_OPTIONS.map(h => (
                        <option key={`end-${h}`} value={h} className="bg-black text-white">
                          {h.toString().padStart(2, '0')}:00
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button onClick={() => handleRemove(hour.id)} className="text-white/20 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

import { useShop } from "@/features/shop/ShopContext";

const StaffConfig = ({ staffs, onChange, onEditingStateChange, services }: { staffs: StaffItem[], onChange: (s: StaffItem[]) => void, onEditingStateChange: (saveAction: (() => void) | null, cancelAction: (() => void) | null) => void, services: ServiceItem[] }) => {
  const [editingStaff, setEditingStaff] = useState<StaffItem | null>(null);
  const staffIdSeed = useRef(0);
  const { activeShopId } = useShop();

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
          if (data.id) {
            onChange(staffs.map(s => s.id === data.id ? { ...s, ...data } : s));
          } else {
            staffIdSeed.current += 1;
            onChange([...staffs, { ...data, id: `staff_${staffIdSeed.current}` }]);
          }
          
          // 如果填写了 Frontend ID，触发云端绑定授权，让员工端可以显示日历入口
          if (data.frontendId && data.frontendId.trim() !== '') {
            if (activeShopId) {
              BookingService.bindUserToShop(data.frontendId.trim(), activeShopId)
              .then(() => {
                console.log(`[NebulaConfigHub] Successfully linked ${data.frontendId} to shop ${activeShopId}`);
              }).catch((e: unknown) => console.error("Failed to link frontend ID to shop:", e));
            }
          }
          
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
        <Plus className="w-4 h-4" /> 新增人员/资源
      </button>
      
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
                {staff.status === "on_leave" && <span className="px-1.5 py-0.5 rounded text-[8px] bg-yellow-500/20 text-yellow-500 font-bold border border-yellow-500/30">休假</span>}
                {staff.status === "resigned" && <span className="px-1.5 py-0.5 rounded text-[8px] bg-red-500/20 text-red-500 font-bold border border-red-500/30">离职</span>}
              </div>
              <span className="text-[10px] font-mono text-white/40 mt-0.5 flex items-center gap-1">
                {staff.role} 
                {staff.frontendId && <LinkIcon className="w-2.5 h-2.5 text-gx-cyan" />}
              </span>
            </div>
          </div>
          <button className="text-[10px] font-bold text-white/40 group-hover:text-white underline underline-offset-4 transition-colors">配置</button>
        </div>
      ))}
    </div>
  );
};

const StaffForm = ({ staff, onBack, onSave, registerActions, availableServices = [] }: { staff: StaffItem, onBack: () => void, onSave: (data: StaffItem) => void, registerActions: (save: () => void, cancel: () => void) => void, availableServices?: ServiceItem[] }) => {
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
    commissionRate: staff.commissionRate || 0,
    calendarView: staff.calendarView || "self",
    nebulaAccess: staff.nebulaAccess || false,
    operationRights: staff.operationRights || "view",
    financialVisibility: staff.financialVisibility || "self",
    services: staff.services || []
  });
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);

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
          <ChevronLeft className="w-4 h-4" /> 返回列表
        </button>
        <span className="text-xs font-black text-white">{staff.id ? "编辑人员配置" : "新增人员/资源"}</span>
      </div>

      {/* Internal Tabs */}
      <div className="flex p-1 bg-white/5 rounded-lg border border-white/10">
        {[
          { id: "basic", label: "基础与通信", icon: User },
          { id: "finance", label: "薪酬架构", icon: CreditCard },
          { id: "access", label: "权限与调度", icon: Shield },
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
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">姓名 / Name</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-transparent border-b border-white/10 text-white text-sm pb-1 focus:outline-none focus:border-gx-cyan transition-colors" placeholder="输入员工姓名" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">职位头衔 / Title</label>
                  <input type="text" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-transparent border-b border-white/10 text-white text-sm pb-1 focus:outline-none focus:border-gx-cyan transition-colors" placeholder="如：高级总监" />
                </div>
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">专属颜色标识 / Theme Color</label>
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
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">当前状态 / Status</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "active", label: "在职 (接单)", color: "text-green-400 border-green-400/20 bg-green-400/10" },
                  { id: "on_leave", label: "休假 (锁单)", color: "text-yellow-400 border-yellow-400/20 bg-yellow-400/10" },
                  { id: "resigned", label: "离职 (隐藏)", color: "text-red-400 border-red-400/20 bg-red-400/10" },
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
                <span className="text-xs font-black uppercase">系统关联 (System Link)</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">前端绑定 ID / Frontend ID</label>
                  <input type="text" value={formData.frontendId} onChange={e => setFormData({...formData, frontendId: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-md text-white text-xs p-2 focus:outline-none focus:border-gx-cyan transition-colors font-mono placeholder:text-white/20" placeholder="如：GX_USR_10023 (可选)" />
                  <p className="text-[8px] text-white/30 font-mono mt-1">绑定后该用户可直接在小程序「我的」中进入管理后台日历。</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">联系电话 / Phone</label>
                  <div className="relative">
                    <Smartphone className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" />
                    <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-md text-white text-xs py-2 pl-7 pr-2 focus:outline-none focus:border-gx-cyan transition-colors font-mono placeholder:text-white/20" placeholder="用于接收预约通知" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "finance" && (
          <div className="space-y-5 animate-in fade-in">
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">基础底薪 / Base Salary (¥)</label>
                <input type="number" value={formData.baseSalary} onChange={e => setFormData({...formData, baseSalary: Number(e.target.value)})} className="w-full bg-transparent border-b border-white/10 text-white text-lg font-mono pb-1 focus:outline-none focus:border-gx-cyan transition-colors" placeholder="0" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center justify-between">
                  <span>提成比例 / Commission Rate (%)</span>
                </label>
                <div className="relative">
                  <input type="number" value={formData.commissionRate} onChange={e => setFormData({...formData, commissionRate: Number(e.target.value)})} className="w-full bg-transparent border-b border-white/10 text-white text-lg font-mono pb-1 focus:outline-none focus:border-gx-cyan transition-colors" placeholder="0" max="100" />
                  <span className="absolute right-0 bottom-2 text-white/40 font-mono">%</span>
                </div>
              </div>
            </div>

            {/* 自动化提示看板 */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-gx-purple/10 to-transparent border border-gx-purple/20 flex gap-3 items-start">
              <div className="p-2 rounded-lg bg-gx-purple/20 text-gx-purple shrink-0">
                <Settings className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white">AI 动态目标引擎已接管</h4>
                <p className="text-[10px] text-white/50 leading-relaxed">
                  系统将根据底薪自动折算该员工的【保本目标额度】并在前端工作台动态展示。超复杂阶梯提成等财务报表将在月底由 AI 统一核算。
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "access" && (
          <div className="space-y-6 animate-in fade-in">
            {/* Calendar Access */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1"><CalendarIcon className="w-3 h-3"/> 日历视图权限</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "self", label: "仅看自己", desc: "私密隔离" },
                  { id: "all", label: "查看全部", desc: "全局统筹" }
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
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1"><Shield className="w-3 h-3"/> 操作与改价权限</label>
              <select value={formData.operationRights} onChange={e => setFormData({...formData, operationRights: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg text-white text-xs p-3 focus:outline-none focus:border-gx-cyan transition-colors appearance-none cursor-pointer">
                <option value="view">Lv.1 仅查看与核销 (只读)</option>
                <option value="edit">Lv.2 允许修改订单排期 (编辑)</option>
                <option value="edit_price">Lv.3 拥有改价/打折权限 (高级)</option>
              </select>
            </div>

            {/* Financial Visibility */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1"><Eye className="w-3 h-3"/> 财务数据可见性</label>
              <select value={formData.financialVisibility} onChange={e => setFormData({...formData, financialVisibility: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg text-white text-xs p-3 focus:outline-none focus:border-gx-cyan transition-colors appearance-none cursor-pointer">
                <option value="self">仅可见个人提成与业绩</option>
                <option value="store">可见全店总营业额 (店长级)</option>
              </select>
            </div>

            {/* Nebula Access */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-gx-purple/20 bg-gx-purple/5 cursor-pointer" onClick={() => setFormData({...formData, nebulaAccess: !formData.nebulaAccess})}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">星云系统准入</span>
                  <span className="px-1.5 py-0.5 rounded text-[8px] bg-gx-purple/20 text-gx-purple border border-gx-purple/30 font-mono uppercase">Nebula</span>
                </div>
                <p className="text-[9px] text-white/40">允许该员工进入高级数字孪生沙盘</p>
              </div>
              <div className={cn("w-10 h-6 rounded-full border flex items-center p-0.5 transition-colors", formData.nebulaAccess ? "bg-gx-purple/30 border-gx-purple/50 justify-end" : "bg-white/5 border-white/10 justify-start")}>
                <motion.div layout className={cn("w-4 h-4 rounded-full shadow-sm", formData.nebulaAccess ? "bg-gx-purple" : "bg-white/40")} />
              </div>
            </div>

            {/* Assigned Services (Capabilities Workflow) */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center justify-between">
                <span className="flex items-center gap-1"><Briefcase className="w-3 h-3"/> 可提供服务/技能绑定</span>
                <span className="text-gx-cyan cursor-pointer hover:text-white transition-colors" onClick={() => setIsServicesModalOpen(true)}>修改</span>
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
                  <span className="text-xs text-white/20 my-auto">尚未绑定任何技能，前端客户无法预约该员工</span>
                )}
              </div>
              <p className="text-[9px] text-gx-cyan/60">💡 当客户在前端预约特定服务时，只有绑定了该服务的员工会显示在可用列表中。结合5分钟自动接单流。</p>
            </div>
          </div>
        )}
      </div>

      {/* Services Modal Mock */}
      <AnimatePresence>
        {isServicesModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
              <h3 className="text-sm font-black text-white">绑定服务技能</h3>
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
                确定 (Confirm)
              </button>
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
      {/* 顶部指引 */}
      <div className="bg-gx-cyan/10 border border-gx-cyan/20 p-4 rounded-xl flex items-start gap-3">
        <Settings className="w-4 h-4 text-gx-cyan mt-0.5 shrink-0" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-gx-cyan">极客输入模式 (Omni-Input Core)</h4>
          <p className="text-[10px] text-white/60 leading-relaxed">
            1. 底部输入 <span className="text-white font-mono bg-white/10 px-1 py-0.5 rounded">#分类名</span> 锁定上下文。<br/>
            2. 极速建档 <span className="text-white font-mono bg-white/10 px-1 py-0.5 rounded">名称 基准价 耗时</span> (如：Ms 35 45)。<br/>
            3. GUI 贴胶囊：在卡片上点击 <span className="text-white font-mono bg-white/10 px-1 py-0.5 rounded">+</span> 添加变体价格。
          </p>
        </div>
      </div>

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
                  title={isActive ? "点击重命名分类" : "点击激活该分类"}
                >
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-gx-cyan animate-pulse" />}
                  {cat.name}
                  {catServices.length === 0 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRemoveCategory(cat.id); }}
                      className="text-white/20 hover:text-red-500 opacity-0 group-hover/header:opacity-100 transition-opacity ml-2"
                      title="解散空分类"
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
                                  placeholder="价格"
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
                        <div className="flex items-center justify-between text-[10px] font-mono text-white/40 mt-1">
                          <span>默认耗时: {service.duration || 60} 分钟</span>
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
              title="点击切换或新建分类"
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
                      <div className="px-3 py-2 text-[10px] text-white/30 text-center font-mono">暂无分类</div>
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
                      placeholder="+ 新建分类 (Enter)"
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
            placeholder="项目名称 价格 耗时 (如：Ms 35 45)"
            className="flex-1 bg-transparent text-white text-sm px-3 py-2 outline-none placeholder:text-white/20 font-mono"
          />

          {/* 触屏发送键 / OCR 兜底预留位 */}
          <div className="flex items-center gap-1 pr-1">
            <button 
              onClick={() => {}} // 预留 OCR 接口
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              title="全息扫描 (Camera Scan)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
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
