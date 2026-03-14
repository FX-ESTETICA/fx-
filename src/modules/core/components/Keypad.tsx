import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';

interface KeypadProps {
  onNumberClick: (num: number) => void;
  onClearClick: () => void;
  onBackspaceClick: () => void;
  className?: string;
}

export const Keypad: React.FC<KeypadProps> = ({
  onNumberClick,
  onClearClick,
  onBackspaceClick,
  className
}) => {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
  
  const KeyButton = ({ children, onClick, className }: { children: React.ReactNode, onClick: () => void, className?: string }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-14 rounded-xl bg-white/5 hover:bg-white/10 text-xl font-black italic text-white transition-all active:scale-90 border border-white/5 flex items-center justify-center",
        className
      )}
    >
      {children}
    </button>
  );

  return (
    <div className={cn("grid grid-cols-3 gap-3 px-4", className)}>
      {/* 1, 2, 3 */}
      {[1, 2, 3].map(num => (
        <KeyButton key={num} onClick={() => onNumberClick(num)}>
          {num}
        </KeyButton>
      ))}
      
      {/* Clear Button */}
      <KeyButton 
        onClick={onClearClick}
        className="bg-rose-500/20 text-rose-500 border-rose-500/20 hover:bg-rose-500/30"
      >
        C
      </KeyButton>

      {/* 4, 5, 6 */}
      {[4, 5, 6].map(num => (
        <KeyButton key={num} onClick={() => onNumberClick(num)}>
          {num}
        </KeyButton>
      ))}

      {/* Backspace Button */}
      <KeyButton onClick={onBackspaceClick}>
        <ChevronLeft className="w-6 h-6" />
      </KeyButton>

      {/* 7, 8, 9, 0 - special layout if needed, but we can just map them */}
      {[7, 8, 9, 0].map(num => (
        <KeyButton key={num} onClick={() => onNumberClick(num)}>
          {num}
        </KeyButton>
      ))}
    </div>
  );
};

interface KeypadDisplayProps {
  label: string;
  value: string;
  symbol?: string;
  className?: string;
}

export const KeypadDisplay: React.FC<KeypadDisplayProps> = ({
  label,
  value,
  symbol = "¥",
  className
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center space-y-2", className)}>
      <span className="text-[10px] font-black italic text-white/40 uppercase tracking-[0.4em]">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-3xl font-black italic text-white/20">{symbol}</span>
        <span className="text-6xl font-black italic text-white tracking-tighter">
          {value || '0'}
        </span>
      </div>
    </div>
  );
};
