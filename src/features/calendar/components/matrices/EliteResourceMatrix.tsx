"use client";

import { useMemo, useRef, UIEvent } from "react";
import { cn } from "@/utils/cn";
import { motion } from "framer-motion";
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
  onDateSwipe?: (direction: 'prev' | 'next') => void; // 传递日期切换事件
}

// 模拟数据：暂时清空以支持真实配置
const MOCK_BOOKINGS: any[] = [];

/**
 * EliteResourceMatrix (专家音轨矩阵) - 引入液态时间轴算法
 */
export const EliteResourceMatrix = ({ industry, dna, resources, operatingHours, onGridClick, matrixScrollRef, onDateSwipe }: EliteResourceMatrixProps) => {
  const currentTime = new Date();
  const currentHour = currentTime.getHours();

  // --- 核心算法：24小时连续时间轴 (24h Continuous Timeline) ---
  const liquidTimeSlots = useMemo(() => {
    // 强制渲染 0 到 23 小时
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
        // 标记是否在营业时间内，方便后续进行视觉区分（如非营业时间变暗）
        isOvertime: !(operatingHours || []).some(p => hour >= p.start && hour < p.end)
      });
    }
    return slots;
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
    // 横向同步顶部员工列表 (已废弃，表头不再接受被动滚动，改为翻页)
    // if (onHorizontalScroll) {
    //   onHorizontalScroll(e.currentTarget.scrollLeft);
    // }
  };

  // 矩阵区的手势接管：滑动切换日期
  const handleMatrixPanEnd = (_e: any, info: any) => {
    // 防止纵向滚动误触横向翻页
    if (Math.abs(info.offset.y) > Math.abs(info.offset.x)) return;

    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      onDateSwipe?.('next');
    } else if (info.offset.x > swipeThreshold) {
      onDateSwipe?.('prev');
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-transparent">
      {/* 纵向时间轴固定列 (带流动发光) */}
      <div className="w-[60px] md:w-20 flex flex-col relative shrink-0">
        <div 
          ref={timeColumnRef}
          className="flex-1 overflow-hidden relative pointer-events-none"
        >
          {liquidTimeSlots.map((slot, idx) => (
            <div key={slot.hour} className="h-20 flex items-start justify-start pl-2.5 relative group pt-2">
              <span className={cn(
                "font-mono transition-all duration-500 text-[13px]",
                slot.hour === currentHour 
                  ? "font-black scale-110 bg-gradient-to-br from-white via-gx-cyan to-white bg-[length:200%_auto] animate-[gradient_2s_linear_infinite] bg-clip-text text-transparent drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] [text-shadow:0_0_15px_rgba(0,240,255,0.6)] mix-blend-screen" 
                  : "font-bold tracking-widest bg-gradient-to-b from-white via-cyan-200 to-cyan-600/80 bg-clip-text text-transparent mix-blend-screen hover:scale-110"
              )} style={slot.hour !== currentHour ? { textShadow: '0 0 15px rgba(0, 240, 255, 0.5)' } : {}}>
                {slot.label}
              </span>
              {/* 如果是断点（例如 11点下一个是 15点），显示折叠提示 */}
              {idx < liquidTimeSlots.length - 1 && liquidTimeSlots[idx + 1].hour - slot.hour > 1 && (
                <div className="absolute bottom-[-1px] left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-gx-cyan/40 to-transparent flex items-center justify-center z-10">
                  <div className="w-1 h-1 rounded-full bg-gx-cyan shadow-[0_0_5px_rgba(0,240,255,0.8)]" />
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
      <motion.div 
        ref={actualMatrixRef}
        onScroll={handleMatrixScroll}
        onPanEnd={handleMatrixPanEnd}
        className="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth relative no-scrollbar touch-pan-y"
      >
        <div className="min-w-fit flex flex-col h-full w-full">
          {/* 矩阵主体 (音轨背景) */}
          <div className="relative pb-24 w-full">
            {liquidTimeSlots.map((slot) => (
              <div 
                key={slot.hour} 
                className="grid h-20 relative group/row w-full"
                style={{
                  gridTemplateColumns: `repeat(${resources.length}, minmax(0, 1fr))`, // 彻底放弃固定宽度，强制平分屏幕
                  width: '100%'
                }}
              >
                {resources.map((res: MatrixResource) => {
                  // 查找当前资源在当前小时的预约
                  const booking = MOCK_BOOKINGS.find(b => b.resourceId === res.id && Math.floor(b.startHour) === slot.hour);

                  return (
                    <div 
                      key={res.id} 
                      className="w-full h-full group hover:bg-white/[0.01] transition-colors relative px-4 cursor-pointer snap-center"
                      onClick={onGridClick}
                    >
                      {/* 渲染预约块 */}
                      {booking && (
                        <EliteBookingBlock 
                          title={industry === 'medical' && booking.title.includes('套餐') ? '常规诊疗' : booking.title}
                          time={`${booking.startHour}:00 - ${booking.startHour + booking.durationHours}:00`}
                          client={booking.client}
                          color={res.metadata?.isNoShowColumn ? 'text-red-500' : dna.themeColor}
                          accent={res.metadata?.isNoShowColumn ? 'red' : dna.accent}
                          height={`h-[${Math.max(60, booking.durationHours * 80)}px]`} 
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
