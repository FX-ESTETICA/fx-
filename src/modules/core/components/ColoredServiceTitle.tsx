import React from 'react'
import { cn } from '@/lib/utils'

interface ColoredServiceTitleProps {
  title: string
  items?: Array<{
    text: string
    colorClass?: string
  }>
  placeholder?: string
  className?: string
}

/**
 * 原子组件：带颜色渲染的服务标题
 * 支持将 "项目1, 项目2" 这种格式按颜色区分显示
 */
export const ColoredServiceTitle: React.FC<ColoredServiceTitleProps> = ({
  title,
  items,
  placeholder = "输入服务项目...",
  className
}) => {
  if (!title) {
    return <span className="text-zinc-500 text-xs">{placeholder}</span>;
  }

  // 如果传入了预处理好的 items，直接渲染
  if (items && items.length > 0) {
    return (
      <div className={cn("flex items-center text-xs font-bold whitespace-pre", className)}>
        {items.map((item, idx) => (
          <span key={idx} className={cn("font-black italic tracking-wider", item.colorClass)}>
            {item.text}
          </span>
        ))}
      </div>
    )
  }

  // 默认逻辑：简单的文本拆分（为了向下兼容，也可以保留一些基础逻辑）
  const parts = title.split(/(\s*,\s*)/);

  return (
    <div className={cn("flex items-center text-xs font-bold whitespace-pre", className)}>
      {parts.map((part, idx) => {
        const isSeparator = part.includes(',');
        if (isSeparator) {
          return <span key={idx} className="text-white/40">{part}</span>;
        }
        return (
          <span key={idx} className="font-black italic tracking-wider">
            {part}
          </span>
        );
      })}
    </div>
  );
}
