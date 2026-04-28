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

  // 1. 匹配带透明度的十六进制颜色: text-[#8B7355]/40 -> text-[#8B7355]
  content = content.replace(/text-\[#[a-fA-F0-9]+\]\/(?:[0-9]+|\[[^\]]+\])/g, (match) => {
    return match.split('/')[0];
  });

  // 2. 匹配带透明度的标准颜色 (以防漏掉的如 text-red-500/50 -> text-red-500)
  // 注意不要匹配 bg-red-500/50，只匹配 text-
  content = content.replace(/text-([a-z]+-[0-9]+)\/(?:[0-9]+|\[[^\]]+\])/g, 'text-$1');
  
  // 匹配 text-white/50, text-black/50 (如果还有漏掉的)
  content = content.replace(/text-(white|black)\/(?:[0-9]+|\[[^\]]+\])/g, 'text-$1');

  // 3. 匹配 text-gray-400 等各种灰色
  // 简单粗暴：如果是 text-gray-xxx，我们将其替换为 text-white (暗色背景下常用)
  content = content.replace(/\btext-(?:gray|slate|zinc|neutral|stone)-[1-9]00\b/g, 'text-white');
  content = content.replace(/\btext-muted-foreground\b/g, 'text-white');

  // 4. 移除静态的 opacity-xx，这些会导致文本或图标变灰。
  // 注意：不要匹配 hover:opacity-50, disabled:opacity-50, focus:opacity-50 等
  // 我们只匹配前面的字符是空格或引号的 opacity-[1-9]0 (如 "opacity-50" 或 " opacity-50")
  content = content.replace(/(?<=['"\s`])opacity-[1-9]0(?=['"\s`])/g, '');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log('Updated:', file.replace(__dirname, ''));
  }
});

console.log(`\n✅ 深度去灰一刀切执行完毕！共清理了 ${changedFiles} 个文件中的灰色/透明/十六进制不纯字体。`);
