const fs = require('fs');

const files = [
  'c:/Users/xu/Desktop/GX/src/features/calendar/components/matrices/EliteMonthMatrix.tsx',
  'c:/Users/xu/Desktop/GX/src/features/calendar/components/matrices/EliteSpatialMatrix.tsx',
  'c:/Users/xu/Desktop/GX/src/features/calendar/components/matrices/TimelineMatrix.tsx',
  'c:/Users/xu/Desktop/GX/src/features/calendar/components/IndustryCalendar.tsx'
];

function replaceClassesInString(str) {
  return str.replace(/([a-z0-9:-]+)-gx-cyan(\/[0-9]+)?/g, (match, prefix, opacity) => {
    const op = opacity || '';
    // Assuming visualSettings is available
    return `\${visualSettings?.timelineColorTheme === 'coreblack' ? "${prefix}-[#8B7355]${op}" : "${prefix}-[#FDF5E6]${op}"}`;
  });
}

for (const path of files) {
  if (!fs.existsSync(path)) continue;
  let content = fs.readFileSync(path, 'utf8');

  // Remove all cyan shadow/drop-shadow entirely
  content = content.replace(/\s*shadow-\[0_0_[^\]]+rgba\((?:0,240,255|0,255,255|57,255,20)[^\]]+\)\]/g, '');
  content = content.replace(/\s*drop-shadow-\[0_0_[^\]]+rgba\((?:0,240,255|0,255,255|57,255,20)[^\]]+\)\]/g, '');

  // Convert double quotes containing gx-cyan to template literals
  content = content.replace(/"([^"]*?gx-cyan[^"]*?)"/g, (match, inner) => {
    return '`' + replaceClassesInString(inner) + '`';
  });

  // Convert single quotes containing gx-cyan to template literals
  content = content.replace(/'([^']*?gx-cyan[^']*?)'/g, (match, inner) => {
    return '`' + replaceClassesInString(inner) + '`';
  });

  // Process existing template literals containing gx-cyan
  content = content.replace(/`([^`]*?gx-cyan[^`]*?)`/g, (match, inner) => {
    return '`' + replaceClassesInString(inner) + '`';
  });

  // Fix className=`...` to className={`...`}
  content = content.replace(/className=(`[^`]*`)/g, 'className={$1}');

  fs.writeFileSync(path, content, 'utf8');
  console.log(`Replaced ${path} successfully.`);
}