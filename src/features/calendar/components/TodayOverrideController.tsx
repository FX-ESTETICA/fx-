import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { OperatingHour, DailyOverride, ShopOperatingConfig, resolveOperatingHours } from "./IndustryCalendar";
import { useVisualSettings } from "@/hooks/useVisualSettings";

interface TodayOverrideControllerProps {
  todayOverride: DailyOverride | null;
  onChange: (newOverride: DailyOverride | null) => void;
  variant?: "glass" | "minimal";
  fullConfig?: ShopOperatingConfig | null; // 传入完整的引擎配置，用于推算“今天的默认真实时间”
}

const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => i);

export const TodayOverrideController = ({ 
  todayOverride, 
  onChange,
  variant = "glass",
  fullConfig
}: TodayOverrideControllerProps) => {
  const { settings } = useVisualSettings();
  const isLight = settings.headerTitleColorTheme === 'coreblack';

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

  // 内部通用时间段渲染组件
  const renderTimeBlocks = (
    hoursList: OperatingHour[], 
    onUpdate: (id: string, field: 'start' | 'end', value: string) => void,
    onRemove: (id: string) => void
  ) => (
    <div className="space-y-1 w-full mt-2">
      <AnimatePresence>
        {hoursList.map((hour) => (
          <motion.div 
            key={hour.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 py-1 group overflow-hidden"
          >
            <div className="flex-1 flex items-center justify-center gap-4">
              <select 
                value={hour.start} 
                onChange={(e) => onUpdate(hour.id, 'start', e.target.value)}
                className={cn("bg-transparent text-sm md:text-base font-mono font-bold outline-none cursor-pointer appearance-none text-right w-16", isLight ? "text-black" : "text-white")} 
              >
                {HOUR_OPTIONS.map(h => (
                  <option key={`start-${h}`} value={h} className={cn(isLight ? "bg-white text-black" : "bg-black text-white")}>
                    {h.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
              <span className={cn("text-xs font-light", isLight ? "text-black/30" : "text-white/30")}>—</span>
              <select 
                value={hour.end}
                onChange={(e) => onUpdate(hour.id, 'end', e.target.value)}
                className={cn("bg-transparent text-sm md:text-base font-mono font-bold outline-none cursor-pointer appearance-none text-left w-16", isLight ? "text-black" : "text-white")} 
              >
                {HOUR_OPTIONS.map(h => (
                  <option key={`end-${h}`} value={h} className={cn(isLight ? "bg-white text-black" : "bg-black text-white")}>
                    {h.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
            {hoursList.length > 1 && (
              <button type="button" onClick={() => onRemove(hour.id)} className={cn("transition-colors p-1 opacity-0 group-hover:opacity-100", isLight ? "text-black/30 hover:text-red-500" : "text-white/30 hover:text-red-500")}>
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  return (
    <div className={cn(
      "w-full space-y-4",
      variant === "glass" ? "py-2" : ""
    )}>
      
      <div className={cn(
        "flex flex-col relative overflow-hidden",
        variant === "glass" ? "py-2 border-b" : "p-1 md:p-3 bg-transparent border-0 md:border",
        isLight ? "border-black/5" : "border-white/5"
      )}>
        <div className="absolute top-0 left-0 w-1 h-full " />
        <div className="flex items-center justify-between pl-4">
          <div className="flex items-center gap-4">
            <span className={cn("text-xs font-bold", isLight ? "text-black/80" : "text-white/80")}>今日营业时间</span>
            <button 
              type="button"
              onClick={() => handleToggleClosedToday(isEffectiveClosed)}
              className={cn("px-2 py-0.5 text-[9px] font-bold tracking-widest rounded-sm transition-colors", 
                isEffectiveClosed ? "bg-red-500/10 text-red-400" : " "
              )}
            >
              {isEffectiveClosed ? '关门' : '营业'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {!isEffectiveClosed && (
              <button 
                type="button" 
                onClick={handleAddEffectiveHour} 
                className={cn("text-[10px] font-bold flex items-center gap-1 transition-colors", isLight ? "text-black/40 hover:text-black" : "text-white/40 hover:text-white")}
              >
                <Plus className="w-3 h-3" /> 添加
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
            <div className={cn("flex items-center justify-center py-2 mt-2 border-t opacity-50 relative", isLight ? "border-black/5" : "border-white/5")}>
              <span className={cn("text-[10px] font-bold tracking-widest", isLight ? "text-black/40" : "text-white/40")}>无营业时段</span>
            </div>
          )
        ) : (
          <div className="relative group cursor-pointer mt-2">
            <div className={cn("flex items-center justify-center py-2 border-t transition-all opacity-50 hover:opacity-100", isLight ? "border-black/5" : "border-white/5")}>
              <span className="text-[10px] font-bold text-red-500 tracking-widest">今日休息</span>
              <div className={cn("absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity -[1px]", isLight ? "bg-white/40" : "bg-black/40")} onClick={() => handleToggleClosedToday(isEffectiveClosed)}>
                <span className="text-[10px] font-bold tracking-widest ">点击恢复营业</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};