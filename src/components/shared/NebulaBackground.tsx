"use client";

import { useEffect } from "react";
import { useVisualSettings } from "@/hooks/useVisualSettings";
import { CALENDAR_BACKGROUNDS, FRONTEND_BACKGROUNDS } from "@/hooks/useBackground";
import { useActiveTab } from "@/hooks/useActiveTab";

// --- 主入口：壁纸调度控制器 ---
export function NebulaBackground() {
 const { settings } = useVisualSettings();
 const activeTab = useActiveTab();
 
 // 1. 世界顶端 SSR 同步架构：使用 useActiveTab 获得完美首帧
 const isCalendar = activeTab === 'calendar';

 const displayBgSource = isCalendar 
 ? CALENDAR_BACKGROUNDS[settings.calendarBgIndex] || CALENDAR_BACKGROUNDS[0]
 : FRONTEND_BACKGROUNDS[settings.frontendBgIndex] || FRONTEND_BACKGROUNDS[0];

 // 2. 动态同步 React 状态到原生 body 层，确保设置变更时壁纸实时更新
 useEffect(() => {
 if (typeof window !== 'undefined') {
 const actualSource = displayBgSource === 'starry' ? '/images/backgrounds/A1.jpg' : displayBgSource;
 document.body.style.backgroundImage = `url("${actualSource}")`;
 document.body.style.backgroundSize = 'cover';
 document.body.style.backgroundPosition = 'center';
 document.body.style.backgroundAttachment = 'fixed';
 document.body.style.backgroundRepeat = 'no-repeat';
 }
 }, [displayBgSource]);

 return null; // 彻底剥离 3D 渲染，仅作为静默的壁纸调度引擎
}
