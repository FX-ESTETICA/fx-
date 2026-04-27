const fs = require('fs');

const filePaths = [
  'c:/Users/xu/Desktop/GX/src/app/home/HomeClient.tsx',
  'c:/Users/xu/Desktop/GX/src/app/discovery/DiscoveryClient.tsx',
];

filePaths.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace text-gx-cyan with dynamic
    content = content.replace(/text-gx-cyan/g, '${isLight ? "text-black" : "text-white"}');
    
    // Replace drop-shadow
    content = content.replace(/drop-shadow-\[0_0_[0-9]+px_rgba\([0-9,.]+\)\]/g, '');
    content = content.replace(/shadow-\[0_0_[0-9]+px_[#A-Fa-f0-9]+\]/g, '');
    content = content.replace(/shadow-\[0_0_[0-9]+px_rgba\([0-9,.]+\)\]/g, '');
    
    // Replace borders
    content = content.replace(/border-gx-cyan\/[0-9]+/g, '${isLight ? "border-black/20" : "border-white/20"}');
    content = content.replace(/border-gx-cyan/g, '${isLight ? "border-black" : "border-white"}');

    // Replace backgrounds
    content = content.replace(/bg-gx-cyan\/[0-9]+/g, '${isLight ? "bg-black/10" : "bg-white/10"}');
    content = content.replace(/bg-gx-cyan/g, '${isLight ? "bg-black" : "bg-white"}');

    // Replace from-gx-cyan
    content = content.replace(/from-gx-cyan\/[0-9]+/g, '${isLight ? "from-black/10" : "from-white/10"}');
    content = content.replace(/from-gx-cyan/g, '${isLight ? "from-black" : "from-white"}');

    // Replace via-gx-cyan
    content = content.replace(/via-gx-cyan\/[0-9]+/g, '${isLight ? "via-black/10" : "via-white/10"}');
    content = content.replace(/via-gx-cyan/g, '${isLight ? "via-black" : "via-white"}');

    // Replace to-gx-cyan
    content = content.replace(/to-gx-cyan\/[0-9]+/g, '${isLight ? "to-black/10" : "to-white/10"}');
    content = content.replace(/to-gx-cyan/g, '${isLight ? "to-black" : "to-white"}');

    // Group hover overrides
    content = content.replace(/group-hover:text-gx-cyan/g, 'group-hover:${isLight ? "text-black" : "text-white"}');
    content = content.replace(/group-hover\/upload:text-gx-cyan/g, 'group-hover/upload:${isLight ? "text-black" : "text-white"}');
    content = content.replace(/group-hover\/upload:bg-gx-cyan\/20/g, 'group-hover/upload:${isLight ? "bg-black/10" : "bg-white/10"}');
    content = content.replace(/group-hover\/upload:border-gx-cyan\/50/g, 'group-hover/upload:${isLight ? "border-black/30" : "border-white/30"}');

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
});
