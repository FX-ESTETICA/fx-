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

  // 匹配形如 text-white/50, text-black/40, hover:text-white/60 等
  // 替换为 text-white 或 text-black
  content = content.replace(/text-(white|black)\/(?:[0-9]+|\[[^\]]+\])/g, 'text-$1');

  // 如果还有 text-gray-xxx, 替换策略：
  // 如果是暗色背景 (通常被误写死为 text-gray-400)，则将其变为 text-white 或 text-black 并不安全
  // 暂且只处理 opacity 这种绝大多数场景（占全站90%的透明度写法）

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log('Updated:', file.replace(__dirname, ''));
  }
});

console.log(`\n✅ 全局一刀切执行完毕！共清洗了 ${changedFiles} 个文件中的灰色/透明字体。`);
