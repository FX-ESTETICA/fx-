const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src'));
let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Fix DualPaneBookingModal.tsx inline rgba
  content = content.replace(/rgba\(0,0,0,0\.3\)/g, '#000000');
  content = content.replace(/rgba\(255,255,255,0\.3\)/g, '#FFFFFF');
  
  // Fix NebulaOverlay.tsx inline #555555 and 80 opacity
  content = content.replace(/isDimmed \? '#555555' : `\$\{effectiveHex\}80`/g, "isDimmed ? '#FFFFFF' : effectiveHex");

  // Fix NebulaConfigHub.tsx inline #666
  content = content.replace(/staff\.color \|\| '#666'/g, "staff.color || '#FFFFFF'");

  // Also search for any text-[#xxx]/xx left by mistake
  // We already ran a script for this, but just in case
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log('Updated inline styles in:', file.replace(__dirname, ''));
  }
});

console.log(`\n✅ 内联样式去灰完毕！共清理了 ${changedFiles} 个文件。`);
