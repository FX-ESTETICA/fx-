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

  // 使用正向/反向断言来安全替换
  // text-white/XX, text-black/XX -> text-white, text-black
  content = content.replace(/(?<=[`"'\s])text-white\/[0-9]+(?=[`"'\s])/g, 'text-white');
  content = content.replace(/(?<=[`"'\s])text-black\/[0-9]+(?=[`"'\s])/g, 'text-black');
  
  // placeholder:text-white/XX -> placeholder:text-white
  content = content.replace(/(?<=[`"'\s])placeholder:text-white\/[0-9]+(?=[`"'\s])/g, 'placeholder:text-white');
  content = content.replace(/(?<=[`"'\s])placeholder:text-black\/[0-9]+(?=[`"'\s])/g, 'placeholder:text-black');

  // text-[#XXX]/XX -> text-[#XXX]
  content = content.replace(/(?<=[`"'\s])text-(\[#[a-fA-F0-9]+\])\/[0-9]+(?=[`"'\s])/g, 'text-$1');
  
  // placeholder:text-[#XXX]/XX -> placeholder:text-[#XXX]
  content = content.replace(/(?<=[`"'\s])placeholder:text-(\[#[a-fA-F0-9]+\])\/[0-9]+(?=[`"'\s])/g, 'placeholder:text-$1');

  // text-gray-XXX, text-slate-XXX -> text-white (or text-black if light mode logic is handled elsewhere, we default to text-white for dark mode or pure white)
  // For these, we will replace text-(gray|slate|zinc|neutral|stone)-xxx with text-white
  content = content.replace(/(?<=[`"'\s])text-(?:gray|slate|zinc|neutral|stone)-[1-9]00(?=[`"'\s])/g, 'text-white');
  content = content.replace(/(?<=[`"'\s])placeholder:text-(?:gray|slate|zinc|neutral|stone)-[1-9]00(?=[`"'\s])/g, 'placeholder:text-white');

  // Remove standalone opacity-XX (like opacity-50, opacity-60)
  // We only want to target opacity-xx not prefixed by hover:, disabled:, group-hover:, etc.
  // Wait, the lookbehind (?<=[`"'\s]) ensures it's at the start of a class name!
  // This means it will match ' opacity-50' but NOT ' hover:opacity-50' because ' hover:opacity-50' has a ':' before 'opacity'.
  // This is PERFECT.
  content = content.replace(/(?<=[`"'\s])opacity-[1-9]0(?=[`"'\s])/g, '');
  content = content.replace(/(?<=[`"'\s])opacity-[1-9]5(?=[`"'\s])/g, '');

  // 还有可能会写成 bg-black/50, 但用户说的是“字体颜色是灰色的”，影响清晰度，所以主要是 text 颜色。
  // 但是 opacity-50 会导致整个组件（包括字体）变灰/变暗。所以移除 opacity 是对的。

  // inline #888888 -> #FFFFFF
  content = content.replace(/#888888/g, '#FFFFFF');
  content = content.replace(/#555555/g, '#FFFFFF');

  if (content !== original) {
    // 整理多余的空格
    content = content.replace(/  +/g, ' ');
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log('Cleaned font styles in:', file.replace(__dirname, ''));
  }
});

console.log(`\n✅ 一刀切去灰完毕！共清理了 ${changedFiles} 个文件。`);
