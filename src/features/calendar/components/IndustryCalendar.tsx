"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Scissors, 
  Utensils, 
  Hotel,
  Stethoscope,
  Briefcase,
  Dumbbell,
  LucideIcon
} from "lucide-react";
import { IndustryType, IndustryDNA, MatrixResource } from "../types";
import { IndustryEngine } from "./IndustryEngine";

// --- 矩阵子组件导入 ---
import { EliteResourceMatrix } from "./matrices/EliteResourceMatrix";
import { EliteSpatialMatrix } from "./matrices/EliteSpatialMatrix";
import { TimelineMatrix } from "./matrices/TimelineMatrix";
import { CapacityFlow } from "./matrices/CapacityFlow";
import { EliteWeekMatrix } from "./matrices/EliteWeekMatrix";
import { EliteMonthMatrix } from "./matrices/EliteMonthMatrix";
import { NebulaConfigHub } from "./NebulaConfigHub";
import { Settings, LogIn } from "lucide-react";
import { useBackground } from "@/hooks/useBackground";
import { DualPaneBookingModal } from "@/features/booking/components/DualPaneBookingModal";

export interface OperatingHour {
  id: string;
  start: number;
  end: number;
}

// 默认营业时间配置
const DEFAULT_HOURS: OperatingHour[] = [
  { id: '1', start: 9, end: 12 },
  { id: '2', start: 15, end: 20 }
];

interface AuroraSchedulerProps {
  initialIndustry?: IndustryType;
  mode?: "admin" | "immersive";
}

export const IndustryCalendar = ({ initialIndustry = "beauty", mode = "admin" }: AuroraSchedulerProps) => {
  const [industry, setIndustry] = useState<IndustryType>(initialIndustry);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [realTime, setRealTime] = useState(new Date());
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // 新增背景控制 hook
  const { cycleBackground } = useBackground();
  
  // 共享的全局配置状态
  const [operatingHours, setOperatingHours] = useState<OperatingHour[]>(DEFAULT_HOURS);
  
  // 共享的人员列表状态
  const [staffs, setStaffs] = useState<any[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  // 共享的服务项目状态
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  // 初始化：从 localStorage 读取沙盒数据
  useEffect(() => {
    setIsMounted(true);
    try {
      const savedStaffs = localStorage.getItem('gx_sandbox_staffs');
      if (savedStaffs) {
        const parsed = JSON.parse(savedStaffs);
        setStaffs(parsed);
        // 默认全选所有在职员工
        setSelectedStaffIds(parsed.filter((s: any) => s.status !== 'resigned').map((s: any) => s.id));
      }
      const savedHours = localStorage.getItem('gx_sandbox_hours');
      if (savedHours) {
        setOperatingHours(JSON.parse(savedHours));
      }
      const savedCategories = localStorage.getItem('gx_sandbox_categories');
      if (savedCategories) {
        setCategories(JSON.parse(savedCategories));
      }
      const savedServices = localStorage.getItem('gx_sandbox_services');
      if (savedServices) {
        setServices(JSON.parse(savedServices));
      }
    } catch (e) {
      console.error('Failed to parse sandbox data:', e);
    }
  }, []);

  // 持久化：当数据变化时写入 localStorage
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('gx_sandbox_staffs', JSON.stringify(staffs));
    }
  }, [staffs, isMounted]);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('gx_sandbox_hours', JSON.stringify(operatingHours));
    }
  }, [operatingHours, isMounted]);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('gx_sandbox_categories', JSON.stringify(categories));
    }
  }, [categories, isMounted]);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('gx_sandbox_services', JSON.stringify(services));
    }
  }, [services, isMounted]);

  // 实时时钟更新
  useEffect(() => {
    const timer = setInterval(() => {
      setRealTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 用于同步表头与矩阵的横向滚动
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const matrixScrollRef = useRef<HTMLDivElement>(null); // Add ref for matrix to sync from header
  
  const handleMatrixHorizontalScroll = (scrollLeft: number) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollLeft;
    }
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      const step = direction === 'prev' ? -1 : 1;
      
      if (viewMode === 'day') {
        next.setDate(prev.getDate() + step);
      } else if (viewMode === 'week') {
        next.setDate(prev.getDate() + (step * 7));
      } else if (viewMode === 'month') {
        next.setMonth(prev.getMonth() + step);
      }
      return next;
    });
  };

  const getTodayLabel = () => {
    switch (viewMode) {
      case 'week': return '本周';
      case 'month': return '本月';
      default: return '今天';
    }
  };

  const isAdmin = mode === "admin";

  const cycleIndustry = () => {
    const types = Object.keys(industryDNAs) as IndustryType[];
    const currentIndex = types.indexOf(industry);
    const nextIndex = (currentIndex + 1) % types.length;
    setIndustry(types[nextIndex]);
  };

  // 行业 DNA 配置中心 - 升级版
  const industryDNAs: Record<IndustryType, IndustryDNA & { iconComp: LucideIcon }> = {
    beauty: {
      type: "beauty",
      pivot: "resource",
      label: "美业",
      themeColor: "text-gx-purple",
      accent: "purple",
      icon: "Scissors",
      iconComp: Scissors,
      slotUnit: 30,
      features: ["stylist_queue", "service_tags", "liquid_track"],
      metadata: { 
        specializationLabel: "资深技师",
        columnHeader: "服务技师",
        rowHeader: "预约时间",
        matrixStyle: "audio_track"
      }
    },
    medical: {
      type: "medical",
      pivot: "resource",
      label: "医疗",
      themeColor: "text-white",
      accent: "none",
      icon: "Stethoscope",
      iconComp: Stethoscope,
      slotUnit: 15,
      features: ["teeth_map", "doctor_shift", "expert_matrix"],
      metadata: { 
        specializationLabel: "主任医师",
        columnHeader: "诊疗专家",
        rowHeader: "诊疗时段",
        matrixStyle: "clinical_grid"
      }
    },
    dining: {
      type: "dining",
      pivot: "spatial",
      label: "餐饮",
      themeColor: "text-orange-500",
      accent: "gold",
      icon: "Utensils",
      iconComp: Utensils,
      slotUnit: 60,
      features: ["table_radar", "bill_summary", "spatial_mapping"],
      metadata: { 
        spatialDensity: 0.85,
        columnHeader: "座席编号",
        rowHeader: "用餐时段",
        matrixStyle: "radar_array"
      }
    },
    hotel: {
      type: "hotel",
      pivot: "timeline",
      label: "住宿",
      themeColor: "text-gx-cyan",
      accent: "cyan",
      icon: "Hotel",
      iconComp: Hotel,
      slotUnit: 1440,
      features: ["room_status", "stay_duration"],
      metadata: {
        columnHeader: "日期",
        rowHeader: "房号"
      }
    },
    expert: {
      type: "expert",
      pivot: "resource",
      label: "专家",
      themeColor: "text-blue-400",
      accent: "none",
      icon: "Briefcase",
      iconComp: Briefcase,
      slotUnit: 45,
      features: ["case_notes", "meeting_link"],
      metadata: { 
        specializationLabel: "资深专家",
        columnHeader: "咨询专家",
        rowHeader: "咨询时间"
      }
    },
    fitness: {
      type: "fitness",
      pivot: "capacity",
      label: "健身",
      themeColor: "text-green-400",
      accent: "none",
      icon: "Dumbbell",
      iconComp: Dumbbell,
      slotUnit: 60,
      features: ["workout_plan", "body_stats", "flow_tide"],
      metadata: { 
        flowThreshold: 45,
        columnHeader: "入场记录",
        rowHeader: "时间流"
      }
    },
    other: {
      type: "other",
      pivot: "resource",
      label: "常规",
      themeColor: "text-white/60",
      accent: "none",
      icon: "CalendarIcon",
      iconComp: CalendarIcon,
      slotUnit: 60,
      features: []
    }
  };

  const dna = useMemo(() => industryDNAs[industry], [industry]);

  const resources: MatrixResource[] = useMemo(() => {
    // 确保在客户端挂载前返回空，避免服务端渲染不一致
    if (!isMounted) return [];

    if (industry === 'medical' || industry === 'expert') {
      return [
        { id: '1', name: '张医生', role: '主任医师', avatar: '👨‍⚕️', themeColor: '#3b82f6' },
        { id: '2', name: '李医生', role: '副主任', avatar: '👩‍⚕️', themeColor: '#10b981' },
        { id: '3', name: '王专家', role: '资深专家', avatar: '👨‍🔬', themeColor: '#8b5cf6' },
        { id: '4', name: '赵医生', role: '主治医师', avatar: '👩‍🔬', themeColor: '#f59e0b' },
      ];
    }
    // 使用全局 staffs 状态，过滤掉离职员工
    return staffs
      .filter(s => s.status !== 'resigned')
      .map(s => ({
        id: s.id,
        name: s.name,
        role: s.role,
        avatar: s.frontendId ? '🔗' : '✂️',
        themeColor: s.color,
        status: s.status === 'on_leave' ? 'away' : 'available',
        metadata: {
          originalStatus: s.status
        }
      }));
  }, [industry, staffs]);

  return (
    <div className="flex animate-in fade-in duration-700 h-full w-full bg-transparent overflow-hidden flex-col md:flex-row">
      {/* [SIDEBAR] 左侧控制中心 (Side Control Hub) - App Shell 固定宽度 */}
      {isAdmin && (
        <aside className="w-72 bg-transparent flex flex-col relative z-20 shrink-0">
          {/* 品牌区 */}
          <div className="p-8 bg-transparent flex items-center justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer group" 
              onClick={cycleBackground}
              title="切换背景壁纸 (GX SYNC)"
            >
              <span className="text-3xl font-black tracking-tighter text-white">GX</span>
              <span className="text-3xl font-black tracking-tighter bg-gradient-to-r from-gx-cyan to-gx-cyan/40 bg-clip-text text-transparent group-active:animate-pulse">SYNC</span>
            </div>
            {/* GUEST 按钮移至此处 */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-mono tracking-tighter uppercase text-white/40 hover:bg-white/5 hover:text-white transition-all cursor-pointer">
              <LogIn className="w-3 h-3" />
              <span>Guest</span>
            </div>
          </div>

          {/* 行业切换区 */}
          <div className="p-8 space-y-6 pt-0">
            <div className="flex flex-col gap-2">
              <button
                onClick={cycleIndustry}
                className="group relative flex items-center justify-between w-full px-6 py-4 rounded-2xl bg-gx-cyan text-black text-xs font-black uppercase tracking-widest shadow-[0_0_30px_rgba(0,240,255,0.15)] hover:shadow-[0_0_40px_rgba(0,240,255,0.3)] transition-all overflow-hidden"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={industry}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-3"
                  >
                    {dna.iconComp && <dna.iconComp className="w-4 h-4" />}
                    <span>{dna.label}</span>
                  </motion.div>
                </AnimatePresence>
                <ChevronRight className="w-4 h-4 opacity-40 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* 核心统计 (Mock) */}
            <div className="grid grid-cols-1 gap-4 pt-8">
              {[
                { label: '今日预约', value: '24', trend: '+12%', color: 'text-gx-cyan' },
                { label: '待处理', value: '08', trend: 'Critical', color: 'text-red-500' },
                { label: '资源负荷', value: '85%', trend: 'High', color: 'text-orange-500' }
              ].map(stat => (
                <div key={stat.label} className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                  <span className="text-[9px] font-mono text-white font-bold uppercase tracking-widest">{stat.label}</span>
                  <div className="flex items-end justify-between mt-1">
                    <span className={cn("text-2xl font-black tracking-tighter", stat.color)}>{stat.value}</span>
                    <span className="text-[8px] font-mono text-white font-bold mb-1">{stat.trend}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 动态当前时间显示区 (居中置底) */}
          <div className="mt-auto p-8 flex flex-col items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
            {isMounted ? (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-mono font-black tracking-tighter bg-gradient-to-br from-white via-gray-300 to-gray-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                    {realTime.getHours().toString().padStart(2, '0')}:
                    {realTime.getMinutes().toString().padStart(2, '0')}
                  </span>
                  <span className="text-lg font-mono text-gray-400 animate-pulse">
                    {realTime.getSeconds().toString().padStart(2, '0')}
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mt-3">
                  System Time (Local)
                </span>
              </>
            ) : (
              <div className="h-[88px] flex items-center justify-center">
                <span className="text-white/20 text-xs font-mono animate-pulse">SYNCING...</span>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* [MAIN CONTENT] 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden h-full">
        {/* [CONTAINER GROUP] 置顶贴合容器组 (Triple-Axe Sticky Hub) */}
        <div className="shrink-0 z-40 flex flex-col gap-0 bg-transparent">
          <AnimatePresence mode="wait">
            <motion.div
              key={industry + viewMode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-0"
            >
              {/* [CONTAINER 2] 日期与视图控制栏 (Date & Navigation Bar) */}
              <div className="px-6 py-3 flex items-center justify-between bg-transparent">
                <div className="flex items-center gap-6">
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-3xl font-black tracking-tighter leading-none bg-gradient-to-br from-white via-white/90 to-white/20 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                      {currentDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} {currentDate.getDate()}
                    </h3>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono text-white/40 tracking-[0.2em] uppercase">
                        {currentDate.getFullYear()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex bg-transparent rounded-xl p-1 border border-white/10">
                    {(['day', 'week', 'month'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setViewMode(v)}
                        className={cn(
                          "px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all",
                          viewMode === v ? "bg-gx-cyan text-black shadow-lg" : "text-white hover:text-gx-cyan"
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsConfigOpen(true)}
                      className="p-2 mr-4 hover:bg-gx-cyan/10 rounded-lg text-gx-cyan transition-all shadow-[0_0_15px_rgba(0,240,255,0.1)] hover:shadow-[0_0_20px_rgba(0,240,255,0.3)]"
                      title="全局运营配置 (Nebula Config Hub)"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleNavigate('prev')}
                      className="p-2 hover:bg-white/5 rounded-lg text-white hover:text-gx-cyan transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setCurrentDate(new Date())}
                      className="px-4 py-2 text-[10px] font-black rounded-lg hover:bg-white/5 transition-all text-white hover:text-gx-cyan tracking-widest"
                    >
                      {getTodayLabel()}
                    </button>
                    <button 
                      onClick={() => handleNavigate('next')}
                      className="p-2 hover:bg-white/5 rounded-lg text-white hover:text-gx-cyan transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* [CONTAINER 3] 服务人员列 (Resource Column Header) / 员工筛选器 */}
              {viewMode === 'day' && dna.pivot === 'resource' && (
                <div className="flex bg-transparent h-14 overflow-hidden">
                  {/* 左侧固定：空位占位符，与下方时间轴对齐 */}
                  <div className="w-24 shrink-0 flex items-center justify-center z-10 bg-transparent">
                  </div>
                  
                  {/* 右侧滚动：员工卡片横向滚动区 (采用 CSS Grid 强制对齐) */}
                    <div 
                      ref={headerScrollRef}
                      className="flex-1 overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing no-scrollbar"
                      onScroll={(e) => {
                        if (matrixScrollRef.current) {
                          matrixScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
                        }
                      }}
                      onMouseDown={(e) => {
                        const ele = headerScrollRef.current;
                        if (!ele) return;
                        let startX = e.pageX - ele.offsetLeft;
                        let scrollLeft = ele.scrollLeft;
                        
                        const handleMouseMove = (e: MouseEvent) => {
                          e.preventDefault();
                          const x = e.pageX - ele.offsetLeft;
                          const walk = (x - startX) * 2;
                          ele.scrollLeft = scrollLeft - walk;
                        };
                        
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    >
                    <div 
                      className="grid h-full"
                      style={{
                        gridTemplateColumns: `repeat(${resources.length}, minmax(200px, 1fr))`
                      }}
                    >
                      {resources.map(res => (
                        <div key={res.id} className={cn("w-full h-full flex items-center justify-center relative group", res.metadata?.originalStatus === 'on_leave' ? 'opacity-50' : '')}>
                          <div className="flex flex-col items-center justify-center leading-none bg-transparent">
                            <span className="text-[13px] font-black text-white group-hover:text-gx-cyan transition-colors truncate">{res.name}</span>
                            <div className="flex items-center gap-1 mt-1.5">
                              <span className="text-[9px] font-mono text-white/40 font-bold uppercase tracking-widest truncate">{res.role}</span>
                              {res.metadata?.originalStatus === 'on_leave' && (
                                <span className="px-1 py-0.5 rounded text-[8px] bg-yellow-500/20 text-yellow-500 leading-none">休假</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {viewMode !== 'day' && dna.pivot === 'resource' && (
                <div className="flex bg-transparent px-6 py-4 items-center gap-4 overflow-x-auto no-scrollbar">
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest shrink-0">筛选人员 / Filter</span>
                  {resources.map(res => (
                    <button
                      key={res.id}
                      onClick={() => {
                        setSelectedStaffIds(prev => 
                          prev.includes(res.id) 
                            ? prev.filter(id => id !== res.id)
                            : [...prev, res.id]
                        );
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-all shrink-0 flex items-center gap-2",
                        selectedStaffIds.includes(res.id) 
                          ? "text-white" 
                          : "text-white/40 opacity-50"
                      )}
                    >
                      <div 
                        className="w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]"
                        style={{ backgroundColor: res.themeColor || '#fff', color: res.themeColor || '#fff' }}
                      />
                      {res.name}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={industry + viewMode + "content"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex-1 relative overflow-hidden"
          >
            {/* 动态矩阵渲染引擎 (Aurora Pivot Engine) */}
            <div className="h-full relative overflow-hidden">
              {/* 1. 高性能 GPU 渲染引擎 (R3F + WebGPU) */}
              <div className="absolute inset-0 z-0">
                <IndustryEngine />
              </div>

              {/* 2. 交互式 DOM 覆盖层 (Legacy/Interactions) */}
              <div className="relative z-10 h-full">
                {dna.pivot === "resource" && viewMode === "day" && (
                  <EliteResourceMatrix 
                    industry={industry} 
                    dna={dna} 
                    resources={resources} 
                    operatingHours={operatingHours} 
                    onHorizontalScroll={handleMatrixHorizontalScroll}
                    matrixScrollRef={matrixScrollRef}
                    onGridClick={() => setIsBookingModalOpen(true)}
                  />
                )}
                {dna.pivot === "resource" && viewMode === "week" && (
                  <EliteWeekMatrix 
                    industry={industry} 
                    dna={dna} 
                    resources={resources}
                    selectedStaffIds={selectedStaffIds}
                    operatingHours={operatingHours} 
                    currentDate={currentDate}
                    onGridClick={() => setIsBookingModalOpen(true)}
                    onDateClick={(date) => {
                      setCurrentDate(date);
                      setViewMode("day");
                    }}
                  />
                )}
                {dna.pivot === "resource" && viewMode === "month" && (
                  <EliteMonthMatrix 
                    industry={industry} 
                    dna={dna} 
                    resources={resources}
                    selectedStaffIds={selectedStaffIds}
                    currentDate={currentDate}
                    onGridClick={() => setIsBookingModalOpen(true)}
                    onDateClick={(date) => {
                      setCurrentDate(date);
                      setViewMode("day");
                    }}
                  />
                )}
                {dna.pivot === "spatial" && viewMode === "day" && (
                  <EliteSpatialMatrix industry={industry} dna={dna} />
                )}
                {dna.pivot === "timeline" && (
                  <TimelineMatrix />
                )}
                {dna.pivot === "capacity" && (
                  <CapacityFlow />
                )}
              </div>
              
              {/* 非日视图且非资源类型时回退到网格 */}
              {viewMode !== "day" && dna.pivot !== "timeline" && dna.pivot !== "resource" && (
                <div className="p-12 h-full flex items-center justify-center text-white/5 font-black text-4xl uppercase tracking-[1em] relative z-20">
                  即将推出
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* 注入星云配置中枢抽屉 */}
        <NebulaConfigHub 
          isOpen={isConfigOpen} 
          onClose={() => setIsConfigOpen(false)}
          industryLabel={industryDNAs[industry].label}
          operatingHours={operatingHours}
          onOperatingHoursChange={setOperatingHours}
          staffs={staffs}
          onStaffsChange={setStaffs}
          categories={categories}
          onCategoriesChange={setCategories}
          services={services}
          onServicesChange={setServices}
        />

        {/* 注入极致双窗预约界面 */}
        <DualPaneBookingModal 
          isOpen={isBookingModalOpen} 
          onClose={() => setIsBookingModalOpen(false)} 
        />
      </div>
    </div>
  );
};
