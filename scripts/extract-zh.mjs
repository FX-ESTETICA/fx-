import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const srcDir = path.join(process.cwd(), 'src');
const files = [];
walkDir(srcDir, (f) => {
  if (f.endsWith('.ts') || f.endsWith('.tsx')) files.push(f);
});

const chineseRegex = /[\u4e00-\u9fa5]+/g;
const results = {};

let totalChineseStrings = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  
  const fileStrings = [];
  lines.forEach((line, index) => {
    // skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) return;
    
    if (chineseRegex.test(line)) {
      // rough extraction of the string
      const match = line.match(/(['"`>])([^'"`<]*[\u4e00-\u9fa5]+[^'"`<]*)(['"`<])/);
      if (match && match[2]) {
        fileStrings.push({ line: index + 1, text: match[2].trim() });
        totalChineseStrings++;
      }
    }
  });
  
  if (fileStrings.length > 0) {
    results[path.relative(srcDir, file)] = fileStrings;
  }
});

console.log(JSON.stringify(results, null, 2));
console.log(`\nTotal Chinese strings found: ${totalChineseStrings}`);
