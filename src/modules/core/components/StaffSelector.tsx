import React from 'react'
import { Settings2, RefreshCw, Star, UserCheck, Clock, ShieldCheck, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IndustryType } from '../types/omni-flow'

export interface Staff {
  id: string;
  name: string;
  color?: string;
  role?: string; // 角色：如 'Master', 'Junior'
  status?: 'available' | 'busy' | 'away'; // 实时状态
  specialty?: string; // 专长
}

interface StaffSelectorProps {
  staffMembers: Staff[];
  selectedStaffId: string;
  selectedStaffIds: string[];
  involvedStaffIds: string[];
  isDesignatedMode: boolean;
  onStaffClick: (staffId: string) => void;
  onDesignatedModeToggle: () => void;
  onAverageDistribution?: () => void;
  getStaffColorClass: (id: string, type: 'bg' | 'text' | 'border') => string;
  label?: string;
  designatedLabel?: string;
  averageLabel?: string;
  distributingLabel?: string;
  className?: string;
  industryType?: IndustryType;
}

// 获取行业相关的角色图标
const getRoleIcon = (role?: string, industryType: IndustryType = 'beauty') => {
  if (!role) return null;
  
  const roleLower = role.toLowerCase();
  if (roleLower.includes('master') || roleLower.includes('高级')) return <Star className="w-2 h-2 text-amber-400 fill-amber-400" />;
  if (roleLower.includes('junior') || roleLower.includes('助理')) return <Zap className="w-2 h-2 text-blue-400" />;
  return <ShieldCheck className="w-2 h-2 text-emerald-400" />;
};

/**
 * 原子组件：技师选择器
 * 纯视图逻辑，负责渲染技师列表和选择状态
 */
export const StaffSelector: React.FC<StaffSelectorProps> = ({
  staffMembers,
  selectedStaffId,
  selectedStaffIds,
  involvedStaffIds,
  isDesignatedMode,
  onStaffClick,
  onDesignatedModeToggle,
  onAverageDistribution,
  getStaffColorClass,
  label = "选择技师",
  designatedLabel = "指定分配",
  averageLabel = "平均分配",
  distributingLabel = "分配中",
  className,
  industryType = 'beauty'
}) => {
  return (
    <div className={cn("space-y-3 antialiased", className)}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <label className="text-[9px] md:text-[10px] font-black italic text-white uppercase tracking-widest [text-shadow:0_1px_1px_rgba(0,0,0,0.8),0_0_0.5px_rgba(0,0,0,1)]">
            {label}
          </label>
          <span className="text-[7px] text-zinc-500 font-bold uppercase tracking-tighter">AI 智能资源匹配已就绪</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDesignatedModeToggle()
            }}
            className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold transition-all border",
              isDesignatedMode 
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]" 
                : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white/60"
            )}
          >
            <div className={cn("w-1.5 h-1.5 rounded-full", isDesignatedMode ? "bg-emerald-400 animate-pulse" : "bg-white/20")} />
            <span>{designatedLabel}</span>
          </button>

          {selectedStaffIds.length > 1 && onAverageDistribution && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onAverageDistribution()
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[8px] font-bold text-white/60 hover:text-white transition-colors border border-white/5"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>{averageLabel}</span>
            </button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {staffMembers.map((staff) => {
          const isActive = selectedStaffId === staff.id
          const isInvolved = involvedStaffIds.includes(staff.id) || selectedStaffIds.includes(staff.id)
          const orderIndex = selectedStaffIds.indexOf(staff.id)
          
          // 模拟 AI 状态：部分员工忙碌
          const isBusy = staff.status === 'busy' || (staff.id.charCodeAt(0) % 5 === 0);

          return (
            <button
              key={staff.id}
              type="button"
              onClick={() => onStaffClick(staff.id)}
              className={cn(
                "relative w-full py-2.5 rounded-xl text-[10px] font-black italic tracking-widest uppercase truncate px-1 border-2 transition-all flex flex-col items-center justify-center gap-0.5 overflow-hidden group",
                isActive 
                  ? `${getStaffColorClass(staff.id, 'bg')} border-white/40 text-white shadow-[0_0_15px_rgba(255,255,255,0.15)] scale-[1.02] z-10` 
                  : isInvolved
                    ? `bg-white/10 text-white ${staff.color || 'border-white/40'}`
                    : "bg-white/[0.02] border-white/5 text-white/40 hover:bg-white/[0.05] hover:border-white/10 hover:text-white/60"
              )}
            >
              {/* Background Glow for Active */}
              {isActive && (
                <div className="absolute inset-0 bg-white/10 blur-sm animate-pulse opacity-50" />
              )}

              <div className="flex items-center gap-1 relative z-10">
                {getRoleIcon(staff.role, industryType)}
                {staff.name}
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-1 mt-0.5 relative z-10">
                <div className={cn(
                  "w-1 h-1 rounded-full",
                  isBusy ? "bg-rose-500 shadow-[0_0_3px_rgba(244,63,94,0.8)]" : "bg-emerald-500 shadow-[0_0_3px_rgba(16,185,129,0.8)]"
                )} />
                <span className="text-[6px] font-bold opacity-40 group-hover:opacity-100 transition-opacity">
                  {isBusy ? 'BUSY' : 'READY'}
                </span>
              </div>

              {orderIndex !== -1 && (
                <div className={cn(
                  "absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shadow-lg border border-white/20 z-20",
                  getStaffColorClass(staff.id, 'bg')
                )}>
                  {orderIndex + 1}
                </div>
              )}
              
              {isDesignatedMode && isActive && (
                <div className="absolute -bottom-1 left-0 right-0 flex justify-center z-20">
                  <div className="bg-emerald-400 text-[6px] text-zinc-900 px-1 rounded-sm font-black leading-tight animate-bounce">
                    {distributingLabel}
                  </div>
                </div>
              )}
            </button>
          )
        })}
        <button 
          type="button"
          className="w-full py-2 rounded-xl text-[10px] font-black bg-white/5 text-zinc-600 hover:text-white hover:bg-white/10 flex items-center justify-center border border-dashed border-white/10 transition-all hover:border-white/20"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
