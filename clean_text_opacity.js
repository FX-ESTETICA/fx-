const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walk(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

let filesChanged = 0;
walk('src', function(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace text-white/XX with text-white
    content = content.replace(/\btext-white\/[0-9]+\b/g, 'text-white');
    
    // Replace text-black/XX with text-black
    content = content.replace(/\btext-black\/[0-9]+\b/g, 'text-black');

    // Replace hover:text-white/XX with hover:text-white
    content = content.replace(/\bhover:text-white\/[0-9]+\b/g, 'hover:text-white');

    // Replace hover:text-black/XX with hover:text-black
    content = content.replace(/\bhover:text-black\/[0-9]+\b/g, 'hover:text-black');

    // Also replace other common colors if they have opacity and are text
    content = content.replace(/\btext-(gray|zinc|neutral|stone|slate)-[0-9]+\/[0-9]+\b/g, 'text-white'); // or just remove
    content = content.replace(/\btext-(gray|zinc|neutral|stone|slate)-[0-9]+\b/g, 'text-white');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        filesChanged++;
        console.log('Updated: ' + filePath);
    }
});

console.log('Total files changed: ' + filesChanged);
