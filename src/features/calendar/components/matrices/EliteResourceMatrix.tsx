"use client";

import { useMemo, useRef, UIEvent } from "react";
import { cn } from "@/utils/cn";
import { IndustryType, IndustryDNA, MatrixResource } from "../../types";
import { EliteBookingBlock } from "./EliteBookingBlock";
import { OperatingHour } from "../IndustryCalendar";

export interface EliteResourceMatrixProps {
  industry: IndustryType;
  dna: IndustryDNA;
  resources: MatrixResource[];
  operatingHours: OperatingHour[];
  onHorizontalScroll?: (scrollLeft: number) => void;
  onGridClick?: () => void;
  matrixScrollRef?: React.Ref<HTMLDivElement>;
}

// 模拟数据：暂时清空以支持真实配置
const MOCK_BOOKINGS: any[] = [];

/**
 * EliteResourceMatrix (专家音轨矩阵) - 引入液态时间轴算法
 */
export const EliteResourceMatrix = ({ industry, dna, resources, operatingHours, onHorizontalScroll, onGridClick, matrixScrollRef }: EliteResourceMatrixProps) => {
  const currentTime = new Date();
  const currentHour = currentTime.getHours();

  // --- 核心算法：液态弹性时间轴 (Liquid Timeline Generator) ---
  const liquidTimeSlots = useMemo(() => {
    const timeSet = new Set<number>();

    // 1. 注入基础营业时间
    if (operatingHours && Array.isArray(operatingHours)) {
      operatingHours.forEach(period => {
        for (let i = period.start; i < period.end; i++) {
          timeSet.add(i);
        }
      });
    }

    // 2. 碰撞检测：扫描所有预约，如果预约跨越了非营业时间，强行撑开
    MOCK_BOOKINGS.forEach(booking => {
      const endHour = Math.ceil(booking.startHour + booking.durationHours);
      for (let i = Math.floor(booking.startHour); i < endHour; i++) {
        timeSet.add(i);
      }
    });

    // 3. 排序并生成最终渲染槽
    return Array.from(timeSet).sort((a, b) => a - b).map(hour => ({
      hour,
      label: `${hour.toString().padStart(2, '0')}:00`,
      // 判断是否是“被强行撑开的休息时间”
      isOvertime: !(operatingHours || []).some(p => hour >= p.start && hour < p.end)
    }));
  }, [operatingHours]);

  // 使用 ref 来同步左右两侧的垂直滚动
  const timeColumnRef = useRef<HTMLDivElement>(null);
  const internalMatrixRef = useRef<HTMLDivElement>(null);
  const actualMatrixRef = matrixScrollRef || internalMatrixRef;

  const handleMatrixScroll = (e: UIEvent<HTMLDivElement>) => {
    // 垂直同步时间轴
    if (timeColumnRef.current) {
      timeColumnRef.current.scrollTop = e.currentTarget.scrollTop;
    }
    // 横向同步顶部员工列表
    if (onHorizontalScroll) {
      onHorizontalScroll(e.currentTarget.scrollLeft);
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-transparent">
      {/* 纵向时间轴固定列 (带流动发光) */}
      <div className="w-24 flex flex-col relative shrink-0">
        <div 
          ref={timeColumnRef}
          className="flex-1 overflow-hidden relative pointer-events-none"
        >
          {liquidTimeSlots.map((slot, idx) => (
            <div key={slot.hour} className="h-16 flex items-start justify-center relative group pt-2">
              <span className={cn(
                "text-sm font-mono transition-all duration-500",
                slot.hour === currentHour ? "text-gx-cyan font-black scale-110" : "text-white font-bold group-hover:text-gx-cyan"
              )}>
                {slot.label}
              </span>
              {/* 如果是断点（例如 11点下一个是 15点），显示折叠提示 */}
              {idx < liquidTimeSlots.length - 1 && liquidTimeSlots[idx + 1].hour - slot.hour > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[8px] text-white/20 font-mono tracking-widest bg-black px-2 z-10">
                  ...
                </div>
              )}
              {slot.hour === currentHour && (
                <div className="absolute left-0 right-0 top-3 h-px bg-gx-cyan/30 shadow-[0_0_15px_rgba(0,240,255,0.5)] z-10" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 横向专家音轨矩阵 */}
      <div 
        ref={actualMatrixRef}
        onScroll={handleMatrixScroll}
        className="flex-1 overflow-x-auto overflow-y-auto scroll-smooth relative no-scrollbar"
      >
        <div className="min-w-fit flex flex-col h-full">
          {/* 矩阵主体 (音轨背景) */}
          <div className="relative pb-24">
            {liquidTimeSlots.map((slot) => (
              <div 
                key={slot.hour} 
                className="grid h-16 relative group/row"
                style={{
                  gridTemplateColumns: `repeat(${resources.length}, minmax(200px, 1fr))`
                }}
              >
                {resources.map((res: MatrixResource) => {
                  // 查找当前资源在当前小时的预约
                  const booking = MOCK_BOOKINGS.find(b => b.resourceId === res.id && Math.floor(b.startHour) === slot.hour);

                  return (
                    <div 
                      key={res.id} 
                      className="w-full h-full group hover:bg-white/[0.01] transition-colors relative px-4 cursor-pointer"
                      onClick={onGridClick}
                    >
                      {/* 渲染预约块 */}
                      {booking && (
                        <EliteBookingBlock 
                          title={industry === 'medical' && booking.title.includes('套餐') ? '常规诊疗' : booking.title}
                          time={`${booking.startHour}:00 - ${booking.startHour + booking.durationHours}:00`}
                          client={booking.client}
                          color={dna.themeColor}
                          accent={dna.accent}
                          height={`h-[${Math.max(60, booking.durationHours * 64)}px]`} 
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
