import React from 'react';
import { cn } from '@/lib/utils';

interface StaffAvatarProps {
  avatar: string;
  className?: string;
}

export const StaffAvatar: React.FC<StaffAvatarProps> = ({
  avatar,
  className
}) => {
  return (
    <div className={cn(
      "w-9 h-9 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10 flex items-center justify-center shadow-lg transition-transform hover:scale-110",
      className
    )}>
      <span className="text-[10px] md:text-xs font-black text-white tracking-tighter">
        {avatar}
      </span>
    </div>
  );
};
