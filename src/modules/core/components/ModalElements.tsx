import React from 'react';
import { cn } from '@/lib/utils';

interface LabeledContainerProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
}

export const LabeledContainer: React.FC<LabeledContainerProps> = ({
  label,
  children,
  className,
  labelClassName
}) => {
  return (
    <div className={cn("space-y-1.5 antialiased", className)}>
      <label className={cn(
        "text-[9px] md:text-[10px] font-black italic text-white uppercase tracking-widest [text-shadow:0_1px_1px_rgba(0,0,0,0.8),0_0_0.5px_rgba(0,0,0,1)]",
        labelClassName
      )}>
        {label}
      </label>
      {children}
    </div>
  );
};

interface ModalHeaderProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  children,
  className
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center mb-2 space-y-1 antialiased relative", className)}>
      <h2 className="text-xl font-black italic tracking-[0.4em] text-white [text-shadow:0_1px_1px_rgba(0,0,0,0.8),0_0_0.5px_rgba(0,0,0,1)]">
        {title}
      </h2>
      {children}
    </div>
  );
};

interface ModalContainerProps {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
  maxWidth?: string;
}

export const ModalContainer: React.FC<ModalContainerProps> = ({
  children,
  onClose,
  className,
  maxWidth = "max-w-2xl"
}) => {
  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-transparent"
      onClick={onClose}
    >
      <div 
        className={cn(
          "w-full max-h-[92vh] bg-transparent border border-white/20 rounded-[2rem] shadow-2xl overflow-y-auto overscroll-y-contain ring-1 ring-white/5 no-scrollbar",
          maxWidth,
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

interface ModalInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  containerClassName?: string;
  overlay?: React.ReactNode;
}

export const ModalInput: React.FC<ModalInputProps> = ({
  className,
  containerClassName,
  overlay,
  ...props
}) => {
  return (
    <div className={cn("relative group w-full bg-white/[0.01] border-none rounded-xl focus-within:ring-2 focus-within:ring-white/10 shadow-inner overflow-hidden", containerClassName)}>
      <input 
        className={cn(
          "w-full bg-transparent border-none px-3 py-2.5 text-white focus:outline-none text-xs placeholder:text-zinc-500 relative z-10",
          overlay && "text-transparent caret-transparent",
          className
        )}
        {...props}
      />
      {overlay && (
        <div className="absolute inset-0 flex items-center px-3 pointer-events-none z-0 overflow-hidden">
          {overlay}
        </div>
      )}
    </div>
  );
};

interface ModalSelectBoxProps {
  value: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
  className?: string;
  isActive?: boolean;
}

export const ModalSelectBox: React.FC<ModalSelectBoxProps> = ({
  value,
  onClick,
  icon,
  className,
  isActive
}) => {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "w-full bg-white/[0.01] border-none rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white/10 text-xs shadow-inner cursor-pointer flex items-center justify-between transition-all",
        isActive ? "bg-white/20 ring-1 ring-white/30" : "hover:bg-white/10",
        className
      )}
    >
      <span className="font-bold">{value}</span>
      {icon}
    </div>
  );
};
