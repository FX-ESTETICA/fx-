"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, Users, Scissors, Clock, Plus, Trash2, User, ChevronLeft, Check, Shield, CreditCard, Calendar as CalendarIcon, Smartphone, Briefcase, Eye, Link as LinkIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { useState, useEffect, useRef, useCallback } from "react";
import { OperatingHour } from "./IndustryCalendar";

export interface NebulaConfigHubProps {
  isOpen: boolean;
  onClose: () => void;
  industryLabel?: string;
  operatingHours: OperatingHour[];
  onOperatingHoursChange: (hours: OperatingHour[]) => void;
  staffs: any[];
  onStaffsChange: (staffs: any[]) => void;
  categories: any[];
  onCategoriesChange: (categories: any[]) => void;
  services: any[];
  onServicesChange: (services: any[]) => void;
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
  onOperatingHoursChange,
  staffs,
  onStaffsChange,
  categories,
  onCategoriesChange,
  services,
  onServicesChange
}: NebulaConfigHubProps) => {
  const [activeTab, setActiveTab] = useState<"staff" | "services" | "hours">("hours");
  
  // 本地暂存状态，点击保存时才同步到全局
  const [localHours, setLocalHours] = useState<OperatingHour[]>(operatingHours);
  const [localStaffs, setLocalStaffs] = useState<any[]>(staffs);
  const [localCategories, setLocalCategories] = useState<any[]>(categories);
  const [localServices, setLocalServices] = useState<any[]>(services);

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

  // 每次打开抽屉时，重置为最新的全局状态
  useEffect(() => {
    if (isOpen) {
      setLocalHours(operatingHours);
      setLocalStaffs(staffs);
      setLocalCategories(categories);
      setLocalServices(services);
      setEditingContext({ type: null, saveAction: null, cancelAction: null }); // 重置编辑状态
    }
  }, [isOpen, operatingHours, staffs, categories, services]);

  const handleGlobalSave = () => {
    onOperatingHoursChange(localHours);
    onStaffsChange(localStaffs);
    onCategoriesChange(localCategories);
    onServicesChange(localServices);
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
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 30, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-[480px] bg-black/80 backdrop-blur-3xl border-l border-white/10 z-[101] flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"
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
                    {industryLabel} // CONFIG HUB
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
            <div className="flex p-4 gap-2 border-b border-white/5 shrink-0">
              {[
                { id: "hours", label: "营业时间", icon: Clock },
                { id: "staff", label: "人员/资源", icon: Users },
                { id: "services", label: "服务项目", icon: Scissors },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl flex flex-col items-center gap-2 transition-all",
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

const HoursConfig = ({ hours = [], onChange }: { hours: OperatingHour[], onChange: (h: OperatingHour[]) => void }) => {
  const handleAdd = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    onChange([...hours, { id: newId, start: 9, end: 18 }]);
  };

  const handleRemove = (id: string) => {
    onChange(hours.filter(h => h.id !== id));
  };

  const handleUpdate = (id: string, field: 'start' | 'end', value: string) => {
    const numValue = parseInt(value.split(':')[0], 10);
    if (isNaN(numValue)) return;
    
    onChange(hours.map(h => h.id === id ? { ...h, [field]: numValue } : h));
  };

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
                    <input 
                      type="time" 
                      value={`${hour.start.toString().padStart(2, '0')}:00`} 
                      onChange={(e) => handleUpdate(hour.id, 'start', e.target.value)}
                      className="bg-transparent text-white font-mono outline-none" 
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-mono text-white/40 uppercase">End</span>
                    <input 
                      type="time" 
                      value={`${hour.end.toString().padStart(2, '0')}:00`}
                      onChange={(e) => handleUpdate(hour.id, 'end', e.target.value)}
                      className="bg-transparent text-white font-mono outline-none" 
                    />
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

const StaffConfig = ({ staffs, onChange, onEditingStateChange, services }: { staffs: any[], onChange: (s: any[]) => void, onEditingStateChange: (saveAction: (() => void) | null, cancelAction: (() => void) | null) => void, services: any[] }) => {
  const [editingStaff, setEditingStaff] = useState<any>(null);

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
            onChange([...staffs, { ...data, id: Math.random().toString(36).substr(2, 9) }]);
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
        onClick={() => setEditingStaff({ status: "active", calendarView: "self", nebulaAccess: false, operationRights: "view", financialVisibility: "self", services: [] })}
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

const StaffForm = ({ staff, onBack, onSave, registerActions, availableServices = [] }: { staff: any, onBack: () => void, onSave: (data: any) => void, registerActions: (save: () => void, cancel: () => void) => void, availableServices?: any[] }) => {
  const [activeTab, setActiveTab] = useState<"basic" | "finance" | "access">("basic");
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
            onClick={() => setActiveTab(tab.id as any)}
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
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.frontendId}`} alt="avatar" className="w-full h-full object-cover" />
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
  categories: any[], 
  services: any[], 
  onCategoriesChange: (c: any[]) => void, 
  onServicesChange: (s: any[]) => void 
}) => {
  const [ghostInputs, setGhostInputs] = useState<Record<string, string>>({});

  const handleNLPInput = (categoryId: string, value: string) => {
    if (!value.trim()) return;

    // 智能解析逻辑
    // 1. 如果以 # 开头，则创建新分类
    if (value.startsWith('#')) {
      const newCategoryName = value.substring(1).trim();
      if (newCategoryName) {
        const newCatId = Math.random().toString(36).substr(2, 9);
        const newCategories = [...categories, { id: newCatId, name: newCategoryName }];
        onCategoriesChange(newCategories);
        // 自动保存
        localStorage.setItem('gx_sandbox_categories', JSON.stringify(newCategories));
      }
      return;
    }

    // 2. 正常解析：日式美甲 30/35/40 45
    const parts = value.trim().split(/\s+/);
    let name = value;
    let prices: number[] = [0];
    let duration = 60; // 默认 60 分钟

    if (parts.length >= 3) {
      const last = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(last)) {
        duration = last;
      }
      
      const priceStr = parts[parts.length - 2];
      const parsedPrices = priceStr.split(/[/,]/).map(p => parseInt(p, 10)).filter(p => !isNaN(p));
      if (parsedPrices.length > 0) {
        prices = parsedPrices;
      }
      
      name = parts.slice(0, parts.length - 2).join(" ");
    } else if (parts.length === 2) {
      const priceStr = parts[parts.length - 1];
      const parsedPrices = priceStr.split(/[/,]/).map(p => parseInt(p, 10)).filter(p => !isNaN(p));
      if (parsedPrices.length > 0) {
        prices = parsedPrices;
      }
      name = parts[0];
    }

    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      categoryId,
      name,
      prices, // 使用数组存储价格档位
      duration
    };

    const newServices = [...services, newItem];
    onServicesChange(newServices);
    // 自动保存
    localStorage.setItem('gx_sandbox_services', JSON.stringify(newServices));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, categoryId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNLPInput(categoryId, ghostInputs[categoryId] || '');
      setGhostInputs({ ...ghostInputs, [categoryId]: '' }); // 清空当前输入框，实现连录
    }
  };

  const handleRemoveService = (id: string) => {
    const newServices = services.filter(s => s.id !== id);
    onServicesChange(newServices);
    localStorage.setItem('gx_sandbox_services', JSON.stringify(newServices));
  };

  const handleRemoveCategory = (id: string) => {
    const newCategories = categories.filter((c) => c.id !== id);
    onCategoriesChange(newCategories);
    localStorage.setItem('gx_sandbox_categories', JSON.stringify(newCategories));
  };

  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState("");

  const handleStartEdit = (service: any) => {
    setEditingServiceId(service.id);
    const priceStr = service.prices ? service.prices.join('/') : service.price;
    setEditInput(`${service.name} ${priceStr} ${service.duration}`);
  };

  const handleSaveEdit = (serviceId: string) => {
    if (!editInput.trim()) {
      setEditingServiceId(null);
      return;
    }

    const parts = editInput.trim().split(/\s+/);
    let name = editInput;
    let prices: number[] = [0];
    let duration = 60;

    if (parts.length >= 3) {
      const last = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(last)) {
        duration = last;
      }
      
      const priceStr = parts[parts.length - 2];
      const parsedPrices = priceStr.split(/[/,]/).map(p => parseInt(p, 10)).filter(p => !isNaN(p));
      if (parsedPrices.length > 0) {
        prices = parsedPrices;
      }
      
      name = parts.slice(0, parts.length - 2).join(" ");
    } else if (parts.length === 2) {
      const priceStr = parts[parts.length - 1];
      const parsedPrices = priceStr.split(/[/,]/).map(p => parseInt(p, 10)).filter(p => !isNaN(p));
      if (parsedPrices.length > 0) {
        prices = parsedPrices;
      }
      name = parts[0];
    } else {
      // 只有名称的情况
      name = editInput;
      // 尝试保留原有的价格和时长
      const existingService = services.find(s => s.id === serviceId);
      if (existingService) {
        prices = existingService.prices || [existingService.price || 0];
        duration = existingService.duration || 60;
      }
    }

    const newServices = services.map(s => {
      if (s.id === serviceId) {
        return { ...s, name, prices, duration };
      }
      return s;
    });

    onServicesChange(newServices);
    localStorage.setItem('gx_sandbox_services', JSON.stringify(newServices));
    setEditingServiceId(null);
  };

  return (
    <div className="space-y-8">
      <div className="bg-gx-cyan/10 border border-gx-cyan/20 p-4 rounded-xl flex items-start gap-3">
        <Settings className="w-4 h-4 text-gx-cyan mt-0.5 shrink-0" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-gx-cyan">极客输入模式 (NLP Flow-State)</h4>
          <p className="text-[10px] text-white/60 leading-relaxed">
            无需繁琐弹窗，在下方输入框直接打字：<span className="text-white font-mono bg-white/10 px-1 py-0.5 rounded">洗剪吹 128 60</span> 按回车极速连录。
            输入 <span className="text-white font-mono bg-white/10 px-1 py-0.5 rounded">#分类名</span> 可快速创建新分类。
          </p>
        </div>
      </div>

      {categories.map((cat) => {
        const catServices = services.filter(s => s.categoryId === cat.id);
        
        return (
          <div key={cat.id} className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 group/header">
              <h3 className="text-xs font-black text-white/80 tracking-widest flex items-center gap-2">
                {cat.name}
                {catServices.length === 0 && (
                  <button 
                    onClick={() => handleRemoveCategory(cat.id)}
                    className="text-white/20 hover:text-red-500 opacity-0 group-hover/header:opacity-100 transition-opacity"
                    title="解散空分类"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </h3>
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
                    className="flex flex-col gap-2 p-4 bg-white/[0.02] border border-white/5 rounded-xl group hover:bg-white/[0.05] transition-all relative overflow-hidden"
                  >
                    {editingServiceId === service.id ? (
                      <div className="flex items-center gap-2 relative z-10">
                        <input
                          type="text"
                          value={editInput}
                          onChange={(e) => setEditInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEdit(service.id);
                            } else if (e.key === 'Escape') {
                              setEditingServiceId(null);
                            }
                          }}
                          autoFocus
                          onBlur={() => handleSaveEdit(service.id)}
                          className="w-full bg-black/60 border border-gx-cyan/50 rounded text-white text-xs px-2 py-1 outline-none font-mono"
                        />
                      </div>
                    ) : (
                      <>
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => handleStartEdit(service)}
                        >
                          <span className="text-xs font-bold text-white flex items-center gap-2 group-hover:text-gx-cyan transition-colors">
                            {service.name}
                          </span>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              {service.prices && service.prices.length > 0 ? (
                                <>
                                  <span className="text-xs font-bold text-gx-cyan font-mono">¥{service.prices[0]}</span>
                                  {service.prices.length > 1 && (
                                    <div className="flex items-center gap-1 ml-2">
                                      {service.prices.slice(1).map((p: number, i: number) => (
                                        <span key={i} className="text-[10px] text-white/40 font-mono bg-white/5 px-1.5 py-0.5 rounded">
                                          ¥{p}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs font-bold text-gx-cyan font-mono">¥{service.price}</span>
                              )}
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveService(service.id);
                              }} 
                              className="text-white/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                          <span>默认耗时: {service.duration} 分钟</span>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* 幽灵输入框 Ghost Input */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gx-cyan/5 rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <input
                  type="text"
                  value={ghostInputs[cat.id] || ''}
                  onChange={(e) => setGhostInputs({ ...ghostInputs, [cat.id]: e.target.value })}
                  onKeyDown={(e) => handleKeyDown(e, cat.id)}
                  placeholder="项目名称 价格 耗时 (如：深层护理 298 45) ..."
                  className="w-full relative bg-black/40 border border-white/10 group-focus-within:border-gx-cyan/50 rounded-xl text-white text-xs px-4 py-3 outline-none transition-all placeholder:text-white/20 font-mono shadow-inner"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none">
                  <span className="text-[8px] text-gx-cyan/60 border border-gx-cyan/30 rounded px-1.5 py-0.5">ENTER</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* 新建分类输入框 */}
      <div className="relative group mt-6">
        <div className="absolute inset-0 bg-white/5 rounded-xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity" />
        <input
          type="text"
          value={ghostInputs['new_category'] || ''}
          onChange={(e) => setGhostInputs({ ...ghostInputs, 'new_category': e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && ghostInputs['new_category']?.trim()) {
              e.preventDefault();
              let catName = ghostInputs['new_category'].trim();
              if (catName.startsWith('#')) catName = catName.substring(1).trim();
              if (catName) {
                const newCatId = Math.random().toString(36).substr(2, 9);
                onCategoriesChange([...categories, { id: newCatId, name: catName }]);
                setGhostInputs({ ...ghostInputs, 'new_category': '' });
              }
            }
          }}
          placeholder="+ 输入 #新分类名称 并按回车..."
          className="w-full relative bg-transparent border border-dashed border-white/20 group-focus-within:border-white/50 rounded-xl text-white text-xs px-4 py-3 outline-none transition-all placeholder:text-white/40 font-mono"
        />
      </div>
    </div>
  );
};
