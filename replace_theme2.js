const fs = require('fs');
const path = 'c:/Users/xu/Desktop/GX/src/features/booking/components/DualPaneBookingModal.tsx';

let content = fs.readFileSync(path, 'utf8');

// 1. Remove glows
content = content.replace(/\s*shadow-\[0_0_[^\]]+rgba\((?:0,240,255|0,255,255|57,255,20)[^\]]+\)\]/g, '');
content = content.replace(/\s*drop-shadow-\[0_0_[^\]]+rgba\((?:0,240,255|0,255,255|57,255,20)[^\]]+\)\]/g, '');
content = content.replace(/shadow-\[0_10px_30px_rgba\(0,0,0,0\.8\),0_0_15px_rgba\(0,240,255,0\.1\)\]/g, 'shadow-[0_10px_30px_rgba(0,0,0,0.8)]');

// 2. Replace gx-cyan classes with full tailwind classes based on isLight
// We'll replace `-gx-cyan` with `-blackgold` (as a placeholder) then process it.
// Actually, it's safer to use regex to find the specific tailwind class containing `gx-cyan` and replace it.
// e.g. `bg-gx-cyan/10` -> `isLight ? "bg-[#8B7355]/10" : "bg-[#FDF5E6]/10"`

function replaceClassesInString(str) {
  // If the string contains gx-cyan, we extract the gx-cyan classes and non-gx-cyan classes.
  // Then we construct a cn() or ternary.
  // But wait, it might be already inside a cn("...", isLight ? "..." : "...").
  // If we just replace `prefix-gx-cyan/suffix` with `${isLight ? "prefix-[#8B7355]/suffix" : "prefix-[#FDF5E6]/suffix"}`
  // and ensure the string is a template literal.
  
  return str.replace(/([a-z0-9:-]+)-gx-cyan(\/[0-9]+)?/g, (match, prefix, opacity) => {
    const op = opacity || '';
    return `\${isLight ? "${prefix}-[#8B7355]${op}" : "${prefix}-[#FDF5E6]${op}"}`;
  });
}

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
  // Wait, if it already has ${}, we don't want to mess up the JS logic inside.
  // But replaceClassesInString only matches `prefix-gx-cyan...` which is just text inside the literal.
  return '`' + replaceClassesInString(inner) + '`';
});

fs.writeFileSync(path, content, 'utf8');
console.log('Replaced classes successfully.');
