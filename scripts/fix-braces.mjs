import fs from 'fs';

const fixFile = (path) => {
  let content = fs.readFileSync(path, 'utf-8');
  content = content.replace(/:\s*\{t\('([^']+)'\)\}/g, ": t('$1')");
  content = content.replace(/\?\s*\{t\('([^']+)'\)\}/g, "? t('$1')");
  content = content.replace(/confirm\(\{t\('([^']+)'\)\}\)/g, "confirm(t('$1'))");
  // Also check title={isActive ? {t('hash')} : {t('hash')}}
  content = content.replace(/title=\{([A-Za-z0-9_]+)\s*\?\s*\{t\('([^']+)'\)\}\s*:\s*\{t\('([^']+)'\)\}\}/g, "title={$1 ? t('$2') : t('$3')}");
  fs.writeFileSync(path, content);
}

fixFile('src/app/nebula/page.tsx');
fixFile('src/features/calendar/components/IndustryCalendar.tsx');
fixFile('src/features/calendar/components/NebulaConfigHub.tsx');

console.log('Fixed braces');