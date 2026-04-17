import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { OperatingHour, DailyOverride, ShopOperatingConfig, resolveOperatingHours } from "./IndustryCalendar";

interface TodayOverrideControllerProps {
  todayOverride: DailyOverride | null;
  onChange: (newOverride: DailyOverride | null) => void;
  title?: string;
  subtitle?: string;
  variant?: "glass" | "minimal";
  fullConfig?: ShopOperatingConfig | null; // 传入完整的引擎配置，用于推算“今天的默认真实时间”
}

const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => i);

export const TodayOverrideController = ({ 
  todayOverride, 
  onChange,
  title = "今日临时覆盖 (Today's Override)",
  subtitle = "最高优先级控制舱。此处的修改将瞬间同步至智控页，并仅对【今天】生效。",
  variant = "glass",
  fullConfig
}: TodayOverrideControllerProps) => {
  const todayDateStr = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');

  // 计算今天的“本应如此”的默认时间
  const today = new Date();
  // 注意：计算默认时间时，必须忽略掉当前的 todayOverride，否则会死循环
  const defaultHoursConfig = fullConfig ? { ...fullConfig, todayOverride: null } : null;
  const { hours: defaultHours, isClosed: defaultIsClosed } = resolveOperatingHours(today, defaultHoursConfig);

  // === 核心逻辑：UI 降维与数据升维 ===
  // 无论有没有 todayOverride，用户在 UI 上看到的都是“当前生效时间” (effectiveHours)
  const effectiveHours = todayOverride ? todayOverride.hours : defaultHours;
  const isEffectiveClosed = todayOverride ? todayOverride.isClosed : defaultIsClosed;

  const handleToggleClosedToday = (currentlyClosed: boolean) => {
    if (currentlyClosed) {
      // 本来是关门，现在要开门。用 defaultHours 或默认 9-18
      onChange({ 
        date: todayDateStr, 
        isClosed: false, 
        hours: defaultHours.length > 0 ? defaultHours : [{ id: `hour_${Date.now()}_${Math.random()}`, start: 9, end: 18 }] 
      });
    } else {
      // 本来是开门，现在要关门
      onChange({ date: todayDateStr, isClosed: true, hours: [] });
    }
  };

  const handleAddEffectiveHour = () => {
    const baseHours = todayOverride ? todayOverride.hours : defaultHours;
    const newOverride = { 
      date: todayDateStr, 
      isClosed: false, 
      hours: [...baseHours, { id: `hour_${Date.now()}_${Math.random()}`, start: 9, end: 18 }] 
    };
    onChange(newOverride);
  };

  const handleRemoveEffectiveHour = (id: string) => {
    const baseHours = todayOverride ? todayOverride.hours : defaultHours;
    const newOverride = { 
      date: todayDateStr, 
      isClosed: false, 
      hours: baseHours.filter(h => h.id !== id) 
    };
    onChange(newOverride);
  };

  const handleUpdateEffectiveHour = (id: string, field: 'start' | 'end', value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;
    
    const baseHours = todayOverride ? todayOverride.hours : defaultHours;
    const newOverride = { 
      date: todayDateStr, 
      isClosed: false, 
      hours: baseHours.map(h => h.id === id ? { ...h, [field]: numValue } : h) 
    };
    onChange(newOverride);
  };

  const handleClearTodayOverride = () => {
    onChange(null);
  };

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
            <button type="button" onClick={() => onRemove(hour.id)} className="text-white/20 hover:text-red-500 transition-colors p-1">
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  return (
    <div className={cn(
      "w-full space-y-4",
      variant === "glass" ? "p-4 rounded-2xl bg-black/40 border border-white/5 shadow-inner" : ""
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-gx-cyan flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gx-cyan opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gx-cyan"></span>
          </span>
          {title}
        </span>
        {todayOverride && (
          <button type="button" onClick={handleClearTodayOverride} className="text-[10px] font-bold text-white/40 hover:text-white transition-colors">
            清除覆盖 (恢复常规)
          </button>
        )}
      </div>
      {subtitle && (
        <p className="text-[10px] font-mono text-gx-cyan/60">
          {subtitle}
        </p>
      )}
      
      <div className={cn(
        "flex flex-col rounded-xl relative overflow-hidden",
        variant === "glass" ? "p-3 bg-black/80 border border-white/5" : "p-1 md:p-3 bg-transparent border-0 md:border border-white/5"
      )}>
        <div className="absolute top-0 left-0 w-1 h-full bg-gx-cyan" />
        <div className="flex items-center justify-between pl-2">
          <div className="flex items-center gap-3">
            <div className="text-xs font-mono font-bold text-white tracking-widest">{todayDateStr} (今天)</div>
            <button 
              type="button"
              onClick={() => handleToggleClosedToday(isEffectiveClosed)}
              className={cn("px-2 py-1 text-[9px] font-bold tracking-widest rounded-md transition-colors border", 
                isEffectiveClosed ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-gx-cyan/10 text-gx-cyan border-gx-cyan/30"
              )}
            >
              {isEffectiveClosed ? '关门 CLOSED' : '营业 OPEN'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {!isEffectiveClosed && (
              <button type="button" onClick={handleAddEffectiveHour} className="text-[10px] font-bold text-gx-cyan flex items-center gap-1 hover:text-white transition-colors">
                <Plus className="w-3 h-3" /> 时段
              </button>
            )}
          </div>
        </div>
        
        {!isEffectiveClosed ? (
          effectiveHours.length > 0 ? (
            renderTimeBlocks(
              effectiveHours,
              handleUpdateEffectiveHour,
              handleRemoveEffectiveHour
            )
          ) : (
            <div className="flex items-center justify-center p-3 mt-3 bg-white/5 rounded-xl border border-white/10 opacity-50 relative">
              <span className="text-[10px] font-bold text-white/40 tracking-widest">无营业时段</span>
            </div>
          )
        ) : (
          <div className="relative group cursor-pointer mt-3">
            <div className="flex items-center justify-center p-3 bg-white/5 rounded-xl border border-white/10 group-hover:border-gx-cyan/30 group-hover:bg-gx-cyan/5 transition-all opacity-50 hover:opacity-100">
              <span className="text-[10px] font-bold text-red-500 tracking-widest">今日休息 (CLOSED)</span>
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px] rounded-xl" onClick={() => handleToggleClosedToday(isEffectiveClosed)}>
                <span className="text-[10px] font-bold tracking-widest text-gx-cyan">点击恢复营业</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};