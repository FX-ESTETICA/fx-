"use client";

import { useVisualSettings } from "@/hooks/useVisualSettings";
import { FRONTEND_BACKGROUNDS } from "@/hooks/useBackground";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/utils/cn";
import Image from "next/image";

interface Props {
  className?: string;
}

export function FrontendThemeSwitcher({ className }: Props) {
  const { settings, updateSettings, isLoaded } = useVisualSettings();
  const t = useTranslations('NebulaConfigHub'); // Use NebulaConfigHub for translation "背景设定"

  if (!isLoaded) return null;

  const isLight = settings.frontendBgIndex !== 0; // A1 (0) is dark, others are light

  return (
    <div className={cn("w-full space-y-3", className)}>
      <h3 className={cn(
        "text-[10px] font-bold uppercase tracking-widest text-center",
        isLight ? "text-black/40" : "text-white/40"
      )}>
        {t('txt_203d7a')} {/* 背景设定 */}
      </h3>
      
      <div className="flex items-center justify-center gap-3 overflow-x-auto no-scrollbar px-2">
        {FRONTEND_BACKGROUNDS.map((src, index) => {
          const isActive = settings.frontendBgIndex === index;
          return (
            <div 
              key={`frontend-bg-${index}`}
              onClick={() => updateSettings({ frontendBgIndex: index })}
              className={cn(
                "relative shrink-0 w-16 h-10 rounded-lg cursor-pointer transition-all overflow-hidden border-2",
                isActive 
                  ? (isLight ? "border-black opacity-100" : "border-white opacity-100")
                  : cn("opacity-40 hover:opacity-80", isLight ? "border-black/10" : "border-white/10")
              )}
            >
              <Image 
                src={src === 'starry' ? '/images/backgrounds/A1.jpg' : src} 
                alt={`Theme ${index + 1}`} 
                fill 
                className="object-cover" 
              />
              {isActive && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <Check className={`w-3 h-3 ${isLight ? "text-black" : "text-white"}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
