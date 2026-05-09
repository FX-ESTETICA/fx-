const fs = require('fs');
const path = require('path');
const glob = require('glob'); // Not available by default, let's just use a recursive function.

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src/features', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // We will replace headerTitleColorTheme === 'coreblack' with background index logic.
    // If the file is in calendar/, we can just use calendarBgIndex.
    // If it's in booking/, we should use useActiveTab if possible, or just default to calendarBgIndex since it's mostly used there. Actually booking/ components might be used in both.

    let isCalendarDir = filePath.includes('calendar');
    let isBookingDir = filePath.includes('booking');
    
    // Replace: visualSettings.headerTitleColorTheme === 'coreblack' -> isLight
    // But we need to define isLight if it's not defined, or replace the expression directly.
    // Actually, in many files isLight is defined as: const isLight = settings.headerTitleColorTheme === 'coreblack';
    // Let's replace that definition:
    
    if (isCalendarDir) {
        content = content.replace(/settings\.headerTitleColorTheme === 'coreblack'/g, 'settings.calendarBgIndex !== 0');
        content = content.replace(/visualSettings\.headerTitleColorTheme === 'coreblack'/g, 'visualSettings.calendarBgIndex !== 0');
        content = content.replace(/visualSettings\?\.headerTitleColorTheme === 'coreblack'/g, 'visualSettings?.calendarBgIndex !== 0');
        
        content = content.replace(/visualSettings\?\.timelineColorTheme === 'blackgold'/g, 'visualSettings?.calendarBgIndex !== 0');
        content = content.replace(/visualSettings\.timelineColorTheme === 'blackgold'/g, 'visualSettings.calendarBgIndex !== 0');
    }

    if (isBookingDir) {
        // Booking components are tricky. We need to check if they have useActiveTab.
        // If not, we can just replace `settings.headerTitleColorTheme === 'coreblack'` with `settings.calendarBgIndex !== 0` for now, assuming bookings mostly happen in calendar, OR we can inject useActiveTab.
        // Wait, DualPaneBookingModal and BookingForm have `const isLight = settings.headerTitleColorTheme === 'coreblack';`
        // We can replace it with:
        // `const activeTab = typeof window !== 'undefined' ? window.location.pathname.includes('calendar') : false; const isLight = activeTab ? settings.calendarBgIndex !== 0 : settings.frontendBgIndex !== 0;`
        
        content = content.replace(/const isLight = settings\.headerTitleColorTheme === 'coreblack';/g, 
        "const isCalendarView = typeof window !== 'undefined' ? window.location.pathname.includes('calendar') : false;\n  const isLight = isCalendarView ? settings.calendarBgIndex !== 0 : settings.frontendBgIndex !== 0;");
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', filePath);
    }
  }
});
