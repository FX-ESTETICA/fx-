import React from 'react'
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudDrizzle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WeatherViewProps {
  temp: number
  code: number
  className?: string
}

/**
 * 原子组件：天气显示视图
 * 纯视图组件，仅负责渲染温度和图标
 */
export const WeatherView: React.FC<WeatherViewProps> = ({
  temp,
  code,
  className
}) => {
  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="w-4 h-4 md:w-5 md:h-5 text-amber-400" />
    if (code >= 1 && code <= 3) return <Cloud className="w-4 h-4 md:w-5 md:h-5 text-zinc-300" />
    if (code === 45 || code === 48) return <Cloud className="w-4 h-4 md:w-5 md:h-5 text-zinc-400" />
    if (code >= 51 && code <= 55) return <CloudDrizzle className="w-4 h-4 md:w-5 md:h-5 text-sky-400" />
    if (code >= 61 && code <= 65) return <CloudRain className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
    if (code >= 71 && code <= 75) return <CloudSnow className="w-4 h-4 md:w-5 md:h-5 text-white" />
    if (code >= 80 && code <= 82) return <CloudRain className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
    if (code >= 95) return <CloudLightning className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
    return <Cloud className="w-4 h-4 md:w-5 md:h-5 text-zinc-300" />
  }

  return (
    <div className={cn("flex items-center gap-1.5 md:gap-2 px-1 group transition-all", className)}>
      <div className="scale-90 md:scale-100 opacity-80">
        {getWeatherIcon(code)}
      </div>
      <span 
        className="text-[10px] md:text-xs font-black italic text-white group-hover:text-white transition-colors" 
        style={{ fontFamily: 'var(--font-orbitron)' }}
      >
        {temp}°C
      </span>
    </div>
  )
}
