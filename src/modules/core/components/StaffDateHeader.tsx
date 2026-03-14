import React from 'react';
import { cn } from '@/lib/utils';

interface StaffDateHeaderProps {
  year: string;
  dateStr: string;
  weatherComponent?: React.ReactNode;
  onToggleSidebar?: () => void;
  isModalOpen?: boolean;
  className?: string;
}

export const StaffDateHeader: React.FC<StaffDateHeaderProps> = ({
  year,
  dateStr,
  weatherComponent,
  onToggleSidebar,
  isModalOpen = false,
  className
}) => {
  const renderGradientText = (text: string, isNumeric: boolean = true) => {
    return [...text].map((ch, i) => (
      <span
        key={`${text}-${i}`}
        className="bg-gradient-to-r from-zinc-500 via-white to-zinc-500 bg-[length:200%_auto] bg-clip-text text-transparent transition-opacity group-hover:opacity-80"
        style={{ 
          fontFamily: isNumeric ? 'var(--font-orbitron)' : 'var(--font-noto-sans-sc)' 
        }}
      >
        {ch}
      </span>
    ));
  };

  return (
    <div className={cn(
      "flex items-center gap-4 py-2",
      isModalOpen && "opacity-0 pointer-events-none",
      className
    )}>
      <div 
        onClick={onToggleSidebar}
        className={cn(
          "flex items-center text-lg md:text-2xl lg:text-3xl font-black tracking-[0.28em] select-none drop-shadow-[0_0_16px_rgba(255,255,255,0.35)] cursor-pointer group antialiased"
        )}
      >
        {renderGradientText(year, true)}
        
        {weatherComponent && (
          <div className="mx-4 flex items-center transition-transform group-hover:scale-110">
            {weatherComponent}
          </div>
        )}

        {[...dateStr].map((ch, i) => (
          <React.Fragment key={`date-frag-${i}`}>
            {/\d/.test(ch) 
              ? renderGradientText(ch, true) 
              : renderGradientText(ch, false)
            }
          </React.Fragment>
        ))}
      </div>
      <div className="h-[1px] flex-1 bg-gradient-to-r from-white/20 to-transparent" />
    </div>
  );
};
