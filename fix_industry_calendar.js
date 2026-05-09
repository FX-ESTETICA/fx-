const fs = require('fs');

let content = fs.readFileSync('src/features/calendar/components/IndustryCalendar.tsx', 'utf8');
let original = content;

// 1. Ensure resolved themes are defined
const themeDefinitions = `
 const searchParams = useSearchParams();
 
 // 新增动态推导：彻底废弃 localStorage 颜色存储，全权由背景决定
 const isLightBg = visualSettings.calendarBgIndex !== 0;
 const resolvedTheme = isLightBg ? 'coreblack' : 'purewhite';
 const resolvedTimelineTheme = isLightBg ? 'coreblack' : 'whitegold';
`;

content = content.replace(/const searchParams = useSearchParams\(\);\s*/, themeDefinitions);

// 2. Replace all visualSettings.xxxColorTheme
content = content.replace(/visualSettings\?*\.headerTitleColorTheme/g, 'resolvedTheme');
content = content.replace(/visualSettings\?*\.staffNameColorTheme/g, 'resolvedTheme');
content = content.replace(/visualSettings\?*\.timelineColorTheme/g, 'resolvedTimelineTheme');

if (content !== original) {
  fs.writeFileSync('src/features/calendar/components/IndustryCalendar.tsx', content, 'utf8');
  console.log('Updated IndustryCalendar.tsx');
}
