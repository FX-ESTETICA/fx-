const fs = require('fs');

const filePaths = [
  'c:/Users/xu/Desktop/GX/src/features/profile/components/UserDashboard.tsx',
];

filePaths.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace text-gx-gold with dynamic
    content = content.replace(/text-gx-gold/g, '${isLight ? "text-black" : "text-white"}');
    content = content.replace(/border-gx-gold\/[0-9]+/g, '${isLight ? "border-black/20" : "border-white/20"}');
    content = content.replace(/border-gx-gold/g, '${isLight ? "border-black" : "border-white"}');
    content = content.replace(/bg-gx-gold\/[0-9]+/g, '${isLight ? "bg-black/10" : "bg-white/10"}');
    content = content.replace(/from-gx-gold\/[0-9]+/g, '${isLight ? "from-black/10" : "from-white/10"}');
    content = content.replace(/placeholder:text-gx-gold\/[0-9]+/g, '${isLight ? "placeholder:text-black/20" : "placeholder:text-white/20"}');

    // Replace text-gx-cyan
    content = content.replace(/text-gx-cyan\/[0-9]+/g, '${isLight ? "text-black/80" : "text-white/80"}');
    content = content.replace(/bg-gx-cyan\/[0-9]+/g, '${isLight ? "bg-black/90" : "bg-white/90"}');
    content = content.replace(/bg-gx-cyan/g, '${isLight ? "bg-black" : "bg-white"}');

    // Replace text-gx-red
    content = content.replace(/text-gx-red/g, '${isLight ? "text-red-600" : "text-red-400"}');

    // Remove drop shadows
    content = content.replace(/shadow-\[0_0_[0-9]+px_rgba\([0-9,.]+\)\]/g, '');

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
});
