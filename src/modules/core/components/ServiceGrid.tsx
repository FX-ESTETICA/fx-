import React from 'react'
import { cn } from '@/lib/utils'

export interface ServiceItem {
  name: string;
  price: number;
}

export interface ServiceCategory {
  title: string;
  items: ServiceItem[];
}

interface ServiceGridProps {
  categories: ServiceCategory[];
  newTitle: string;
  itemStaffMap: Record<string, string>;
  selectedStaffId: string;
  staffMembers: Array<{ id: string; name: string }>;
  editingEventId?: string;
  onToggleService: (serviceName: string) => void;
  getStaffColorClass: (staffId: string, type: 'text' | 'bg' | 'border') => string;
  className?: string;
}

/**
 * 原子组件：服务选择网格
 * 纯视图组件，渲染服务类别和具体项目
 */
export const ServiceGrid: React.FC<ServiceGridProps> = ({
  categories,
  newTitle,
  itemStaffMap,
  selectedStaffId,
  staffMembers,
  editingEventId = 'new',
  onToggleService,
  getStaffColorClass,
  className
}) => {
  const currentItems = newTitle.split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div className={cn("grid grid-cols-4 gap-2", className)}>
      {categories.map((category) => {
        const isCategorySelected = currentItems.includes(category.title);
        
        return (
          <div key={category.title} className="space-y-[1px]">
            {/* Category Header */}
            <div 
              onClick={() => onToggleService(category.title)}
              className={cn(
                "flex flex-col items-center justify-center pt-1 pb-0 px-2 group cursor-pointer relative overflow-hidden transition-all",
                isCategorySelected ? "opacity-100" : "opacity-60 hover:opacity-100"
              )}
            >
              <h4 className="text-[15px] font-black italic tracking-widest uppercase text-white [text-shadow:0_1px_1px_rgba(0,0,0,0.8),0_0_0.5px_rgba(0,0,0,1)] antialiased">
                {category.title}
              </h4>
              <div className={cn(
                "mt-[2px] h-[1.5px] transition-all duration-300",
                isCategorySelected ? "w-8 bg-white" : "w-4 bg-white/20 group-hover:w-8"
              )} />
            </div>
            
            {/* Sub Items */}
            <div className="flex flex-col gap-[1px]">
              {category.items.map((item) => {
                const itemIndex = currentItems.lastIndexOf(item.name);
                const isItemSeleted = itemIndex > -1;
                
                const itemStaffId = isItemSeleted 
                  ? (itemStaffMap[`${editingEventId}-${item.name}-${itemIndex}`] || itemStaffMap[item.name] || selectedStaffId)
                  : selectedStaffId;
                
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => onToggleService(item.name)}
                    className={cn(
                      "w-full py-1.5 px-2 rounded-lg text-[11px] font-bold tracking-wide subpixel-antialiased transition-colors",
                      isItemSeleted 
                        ? `${getStaffColorClass(itemStaffId, 'text')} bg-white/10 ring-1 ring-white/20`
                        : "bg-white/[0.01] text-white/90 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {item.name}
                  </button>
                )
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
