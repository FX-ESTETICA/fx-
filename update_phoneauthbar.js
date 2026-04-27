const fs = require('fs');

const filePath = 'c:/Users/xu/Desktop/GX/src/features/profile/components/PhoneAuthBar.tsx';

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');

  // bg-black/20 to bg-white/5
  content = content.replace(/bg-black\/20/g, '${isLight ? "bg-black/5" : "bg-black/20"}');
  
  // text-white variations
  content = content.replace(/text-white\/([0-9]+)/g, '${isLight ? "text-black/$1" : "text-white/$1"}');
  content = content.replace(/text-white/g, '${isLight ? "text-black" : "text-white"}');
  
  // border-white variations
  content = content.replace(/border-white\/([0-9]+)/g, '${isLight ? "border-black/$1" : "border-white/$1"}');
  content = content.replace(/border-white/g, '${isLight ? "border-black" : "border-white"}');
  
  // bg-white variations
  content = content.replace(/bg-white\/([0-9]+)/g, '${isLight ? "bg-black/$1" : "bg-white/$1"}');
  
  // gx-cyan
  content = content.replace(/text-gx-cyan/g, '${isLight ? "text-black" : "text-white"}');
  content = content.replace(/bg-gx-cyan\/([0-9]+)/g, '${isLight ? "bg-black/$1" : "bg-white/$1"}');
  content = content.replace(/border-gx-cyan/g, '${isLight ? "border-black" : "border-white"}');
  content = content.replace(/shadow-\[0_0_15px_rgba\(0,240,255,0\.2\)\]/g, '${isLight ? "shadow-[0_0_10px_rgba(0,0,0,0.1)]" : "shadow-[0_0_15px_rgba(255,255,255,0.2)]"}');

  // group-hover overrides
  content = content.replace(/group-hover:text-gx-cyan/g, 'group-hover:${isLight ? "text-black" : "text-white"}');

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
}
