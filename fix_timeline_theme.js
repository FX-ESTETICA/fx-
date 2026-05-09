const fs = require('fs');

function replaceInFile(filePath, search, replacement) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  content = content.replace(search, replacement);
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated', filePath);
  }
}

replaceInFile('src/features/calendar/components/matrices/EliteResourceMatrix.tsx', /visualSettings\?*\.timelineColorTheme/g, 'resolvedTimelineTheme');

replaceInFile('src/features/calendar/components/matrices/EliteWeekMatrix.tsx', /visualSettings\?*\.timelineColorTheme/g, 'resolvedTimelineTheme');
replaceInFile('src/features/calendar/components/matrices/EliteMonthMatrix.tsx', /visualSettings\?*\.timelineColorTheme/g, 'resolvedTimelineTheme');
