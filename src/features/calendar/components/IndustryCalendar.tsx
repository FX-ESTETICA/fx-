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
import { useVisualSettings, CYBER_COLOR_DICTIONARY } from "@/hooks/useVisualSettings";
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
  const { settings: visualSettings } = useVisualSettings();
  
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

  // 控制左侧边栏显示状态
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // 移动端默认关闭，大屏可通过断点或 useEffect 控制，此处为了演示先默认关闭

  // 翻页逻辑：每页 5 个员工
  const [currentStaffPage, setCurrentStaffPage] = useState(0);
  const STAFFS_PER_PAGE = 5;

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

    let baseResources: MatrixResource[] = [];

    if (industry === 'medical' || industry === 'expert') {
      baseResources = [
        { id: '1', name: '张医生', role: '主任医师', avatar: '👨‍⚕️', themeColor: '#3b82f6' },
        { id: '2', name: '李医生', role: '副主任', avatar: '👩‍⚕️', themeColor: '#10b981' },
        { id: '3', name: '王专家', role: '资深专家', avatar: '👨‍🔬', themeColor: '#8b5cf6' },
        { id: '4', name: '赵医生', role: '主治医师', avatar: '👩‍🔬', themeColor: '#f59e0b' },
      ];
    } else {
      // 使用全局 staffs 状态，过滤掉离职员工
      baseResources = staffs
        .filter(s => s.status !== 'resigned')
        .map(s => ({
          id: s.id,
          name: s.name,
          role: s.role,
          avatar: s.frontendId ? '🔗' : '✂️',
          themeColor: s.color,
          status: (s.status === 'on_leave' ? 'away' : 'available') as "away" | "available" | "busy",
          metadata: {
            originalStatus: s.status
          }
        }));
    }

    // 分页截取逻辑 (Pagination)
    const startIndex = currentStaffPage * STAFFS_PER_PAGE;
    const paginatedResources = baseResources.slice(startIndex, startIndex + STAFFS_PER_PAGE);

    // 动态 No-Show 爽约列逻辑：
    // 在实际业务中，你应该去查询这一页的这几个员工，在今天是否有被标记为 no-show 的预约。
    // 这里我们作为沙盒演示，随机模拟如果有某个员工有爽约，就在末尾追加一列
    const hasNoShowInThisPage = paginatedResources.some(_res => Math.random() > 0.8); // 20% 概率触发爽约列
    
    if (hasNoShowInThisPage) {
      paginatedResources.push({
        id: 'NO_SHOW_COL',
        name: 'NO',
        role: '爽约名单',
        themeColor: '#ef4444', // 红色预警
        status: 'busy',
        metadata: {
          isNoShowColumn: true,
          originalStatus: 'busy'
        }
      });
    }

    return paginatedResources;
  }, [industry, staffs, isMounted, currentStaffPage]);

  // 表头翻页手势处理
  const handleHeaderPanEnd = (_e: any, info: any) => {
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      // 向左滑，下一页
      setCurrentStaffPage(prev => prev + 1);
    } else if (info.offset.x > swipeThreshold) {
      // 向右滑，上一页
      setCurrentStaffPage(prev => Math.max(0, prev - 1));
    }
  };

  return (
    <div className="flex h-full w-full bg-transparent overflow-hidden">
      {/* 幽灵隐匿结界 (Phantom Fade Protocol) */}
      <motion.div 
        className="flex h-full w-full flex-col md:flex-row absolute inset-0"
        initial={false}
        animate={{ 
          opacity: isBookingModalOpen ? 0 : 1,
          scale: isBookingModalOpen ? 0.95 : 1,
          filter: isBookingModalOpen ? 'blur(10px)' : 'blur(0px)',
          pointerEvents: isBookingModalOpen ? 'none' : 'auto'
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
      {/* [SIDEBAR] 左侧控制中心 (Side Control Hub) - App Shell 固定宽度 */}
      <AnimatePresence initial={false}>
        {isAdmin && isSidebarOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            onPanEnd={(_e, info) => {
              if (info.offset.x < -30 || info.velocity.x < -300) {
                setIsSidebarOpen(false);
              }
            }}
            className="bg-transparent flex flex-col relative z-20 shrink-0 overflow-hidden whitespace-nowrap absolute md:relative top-0 left-0 h-full bg-black/90 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none"
          >
            <div className="w-[260px] h-full flex flex-col">
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

          {/* 行业切换区 (已移除，移至底部时钟下方) */}
          <div className="p-8 space-y-6 pt-0">
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
          <div className="mt-auto p-8 flex flex-col items-center justify-center opacity-80 hover:opacity-100 transition-opacity relative w-full">
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
                
                {/* 底部功能按钮组 (全透明) */}
                <div className="flex items-center gap-4 mt-8 w-full">
                  {/* 行业切换按钮 */}
                  <button
                    onClick={cycleIndustry}
                    className="group flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-transparent text-white/60 hover:text-white text-xs font-black uppercase tracking-widest transition-all"
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={industry}
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 10, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-2"
                      >
                        {dna.iconComp && <dna.iconComp className="w-4 h-4" />}
                        <span>{dna.label}</span>
                      </motion.div>
                    </AnimatePresence>
                    <ChevronRight className="w-3 h-3 opacity-40 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* 配置入口按钮 */}
                  <button 
                    onClick={() => setIsConfigOpen(true)}
                    className="p-3 bg-transparent text-white/60 hover:text-white transition-all group shrink-0 flex items-center justify-center"
                    title="全局运营配置 (Nebula Config Hub)"
                  >
                    <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                  </button>
                </div>
              </>
            ) : (
              <div className="h-[88px] flex items-center justify-center">
                <span className="text-white/20 text-xs font-mono animate-pulse">SYNCING...</span>
              </div>
            )}
          </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

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
              <div className="px-4 md:px-6 py-3 flex items-center justify-between bg-transparent">
                <div className="flex items-center gap-4 md:gap-6">
                  <div 
                    className="flex items-baseline gap-3 md:gap-4 cursor-pointer group hover:opacity-80 transition-opacity"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    title="点击切换左侧边栏"
                  >
                    <h3 className="text-3xl md:text-4xl font-black tracking-[0.1em] md:tracking-[0.15em] leading-none bg-gradient-to-br from-white via-slate-200 to-slate-400 bg-clip-text text-transparent font-mono" style={{ textShadow: '0 0 15px rgba(255, 255, 255, 0.7)' }}>
                      {currentDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} {currentDate.getDate()}
                    </h3>
                    <div className="flex flex-col">
                      <span className="text-xs md:text-sm font-mono tracking-[0.2em] md:tracking-[0.4em] uppercase transition-all bg-gradient-to-br from-white via-slate-300 to-slate-500 bg-clip-text text-transparent group-hover:via-white group-hover:to-slate-300" style={{ textShadow: '0 0 10px rgba(255, 255, 255, 0.4)' }}>
                        {currentDate.getFullYear()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Desktop controls */}
                <div className="hidden md:flex items-center gap-4">
                  <div className="flex bg-transparent rounded-xl p-1 border border-white/10">
                    <button
                      onClick={() => {
                        const modes = ['day', 'week', 'month'] as const;
                        const currentIndex = modes.indexOf(viewMode);
                        setViewMode(modes[(currentIndex + 1) % modes.length]);
                      }}
                      className="px-6 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all bg-gx-cyan text-black shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.5)] w-20 text-center"
                    >
                      {viewMode}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleNavigate('prev')}
                      className="p-2 hover:bg-cyan-900/30 rounded-lg text-cyan-400/60 hover:text-cyan-200 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setCurrentDate(new Date())}
                      className="px-4 py-2 text-[10px] font-black rounded-lg hover:bg-cyan-900/30 transition-all text-cyan-400/60 hover:text-cyan-200 tracking-widest" style={{ textShadow: '0 0 10px rgba(0, 240, 255, 0.4)' }}
                    >
                      {getTodayLabel()}
                    </button>
                    <button 
                      onClick={() => handleNavigate('next')}
                      className="p-2 hover:bg-cyan-900/30 rounded-lg text-cyan-400/60 hover:text-cyan-200 transition-all"
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
                  <div className="w-[60px] md:w-20 shrink-0 flex items-center justify-center z-10 bg-transparent">
                  </div>
                  
                  {/* 右侧滚动：员工卡片横向滚动区 (采用 CSS Grid 强制对齐) */}
                    <motion.div 
                      ref={headerScrollRef}
                      className="flex-1 overflow-hidden no-scrollbar touch-none"
                      onPanEnd={handleHeaderPanEnd}
                    >
                    <div 
                      className="grid h-full w-full"
                      style={{
                        gridTemplateColumns: `repeat(${resources.length}, minmax(0, 1fr))` // 极度压缩，平分屏幕
                      }}
                    >
                      {resources.map(res => (
                        <div key={res.id} className={cn("w-full h-full flex items-center justify-center relative group", res.metadata?.originalStatus === 'on_leave' ? 'opacity-50' : '')}>
                          <div className="flex flex-col items-center justify-center leading-none bg-transparent w-full px-1">
                            <span className={cn(
                              "text-[11px] md:text-[15px] font-black tracking-widest transition-all truncate uppercase w-full text-center mix-blend-screen",
                              res.metadata?.isNoShowColumn 
                                ? "text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" 
                                : CYBER_COLOR_DICTIONARY[visualSettings.staffNameColorTheme].className
                            )}>
                              {res.name}
                            </span>
                            <div className="flex items-center gap-1 mt-1.5 justify-center w-full">
                              <span className={cn(
                                "text-[8px] md:text-[9px] font-mono font-bold uppercase tracking-widest truncate transition-colors",
                                res.metadata?.isNoShowColumn ? "text-red-400/60" : "text-cyan-400/40 group-hover:text-cyan-400/80"
                              )}>{res.role}</span>
                              {res.metadata?.originalStatus === 'on_leave' && (
                                <span className="px-1 py-0.5 rounded text-[8px] bg-yellow-500/20 text-yellow-500 leading-none shadow-[0_0_10px_rgba(234,179,8,0.3)] hidden md:inline-block">休假</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
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
            {/* 交互式矩阵渲染层 */}
            <div className="h-full relative overflow-hidden z-10">
                {dna.pivot === "resource" && viewMode === "day" && (
                  <EliteResourceMatrix 
                    industry={industry} 
                    dna={dna} 
                    resources={resources} 
                    operatingHours={operatingHours} 
                    onHorizontalScroll={handleMatrixHorizontalScroll}
                    matrixScrollRef={matrixScrollRef}
                    onGridClick={() => setIsBookingModalOpen(true)}
                    onDateSwipe={(direction) => handleNavigate(direction)}
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
              
              {/* 非日视图且非资源类型时回退到网格 */}
              {viewMode !== "day" && dna.pivot !== "timeline" && dna.pivot !== "resource" && (
                <div className="p-12 h-full flex items-center justify-center text-white/5 font-black text-4xl uppercase tracking-[1em] relative z-20">
                  即将推出
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* 移动端专属：全息赛博控制胶囊 (Holographic Cyber Capsule) */}
        <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-2.5 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.8)]">
          <div className="flex bg-transparent rounded-xl p-0.5 border border-white/10">
            <button
              onClick={() => {
                const modes = ['day', 'week', 'month'] as const;
                const currentIndex = modes.indexOf(viewMode);
                setViewMode(modes[(currentIndex + 1) % modes.length]);
              }}
              className="px-4 py-1 text-[10px] font-black uppercase rounded-lg transition-all bg-gx-cyan text-black shadow-[0_0_15px_rgba(0,240,255,0.4)] w-16 text-center"
            >
              {viewMode}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={() => handleNavigate('prev')}
              className="p-1.5 hover:bg-cyan-900/30 rounded-lg text-cyan-400/60 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-[10px] font-black rounded-lg hover:bg-cyan-900/30 transition-all text-cyan-400/80 tracking-widest" style={{ textShadow: '0 0 10px rgba(0, 240, 255, 0.4)' }}
            >
              {getTodayLabel()}
            </button>
            <button 
              onClick={() => handleNavigate('next')}
              className="p-1.5 hover:bg-cyan-900/30 rounded-lg text-cyan-400/60 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          </div>
        </div>
      </motion.div>

      {/* 注入星云配置中枢抽屉 (需在结界之外，不受透明度影响) */}
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

      {/* 注入极致双窗预约界面 (必须在结界之外，以保持清晰呈现) */}
      <DualPaneBookingModal 
        isOpen={isBookingModalOpen} 
        onClose={() => setIsBookingModalOpen(false)} 
      />
    </div>
  );
};
