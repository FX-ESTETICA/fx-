import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CalendarEvent, StaffMember, getStaffColorClass } from '@/utils/calendar-constants';
import { EventCard as AtomicEventCard } from '@/modules/core/components/EventCard';
import { Star, Car, Utensils, Scissors } from 'lucide-react';

interface EventCardProps {
  event: CalendarEvent;
  mode: 'admin' | 'customer';
  isShort: boolean;
  isCompleted: boolean;
  isPending: boolean;
  onClick: (e: React.MouseEvent) => void;
  style: React.CSSProperties;
  lang: 'zh' | 'it';
  staffMembers: StaffMember[];
  I18N: any;
  height: number;
  memberDisplayId: string;
  staffId?: string;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  mode,
  isShort,
  isCompleted,
  isPending,
  onClick,
  style,
  lang,
  staffMembers,
  I18N,
  height,
  memberDisplayId,
  staffId
}) => {
  const services = (event.service_item || "").split(',').map((s: string) => s.trim()).filter(Boolean);
  const backgroundColor = event.bg_color || 'bg-blue-600';
  const borderColorClass = getStaffColorClass(staffId || 'NO', staffMembers, 'border');

  // --- Liquid UI Engine: 动态行业感知 ---
  const industryContext = event.context_snapshot?.industry_context || 'beauty';
  const isVip = !!(event.global_id || event.customer_id);

  // 根据行业动态生成增强型 Label
  const { displayLabel, Icon } = useMemo(() => {
    let label = memberDisplayId;
    let icon = null;

    const notes = event.notes || "";

    switch (industryContext) {
      case 'car_wash':
        // 优先使用原子化 snapshot 字段，彻底清理 notes 正则
        const plateNumber = event.context_snapshot?.plate_number;
        if (plateNumber) label = `🚗 ${plateNumber}`;
        icon = Car;
        break;
      case 'restaurant':
        // 优先使用原子化 snapshot 字段
        const tableNumber = event.context_snapshot?.table_number;
        if (tableNumber) label = `🍽️ ${tableNumber}号桌`;
        icon = Utensils;
        break;
      case 'beauty':
        icon = Scissors;
        break;
      default:
        break;
    }

    return { displayLabel: label, Icon: icon };
  }, [industryContext, memberDisplayId, event.notes]);

  return (
    <div className="relative group">
      <AtomicEventCard
        services={services}
        mode={mode}
        isShort={isShort}
        isCompleted={isCompleted}
        isPending={isPending}
        onClick={onClick}
        style={style}
        height={height}
        memberDisplayId={displayLabel}
        staffLabel={staffId}
        occupiedLabel={I18N[lang].occupied}
        backgroundColor={backgroundColor}
        borderColorClass={borderColorClass}
      />
      
      {/* 顶级视觉：全球服务护照 VIP 标识 */}
      {isVip && !isShort && height > 2 && (
        <div className="absolute -top-1 -right-1 z-20">
          <div className="bg-gradient-to-br from-amber-300 to-yellow-600 p-0.5 rounded-full shadow-lg ring-1 ring-white/50 animate-in zoom-in duration-300">
            <Star className="w-2.5 h-2.5 text-white fill-current" />
          </div>
        </div>
      )}

      {/* 行业特征图标 (仅在空间足够时显示) */}
      {!isShort && height > 3 && Icon && (
        <div className="absolute bottom-1 right-1 opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none">
          <Icon className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
};

