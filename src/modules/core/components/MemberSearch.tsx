import React from 'react';
import { cn } from '@/lib/utils';

interface MemberSearchItemProps {
  name?: string;
  phone: string;
  card: string;
  onClick: () => void;
  className?: string;
}

export const MemberSearchItem: React.FC<MemberSearchItemProps> = ({
  name,
  phone,
  card,
  onClick,
  className
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors",
        className
      )}
    >
      <div className="flex flex-col items-start text-left">
        {name && <span className="text-xs font-bold text-white">{name}</span>}
        <span className="text-[10px] text-zinc-400">{phone}</span>
      </div>
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-white/60">
        {card}
      </span>
    </button>
  );
};

interface NewMemberButtonProps {
  query: string;
  label: string;
  onClick: () => void;
  className?: string;
}

export const NewMemberButton: React.FC<NewMemberButtonProps> = ({
  query,
  label,
  onClick,
  className
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full px-4 py-3 flex items-center gap-3 hover:bg-emerald-500/10 text-emerald-500 transition-colors",
        className
      )}
    >
      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
        <span className="text-lg">+</span>
      </div>
      <div className="flex flex-col items-start text-left">
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
        <span className="text-xs font-black">{query}</span>
      </div>
    </button>
  );
};

interface MemberSearchContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const MemberSearchContainer: React.FC<MemberSearchContainerProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn(
      "absolute top-full left-0 w-full mt-1 bg-white/[0.01] backdrop-blur-md border border-white/20 rounded-xl shadow-2xl z-50 max-h-40 overflow-y-auto overflow-x-hidden",
      className
    )}>
      {children}
    </div>
  );
};
