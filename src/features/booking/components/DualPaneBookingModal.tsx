"use client";

import { useState, useEffect } from 'react';
import { Sparkles, Calendar as CalendarIcon, Clock, Settings, User, X } from 'lucide-react';
import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from 'framer-motion';

interface DualPaneBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DualPaneBookingModal({ isOpen, onClose }: DualPaneBookingModalProps) {
  // --- 状态机：右侧面板模式 ---
  type RightPaneMode = 'service' | 'member' | 'date' | 'time' | 'duration';
  const [activePaneMode, setActivePaneMode] = useState<RightPaneMode>('service');

  // --- 服务项目状态 (支持多选与印章涂色) ---
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  // 服务内容的自定义附加文本
  const [customServiceText, setCustomServiceText] = useState("");
  // 当前全局的“印章/笔刷”员工ID，null 代表未指定(默认印章)
  const [currentBrushEmployeeId, setCurrentBrushEmployeeId] = useState<string | null>(null); 
  // 当前处于“待重定向”状态的已选服务ID
  const [retargetingServiceId, setRetargetingServiceId] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // --- 人员配置数据 ---
  const [staffs, setStaffs] = useState<any[]>([]);

  // --- 会员信息状态 ---
  const [memberInfo, setMemberInfo] = useState("");

  // --- 日期与时间状态 ---
  const [selectedDate, setSelectedDate] = useState("2026/03/07");
  const [selectedTime, setSelectedTime] = useState("09:15");

  // --- 服务时长微调状态 ---
  const [durationOffset, setDurationOffset] = useState<number>(0);

  // --- 双轨 HUD 时间选择器状态 ---
  const [isAM, setIsAM] = useState(true);
  const [draggingHour, setDraggingHour] = useState<number | null>(null);
  const [hoveredMinute, setHoveredMinute] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{x: number, y: number} | null>(null);
  const [centerDragStart, setCenterDragStart] = useState<number | null>(null);

  // 同步 AM/PM 状态
  useEffect(() => {
    const hour = parseInt(selectedTime.split(':')[0], 10);
    setIsAM(hour < 12);
  }, [selectedTime]);

  // 从 localStorage 加载配置数据
  useEffect(() => {
    if (isOpen) {
      try {
        const savedStaffs = localStorage.getItem('gx_sandbox_staffs');
        if (savedStaffs) {
          setStaffs(JSON.parse(savedStaffs).filter((s: any) => s.status !== 'resigned'));
        }

        const savedCategories = localStorage.getItem('gx_sandbox_categories');
        if (savedCategories) {
          const parsedCategories = JSON.parse(savedCategories);
          setCategories(parsedCategories);
          if (parsedCategories.length > 0 && !activeCategory) {
            setActiveCategory(parsedCategories[0].id);
          }
        }
        
        const savedServices = localStorage.getItem('gx_sandbox_services');
        if (savedServices) {
          setServices(JSON.parse(savedServices));
        }
      } catch (e) {
        console.error('Failed to parse sandbox data in BookingModal:', e);
      }
    } else {
      // 弹窗关闭时重置状态
      setSelectedServices([]);
      setCustomServiceText("");
      setCurrentBrushEmployeeId(null);
      setRetargetingServiceId(null);
      setActivePaneMode('service');
      setMemberInfo("");
      setDurationOffset(0);
    }
  }, [isOpen]);

  // 处理服务多选与印章涂色
  const handleToggleService = (service: any) => {
    // 如果当前有正在重定向的服务，点击矩阵中的任何其他服务或本身，都取消重定向状态
    if (retargetingServiceId) {
      setRetargetingServiceId(null);
    }

    setSelectedServices(prev => {
      const existingService = prev.find(s => s.id === service.id);
      
      if (existingService) {
        // 如果已经选中了该服务
        if (existingService.assignedEmployeeId === currentBrushEmployeeId) {
          // 如果当前印章和已分配的员工一致，则认为是“取消选中”
          return prev.filter(s => s.id !== service.id);
        } else {
          // 如果当前印章和已分配的员工不一致，则认为是“重新涂色/覆盖绑定”
          return prev.map(s => 
            s.id === service.id ? { ...s, assignedEmployeeId: currentBrushEmployeeId } : s
          );
        }
      } else {
        // 未选中，添加并直接盖上当前印章
        return [...prev, { ...service, assignedEmployeeId: currentBrushEmployeeId }];
      }
    });
  };

  // 切换当前的印章/笔刷，或者为待重定向的服务分配新员工
  const handleSetBrush = (employeeId: string | null) => {
    if (retargetingServiceId) {
      // 模式 A：正在重定向某个已选服务
      setSelectedServices(prev => prev.map(s => 
        s.id === retargetingServiceId ? { ...s, assignedEmployeeId: employeeId } : s
      ));
      setRetargetingServiceId(null); // 完成重定向后解除状态
      setCurrentBrushEmployeeId(employeeId); // 顺便把画笔也切过去，符合直觉
    } else {
      // 模式 B：正常的切换印章
      setCurrentBrushEmployeeId(employeeId);
    }
  };

  // 触发已选服务的重定向状态
  const handleRetargetService = (serviceId: string) => {
    setRetargetingServiceId(prev => prev === serviceId ? null : serviceId);
  };

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // 计算总时长和结束时间
  const baseDuration = selectedServices.reduce((sum, service) => sum + (service.duration || 0), 0);
  const totalDuration = baseDuration > 0 ? Math.max(1, baseDuration + durationOffset) : 0;
  
  const getEndTime = () => {
    if (!selectedTime || totalDuration === 0) return "--:--";
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    date.setMinutes(date.getMinutes() + totalDuration);
    return date.toTimeString().substring(0, 5);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center font-sans text-white">
          {/* 背景暗场遮罩，带有毛玻璃效果 */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-[800px] flex flex-col items-center"
          >
            {/* 核心双窗容器 (Glassmorphism + Neon Border) */}
            <main className="w-full h-[450px] flex rounded-2xl overflow-hidden relative group border border-gx-cyan/50 shadow-[0_0_30px_rgba(0,240,255,0.2)] bg-black/40">
              {/* 右上角关闭按钮 */}
              <button 
                onClick={onClose} 
                className="absolute top-4 right-4 z-50 p-2 bg-black/40 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>

              {/* ===================== 左侧：控制台面板 ===================== */}
              <section className="w-[50%] h-full p-5 pb-16 flex flex-col gap-4 relative z-10">
                
                {/* 表单录入区 */}
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white font-bold italic font-mono tracking-widest uppercase">服务内容</label>
                    <div 
                      className={cn(
                        "bg-black/40 border rounded-lg p-2 h-[38px] flex items-center cursor-text transition-all shadow-[0_0_10px_rgba(0,240,255,0.05)] overflow-hidden",
                        activePaneMode === 'service' ? "border-gx-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]" : "border-gx-cyan/30 hover:border-gx-cyan/70"
                      )}
                      onClick={() => {
                        setActivePaneMode('service');
                        document.getElementById('custom-service-input')?.focus();
                      }}
                    >
                      <div className="flex-1 flex items-center overflow-x-auto no-scrollbar whitespace-nowrap h-full">
                        {selectedServices.length === 0 && customServiceText === "" && (
                          <span className="text-[11px] text-white/20 absolute pointer-events-none">选择服务项目或输入...</span>
                        )}
                        {selectedServices.map((s, index) => {
                          const staff = staffs.find(st => st.id === s.assignedEmployeeId);
                          const textColor = staff ? staff.color : '#ffffff'; // 未指定时字体为亮白色
                          
                          return (
                            <div key={s.id} className="flex items-center shrink-0">
                              <span 
                                className="text-[11px] font-bold tracking-wide transition-colors"
                                style={{ 
                                  color: textColor,
                                  textShadow: staff ? `0 0 8px ${textColor}60` : '0 0 8px rgba(255,255,255,0.3)'
                                }}
                              >
                                {s.name}
                              </span>
                              {(index < selectedServices.length - 1 || customServiceText !== "") && (
                                <span className="text-white/20 px-1 text-[10px] font-bold">·</span>
                              )}
                            </div>
                          );
                        })}
                        {/* 透明的自由文本输入框，紧跟在胶囊流后面 */}
                        <input
                          id="custom-service-input"
                          type="text"
                          value={customServiceText}
                          onChange={(e) => setCustomServiceText(e.target.value)}
                          className="bg-transparent border-none outline-none text-[11px] text-white font-bold flex-1 min-w-[60px] p-0 m-0 leading-tight placeholder:text-transparent shrink-0"
                          placeholder={selectedServices.length > 0 ? "" : " "}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white font-bold italic font-mono tracking-widest uppercase">会员信息</label>
                    <div 
                      className={cn(
                        "bg-black/40 border rounded-lg p-2 h-[38px] flex items-center gap-2 cursor-pointer transition-all shadow-[0_0_10px_rgba(0,240,255,0.05)]",
                        activePaneMode === 'member' ? "border-gx-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]" : "border-gx-cyan/30 hover:border-gx-cyan/70"
                      )}
                      onClick={() => setActivePaneMode('member')}
                    >
                      <User className={cn("w-3 h-3", activePaneMode === 'member' ? "text-gx-cyan" : "text-gx-cyan/70")} />
                      <input 
                        type="text" 
                        placeholder="姓名/卡号/电话" 
                        className="bg-transparent border-none outline-none text-[11px] w-full placeholder:text-white/20 text-white cursor-pointer"
                        value={memberInfo}
                        onChange={(e) => setMemberInfo(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* 时间与持续时间 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white font-bold italic font-mono tracking-widest uppercase">预约日期</label>
                    <div 
                      className={cn(
                        "bg-black/40 border rounded-lg p-2 h-[38px] flex justify-between items-center text-[11px] cursor-pointer transition-all shadow-[0_0_10px_rgba(0,240,255,0.05)] text-white",
                        activePaneMode === 'date' ? "border-gx-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]" : "border-gx-cyan/30 hover:border-gx-cyan/70"
                      )}
                      onClick={() => setActivePaneMode('date')}
                    >
                      <span>{selectedDate}</span>
                      <CalendarIcon className={cn("w-3 h-3", activePaneMode === 'date' ? "text-gx-cyan" : "text-gx-cyan/70")} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white font-bold italic font-mono tracking-widest uppercase">开始时间</label>
                    <div 
                      className={cn(
                        "bg-black/40 border rounded-lg p-2 h-[38px] flex justify-between items-center text-[11px] cursor-pointer transition-all shadow-[0_0_10px_rgba(0,240,255,0.05)] text-white",
                        activePaneMode === 'time' ? "border-gx-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]" : "border-gx-cyan/30 hover:border-gx-cyan/70"
                      )}
                      onClick={() => setActivePaneMode('time')}
                    >
                      <span>{selectedTime}</span>
                      <Clock className={cn("w-3 h-3", activePaneMode === 'time' ? "text-gx-cyan" : "text-gx-cyan/70")} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white font-bold italic font-mono tracking-widest uppercase">服务时长</label>
                    <div 
                      className={cn(
                        "bg-black/40 border rounded-lg p-2 h-[38px] flex justify-between items-center text-[11px] cursor-pointer transition-all shadow-[0_0_10px_rgba(0,240,255,0.05)]",
                        activePaneMode === 'duration' ? "border-gx-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)] text-white" : "border-gx-cyan/30 hover:border-gx-cyan/70 text-white/60"
                      )}
                      onClick={() => setActivePaneMode('duration')}
                    >
                      <span className={durationOffset !== 0 ? "text-gx-cyan font-bold" : ""}>
                        {totalDuration > 0 ? `${totalDuration} MIN` : '-- MIN'}
                      </span>
                      <Clock className={cn("w-3 h-3", activePaneMode === 'duration' ? "text-gx-cyan" : "text-white/20")} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white font-bold italic font-mono tracking-widest uppercase">结束时间</label>
                    <div 
                      className="bg-black/40 border border-gx-cyan/30 rounded-lg p-2 h-[38px] flex justify-between items-center text-[11px] text-white/60 cursor-not-allowed"
                    >
                      <span>{getEndTime()}</span>
                      <Clock className="w-3 h-3 text-white/20" />
                    </div>
                  </div>
                </div>
              </section>

              {/* ===================== 右侧：动态监视器区 ===================== */}
              <section className="flex-1 h-full p-6 pb-20 relative z-10">
                {activePaneMode === 'service' && (
                  // 服务项目选择矩阵与人员分配
                  <div className="h-full flex flex-col">
                    {/* 分类标签导航 */}
                    <div className="flex gap-4 border-b border-white/10 pb-3 mb-4 overflow-x-auto no-scrollbar shrink-0">
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setActiveCategory(cat.id)}
                          className={cn(
                            "text-[10px] font-mono whitespace-nowrap transition-colors uppercase tracking-widest",
                            activeCategory === cat.id ? "text-gx-cyan font-bold" : "text-white/40 hover:text-white/80"
                          )}
                        >
                          {cat.name.replace(/^[^\w\u4e00-\u9fa5]+/, '').trim()}
                        </button>
                      ))}
                      {categories.length === 0 && (
                        <span className="text-[10px] text-white/30 font-mono">NO CATEGORIES FOUND</span>
                      )}
                    </div>

                    {/* 服务项目矩阵 (4列) */}
                    <div className="grid grid-cols-4 gap-3 flex-1 overflow-y-auto pr-2 custom-scrollbar content-start">
                      {services
                        .filter(s => s.categoryId === activeCategory)
                        .map(service => {
                          const isSelected = selectedServices.some(s => s.id === service.id);
                          const selectedData = selectedServices.find(s => s.id === service.id);
                          const assignedStaff = selectedData ? staffs.find(st => st.id === selectedData.assignedEmployeeId) : null;
                          const staffColor = assignedStaff ? assignedStaff.color : 'rgba(255,255,255,0.2)';

                          return (
                            <button
                              key={service.id}
                              onClick={() => handleToggleService(service)}
                              className={cn(
                                "p-3 rounded-xl border transition-all text-left flex flex-col justify-between h-[80px] group relative overflow-hidden",
                                isSelected 
                                  ? "bg-gx-cyan/10 border-gx-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]" 
                                  : "bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/5"
                              )}
                            >
                              {/* 员工颜色标识点 */}
                              {isSelected && (
                                <div 
                                  className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full shadow-sm transition-colors border border-black/50"
                                  style={{ backgroundColor: staffColor }}
                                />
                              )}
                              <span className={cn(
                                "text-xs font-bold line-clamp-2 leading-tight transition-colors pr-3",
                                isSelected ? "text-gx-cyan" : "text-white group-hover:text-white/90"
                              )}>
                                {service.name}
                              </span>
                              <span className={cn(
                                "text-[9px] font-mono",
                                isSelected ? "text-gx-cyan/60" : "text-white/30"
                              )}>
                                {service.duration} MIN
                              </span>
                            </button>
                          );
                        })}
                      {services.filter(s => s.categoryId === activeCategory).length === 0 && categories.length > 0 && (
                        <div className="col-span-4 text-center text-[10px] text-white/20 font-mono mt-10">
                          NO SERVICES IN THIS CATEGORY
                        </div>
                      )}
                    </div>

                    {/* 当前印章/笔刷选择栏 (Brush/Stamp Selection) - 固定在底部，始终显示 */}
                    <div className="border-t border-white/10 pt-3 mt-3 flex flex-col gap-3 shrink-0">
                      <div className="flex items-center justify-between">
                        {/* 左侧动态胶囊 (兼具指示器与重置按钮功能) 与已选项目快捷映射 */}
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar flex-1 pr-4">
                          <button 
                            onClick={() => handleSetBrush(null)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer shrink-0",
                              currentBrushEmployeeId === null
                                ? "bg-gx-cyan/10 border-gx-cyan/30 hover:bg-gx-cyan/20"
                                : "bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10"
                            )}
                            title="点击重置为未指定"
                          >
                            {currentBrushEmployeeId ? (
                              <>
                                <div 
                                  className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                                  style={{ backgroundColor: staffs.find(s => s.id === currentBrushEmployeeId)?.color }}
                                />
                                <span className="text-[11px] font-bold text-white uppercase tracking-widest">
                                  {staffs.find(s => s.id === currentBrushEmployeeId)?.name}
                                </span>
                              </>
                            ) : (
                              <>
                                <div className="w-2.5 h-2.5 rounded-full bg-gx-cyan shadow-[0_0_10px_rgba(0,240,255,0.3)]" />
                                <span className="text-[11px] font-bold text-gx-cyan uppercase tracking-widest">
                                  未指定
                                </span>
                              </>
                            )}
                          </button>

                          {/* 快捷映射：当前员工名下的已选项目 */}
                          <div className="flex items-center gap-2">
                            <AnimatePresence>
                              {selectedServices
                                .filter(s => s.assignedEmployeeId === currentBrushEmployeeId)
                                .map(s => {
                                  const isRetargeting = retargetingServiceId === s.id;
                                  const staffColor = currentBrushEmployeeId 
                                    ? staffs.find(st => st.id === currentBrushEmployeeId)?.color 
                                    : "#ffffff"; // 未指定时为亮白色

                                  return (
                                    <motion.button
                                      key={s.id}
                                      initial={{ opacity: 0, scale: 0.8, x: -10 }}
                                      animate={{ opacity: 1, scale: 1, x: 0 }}
                                      exit={{ opacity: 0, scale: 0.8, width: 0, padding: 0, margin: 0 }}
                                      onClick={() => handleRetargetService(s.id)}
                                      className={cn(
                                        "px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all border whitespace-nowrap",
                                        isRetargeting 
                                          ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-pulse" 
                                          : "bg-white/5 border-white/10 hover:bg-white/10"
                                      )}
                                      style={!isRetargeting ? { color: staffColor } : {}}
                                      title="点击进入重新分配模式"
                                    >
                                      {s.name}
                                    </motion.button>
                                  );
                                })}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-3 pb-2">
                        {staffs.map(staff => {
                          const isAssigned = currentBrushEmployeeId === staff.id;
                            
                          return (
                            <button
                              key={staff.id}
                              onClick={() => handleSetBrush(staff.id)}
                              className={cn(
                                "flex items-center gap-2 text-xs font-bold transition-colors whitespace-nowrap",
                                isAssigned ? "text-white" : "text-white/60 hover:text-white"
                              )}
                            >
                              <div 
                                className={cn("w-3 h-3 rounded-full transition-all", isAssigned ? "shadow-[0_0_10px_rgba(255,255,255,0.4)] scale-110" : "")}
                                style={{ backgroundColor: staff.color }}
                              />
                              <span className="uppercase">{staff.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {activePaneMode === 'member' && (
                  <div className="h-full flex flex-col items-center justify-center text-white/40 font-mono text-xs">
                    <User className="w-8 h-8 mb-4 text-gx-cyan/50" />
                    <span>MEMBER RADAR UI PLACEHOLDER</span>
                  </div>
                )}

                {activePaneMode === 'duration' && (
                  <div className="h-full flex flex-col items-center justify-center p-8 select-none touch-none relative">
                    {/* 全息视界区 (HUD Display) */}
                    <div className="flex flex-col items-center mb-6">
                      <motion.span 
                        key={totalDuration}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-[64px] font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-br from-white via-white/90 to-white/40 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] font-mono leading-none"
                      >
                        {totalDuration > 0 ? `${totalDuration} MIN` : '-- MIN'}
                      </motion.span>
                      
                      <div className="mt-4 flex items-center gap-4 text-[11px] font-mono tracking-widest text-white/60">
                        <span>BASE {baseDuration} MIN</span>
                        {durationOffset !== 0 && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span className={durationOffset > 0 ? "text-red-400" : "text-gx-cyan"}>
                              OFFSET {durationOffset > 0 ? '+' : ''}{durationOffset} MIN
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 矢量无极微操区 (Vector Micro-manipulation) - 移动到了中间 */}
                    <div 
                      className="w-full h-16 flex flex-col items-center justify-center cursor-ew-resize group z-20 mb-6"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setCenterDragStart(e.clientX);
                      }}
                      onPointerMove={(e) => {
                        if (centerDragStart !== null) {
                          const dx = e.clientX - centerDragStart;
                          // 增加触发阈值，每移动 20px，增加或减少 5 分钟
                          if (Math.abs(dx) >= 20) {
                            const step = Math.floor(dx / 20) * 5;
                            setDurationOffset(prev => prev + step);
                            setCenterDragStart(e.clientX); // Reset origin to allow continuous smooth sliding
                          }
                        }
                      }}
                      onPointerUp={(e) => {
                        if (centerDragStart !== null) {
                          e.currentTarget.releasePointerCapture(e.pointerId);
                          setCenterDragStart(null);
                        }
                      }}
                    >
                      <div className="flex items-center gap-4 text-gx-cyan/40 group-hover:text-gx-cyan transition-colors">
                        <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        <span className="text-[10px] font-mono tracking-[0.3em] uppercase">Drag to Adjust</span>
                        <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                      <div className="w-48 h-px bg-gradient-to-r from-transparent via-gx-cyan/30 to-transparent mt-3 group-hover:via-gx-cyan transition-all" />
                    </div>

                    {/* 脉冲微调阵列 (Quick Offset Tags) */}
                    <div className="w-full max-w-[400px] space-y-6 relative z-10">
                      {/* 缩减区 (提前) */}
                      <div className="flex justify-center gap-3">
                        {[-45, -30, -15].map(offset => (
                          <button
                            key={offset}
                            onClick={() => setDurationOffset(offset)}
                            className={cn(
                              "w-16 py-2 rounded-lg font-mono text-xs transition-all",
                              durationOffset === offset 
                                ? "bg-gx-cyan/10 text-gx-cyan shadow-[0_0_15px_rgba(0,255,255,0.3)] drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]" 
                                : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/80"
                            )}
                          >
                            {offset}
                          </button>
                        ))}
                      </div>

                      {/* 增加区 (延时) */}
                      <div className="flex justify-center gap-3">
                        {[15, 30, 45, 60].map(offset => (
                          <button
                            key={offset}
                            onClick={() => setDurationOffset(offset)}
                            className={cn(
                              "w-16 py-2 rounded-lg font-mono text-xs transition-all",
                              durationOffset === offset 
                                ? "bg-gx-cyan/10 text-gx-cyan shadow-[0_0_15px_rgba(0,255,255,0.3)] drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]" 
                                : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/80"
                            )}
                          >
                            +{offset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activePaneMode === 'date' && (
                  <div className="h-full flex flex-col pt-2 pb-10 overflow-y-auto custom-scrollbar pr-2">
                    {/* Header: Month and Year with glowing text */}
                    <div className="flex items-center justify-between mb-6 px-4 shrink-0">
                      <button className="text-white/40 hover:text-gx-cyan transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <span className="text-lg font-black tracking-[0.2em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/50">
                        MARCH 2026
                      </span>
                      <button className="text-white/40 hover:text-gx-cyan transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>

                    {/* Matrix: Gridless approach */}
                    <div className="flex-1 px-2 shrink-0">
                      {/* Weekdays */}
                      <div className="grid grid-cols-7 mb-4">
                        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                          <div key={day} className="text-center text-[10px] text-white/40 tracking-widest font-mono">
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Days */}
                      <div className="grid grid-cols-7 gap-y-4 gap-x-2">
                        {/* Actual days (1-31) */}
                        {[...Array(31)].map((_, i) => {
                          const day = i + 1;
                          const formattedDay = day.toString().padStart(2, '0');
                          const dateString = `2026/03/${formattedDay}`;
                          const isSelected = selectedDate === dateString;
                          const isToday = day === 7; // Mocking today
                          
                          return (
                            <button
                              key={day}
                              onClick={() => setSelectedDate(dateString)}
                              className={cn(
                                "relative h-10 flex flex-col items-center justify-center font-mono text-sm transition-all rounded-lg group",
                                isSelected 
                                  ? "text-gx-cyan border border-gx-cyan/50 shadow-[0_0_10px_rgba(0,255,255,0.2)] bg-gx-cyan/5" 
                                  : "text-white/90 hover:bg-white/5 border border-transparent"
                              )}
                            >
                              {formattedDay}
                              {/* Today pulse indicator */}
                              {isToday && !isSelected && (
                                <div className="absolute bottom-1 w-[3px] h-[3px] rounded-full bg-gx-cyan animate-pulse shadow-[0_0_4px_rgba(0,255,255,0.8)]" />
                              )}
                              {/* Saturation dots (Optional Business Logic Visual Indicator) */}
                              {!isSelected && day % 5 === 0 && (
                                <div className="absolute bottom-1 w-[3px] h-[3px] rounded-full bg-white/20" />
                              )}
                              {!isSelected && day % 12 === 0 && (
                                <div className="absolute bottom-1 w-[3px] h-[3px] rounded-full bg-red-500/50 shadow-[0_0_4px_rgba(255,0,0,0.5)]" />
                              )}
                            </button>
                          );
                        })}
                        {/* Next month days filler */}
                        {[...Array(4)].map((_, i) => (
                          <div key={`next-${i}`} className="h-10 flex items-center justify-center font-mono text-sm text-white/20">
                            {(i + 1).toString().padStart(2, '0')}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activePaneMode === 'time' && (
                  <div 
                    className="h-full flex flex-col items-center justify-center relative select-none pt-4 pb-12 touch-none cursor-ew-resize"
                    onPointerDown={(e) => {
                      // 只有当没有点击小时时，才启动全局 AM/PM 滑动
                      if (draggingHour === null) {
                        e.preventDefault();
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setCenterDragStart(e.clientX);
                      }
                    }}
                    onPointerMove={(e) => {
                      // 处理全局横滑切换 AM/PM
                      if (centerDragStart !== null && draggingHour === null) {
                        const dx = e.clientX - centerDragStart;
                        const threshold = 40; // 稍微调大一点阈值，防止太灵敏
                        if (dx > threshold && isAM) {
                          setIsAM(false);
                          setCenterDragStart(e.clientX);
                        } else if (dx < -threshold && !isAM) {
                          setIsAM(true);
                          setCenterDragStart(e.clientX);
                        }
                      }
                    }}
                    onPointerUp={(e) => {
                      if (centerDragStart !== null) {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                        setCenterDragStart(null);
                      }
                    }}
                  >
                    <div 
                      className="relative w-[360px] h-[360px] flex items-center justify-center group touch-none cursor-default"
                      onPointerMove={(e) => {
                        // 处理分钟的矢量拖拽 (D-Pad 逻辑)
                        if (draggingHour !== null && dragStartPos !== null) {
                          const dx = e.clientX - dragStartPos.x;
                          const dy = e.clientY - dragStartPos.y;
                          
                          // 设定一个触发阈值（死区），防止误触
                          const threshold = 15;
                          
                          if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
                            if (Math.abs(dx) > Math.abs(dy)) {
                              // 水平方向移动更多
                              setHoveredMinute(dx > 0 ? 15 : 45);
                            } else {
                              // 垂直方向移动更多
                              setHoveredMinute(dy > 0 ? 30 : 0);
                            }
                          } else {
                            // 在死区内，默认 00
                            setHoveredMinute(0);
                          }
                        }
                      }}
                      onPointerUp={() => {
                        if (draggingHour !== null) {
                          const min = hoveredMinute !== null ? hoveredMinute : 0;
                          setSelectedTime(`${draggingHour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
                        }
                        setDraggingHour(null);
                        setHoveredMinute(null);
                        setDragStartPos(null);
                      }}
                      onPointerLeave={() => {
                        if (draggingHour !== null) {
                          const min = hoveredMinute !== null ? hoveredMinute : 0;
                          setSelectedTime(`${draggingHour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
                        }
                        setDraggingHour(null);
                        setHoveredMinute(null);
                        setDragStartPos(null);
                      }}
                    >
                      {/* 外圈 (仅仅作为视觉水印，不参与交互) */}
                      <div className="absolute inset-0 rounded-full border border-white/5 pointer-events-none">
                        {[0, 15, 30, 45].map(min => {
                          const angle = (min / 60) * 360 - 90;
                          const rad = 180; // 从 150 放大到 180
                          const x = Math.cos(angle * Math.PI / 180) * rad;
                          const y = Math.sin(angle * Math.PI / 180) * rad;
                          const isHovered = hoveredMinute === min;
                          const isDragging = draggingHour !== null;

                          return (
                            <div
                              key={min}
                              className={cn(
                                "absolute w-12 h-12 -ml-6 -mt-6 rounded-full flex items-center justify-center font-mono text-xs transition-all duration-300",
                                isDragging ? "opacity-100" : "opacity-20",
                                isHovered 
                                  ? "text-gx-cyan scale-110 drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]" 
                                  : "text-white/20"
                              )}
                              style={{ left: '50%', top: '50%', transform: `translate(${x}px, ${y}px)` }}
                            >
                              {min.toString().padStart(2, '0')}
                            </div>
                          );
                        })}
                      </div>

                      {/* 移除连线 SVG */}

                      {/* 内圈 C 型轨道背景 */}
                      <svg className="absolute inset-[40px] w-[280px] h-[280px] pointer-events-none z-0">
                        <path 
                          d="M 41 239 A 140 140 0 1 1 239 239" 
                          fill="none" 
                          stroke="rgba(255,255,255,0.05)" 
                          strokeWidth="2" 
                          strokeDasharray="4 4"
                        />
                      </svg>

                      {/* 内圈 (小时星轨 - The Hour Ring) */}
                      <div className="absolute inset-[40px] z-20">
                        {Array.from({ length: 12 }).map((_, i) => {
                          const hr = isAM ? i : i + 12;
                          // C shape from 135 deg to 405 deg
                          const angle = 135 + i * (270 / 11);
                          const rad = 140; // 从 100 放大到 140
                          const x = Math.cos(angle * Math.PI / 180) * rad;
                          const y = Math.sin(angle * Math.PI / 180) * rad;
                          
                          const isSelectedHour = selectedTime.startsWith(hr.toString().padStart(2, '0'));
                          const isDraggingThis = draggingHour === hr;
                          
                          return (
                            <div
                              key={hr}
                              className={cn(
                                "absolute w-12 h-12 -ml-[24px] -mt-[24px] rounded-full flex items-center justify-center font-mono text-lg transition-all cursor-pointer font-bold",
                                isDraggingThis 
                                  ? "text-gx-cyan scale-125 drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]" 
                                  : isSelectedHour 
                                    ? "text-gx-cyan drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]" 
                                    : "text-white/90 hover:text-white hover:scale-110 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]"
                              )}
                              style={{ left: '50%', top: '50%', transform: `translate(${x}px, ${y}px)` }}
                              onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation(); // 防止触发中心区域的滑动
                                // 必须捕获指针，否则在触摸屏上滑动过快可能会丢失目标
                                e.currentTarget.setPointerCapture(e.pointerId);
                                setDraggingHour(hr);
                                setHoveredMinute(0); // 默认 00
                                setDragStartPos({ x: e.clientX, y: e.clientY });
                              }}
                              onPointerUp={(e) => {
                                e.currentTarget.releasePointerCapture(e.pointerId);
                              }}
                              // 支持纯点击选择整点
                              onClick={() => {
                                if (draggingHour === null) {
                                  setSelectedTime(`${hr.toString().padStart(2, '0')}:00`);
                                }
                              }}
                            >
                              {hr.toString().padStart(2, '0')}
                            </div>
                          );
                        })}
                      </div>

                      {/* 中心枢纽 (The Core) - 仅作展示 */}
                      <div 
                        className="absolute inset-[100px] rounded-full flex flex-col items-center justify-center z-10 pointer-events-none"
                      >
                        <motion.span 
                          key={isAM ? 'AM' : 'PM'} // 利用 key 触发动画
                          initial={{ opacity: 0, x: isAM ? -10 : 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-[48px] font-black tracking-widest text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] font-mono leading-none"
                        >
                          {draggingHour !== null 
                            ? `${draggingHour.toString().padStart(2, '0')}:${hoveredMinute !== null ? hoveredMinute.toString().padStart(2, '0') : '00'}`
                            : selectedTime
                          }
                        </motion.span>
                        
                        {/* AM/PM 状态指示器 (纯展示，点击事件也可以保留作为后备) */}
                        <div className="mt-5 pointer-events-auto">
                          <button 
                            className="px-5 py-2 rounded-full bg-black/40 border border-gx-cyan/30 text-xs text-gx-cyan font-bold tracking-widest transition-all shadow-[0_0_15px_rgba(0,255,255,0.1)] flex items-center gap-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsAM(!isAM);
                            }}
                          >
                            <div className={cn("w-2 h-2 rounded-full transition-all", isAM ? "bg-gx-cyan shadow-[0_0_5px_rgba(0,255,255,0.8)] scale-125" : "bg-white/20")} />
                            <span className={cn("transition-all", isAM ? "text-gx-cyan" : "text-white/40")}>AM</span>
                            <div className="w-px h-4 bg-white/20 mx-1" />
                            <span className={cn("transition-all", !isAM ? "text-gx-cyan" : "text-white/40")}>PM</span>
                            <div className={cn("w-2 h-2 rounded-full transition-all", !isAM ? "bg-gx-cyan shadow-[0_0_5px_rgba(0,255,255,0.8)] scale-125" : "bg-white/20")} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 操作提示 */}
                    <div className="absolute bottom-6 text-[10px] font-mono tracking-[0.3em] transition-all duration-300 flex flex-col items-center gap-1">
                      {draggingHour !== null ? (
                        <span className="text-gx-cyan animate-pulse">SWIPE TO SET MINUTES</span>
                      ) : (
                        <>
                          <span className="text-white/30">HOLD HOUR & SWIPE FOR MINUTES</span>
                          <span className="text-white/20 text-[8px]">SWIPE CENTER FOR AM/PM</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </main>

            {/* 底部悬浮按钮栏 (内部居中跨越双窗) */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50 pointer-events-auto">
              <button className="w-48 py-3 rounded-xl bg-gx-cyan text-black text-xs font-black tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(0,255,255,0.4)]">
                确认预约 / CONFIRM
              </button>
              <button 
                onClick={onClose}
                className="w-40 py-3 rounded-xl bg-black/60 border border-gx-cyan/30 text-white hover:border-gx-cyan transition-all font-mono text-[10px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(0,240,255,0.2)]"
              >
                取消 / CANCEL
              </button>
            </div>

            {/* Global styles for custom scrollbar */}
            <style jsx global>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 4px;
                height: 0px; /* Hide horizontal scrollbar */
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.02);
                border-radius: 4px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: rgba(6, 182, 212, 0.5);
              }
            `}</style>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
