import fs from 'fs';

const fixFile = (filePath, namespace) => {
    let content = fs.readFileSync(filePath, 'utf-8');
    const regex = /(const\s+[A-Z][a-zA-Z0-9_]*\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*(?::\s*[^=]+)?\s*=>\s*\{|function\s+[A-Z][a-zA-Z0-9_]*\s*\([^)]*\)\s*\{)/g;
    
    content = content.replace(new RegExp(`\\s*const t = useTranslations\\('${namespace}'\\);\\n`, 'g'), '');
    
    content = content.replace(regex, (match) => {
        return match + `\n  const t = useTranslations('${namespace}');\n`;
    });
    fs.writeFileSync(filePath, content);
};

fixFile('src/features/calendar/components/NebulaConfigHub.tsx', 'NebulaConfigHub');
fixFile('src/app/nebula/page.tsx', 'nebula');
fixFile('src/app/spatial/page.tsx', 'spatial');
fixFile('src/features/calendar/components/IndustryCalendar.tsx', 'IndustryCalendar');
fixFile('src/features/analytics/components/AnalyticsDashboard.tsx', 'AnalyticsDashboard');

console.log('Fixed missing t');